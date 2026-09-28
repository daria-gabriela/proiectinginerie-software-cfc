"""
Qwen3-VL-based embedder and reranker - multimodal vision-language.

These wrap the Qwen3-VL models for full image + text understanding.
Slower than MiniLM but supports images, screenshots, and videos.

Models:
- Embedder: Qwen/Qwen3-VL-Embedding-2B (2048 dimensions)
- Reranker: Qwen/Qwen3-VL-Reranker-2B
"""

import logging
from typing import List, Optional

from .base import (
    BaseEmbedder,
    BaseReranker,
    EmbeddingInput,
    EmbeddingResult,
    RerankerResult,
)

logger = logging.getLogger(__name__)


def _detect_device() -> str:
    """Detect the best available device."""
    import torch
    
    if torch.cuda.is_available():
        return "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"


class Qwen3VLEmbedder(BaseEmbedder):
    """
    Multimodal embedder using Qwen3-VL-Embedding.
    
    Supports text, images, and mixed text+image inputs.
    Generates 2048-dimensional embeddings.
    
    Note: This model is significantly slower than MiniLM but provides
    semantic understanding of images.
    """
    
    def __init__(
        self,
        model_name: str = "Qwen/Qwen3-VL-Embedding-2B",
        device: Optional[str] = None,
        torch_dtype: Optional[str] = None,
    ):
        import torch
        
        # Import from our local models package
        from models.qwen3_vl_embedding import Qwen3VLEmbedder as QwenEmbedder
        
        self._device = device or _detect_device()
        self._model_name = model_name
        
        # Determine dtype based on device
        if torch_dtype:
            dtype = getattr(torch, torch_dtype)
        elif self._device == "cpu":
            dtype = torch.float32  # FP32 for CPU stability
        else:
            dtype = torch.float16  # FP16 for GPU/MPS efficiency
        
        logger.info(f"Loading Qwen3-VL embedder: {model_name} on {self._device} with {dtype}")
        
        self._model = QwenEmbedder(
            model_name_or_path=model_name,
            dtype=dtype,
            device_map=self._device if self._device != "cpu" else None,
        )
        
        # Move to device if needed
        if self._device == "mps":
            self._model.model = self._model.model.to("mps")
        
        logger.info(f"Qwen3-VL embedder loaded successfully")
    
    @property
    def name(self) -> str:
        return f"Qwen3-VL-Embedding ({self._model_name})"
    
    @property
    def supports_images(self) -> bool:
        return True
    
    @property
    def embedding_dimension(self) -> int:
        return 2048
    
    @property
    def device(self) -> str:
        return self._device
    
    def encode(self, inputs: List[EmbeddingInput]) -> List[EmbeddingResult]:
        """Encode text, image, or multimodal inputs."""
        # Convert to Qwen format
        qwen_inputs = [inp.to_dict() for inp in inputs]
        
        # Get embeddings
        embeddings = self._model.process(qwen_inputs)
        
        # Convert to results
        results = []
        for i, emb in enumerate(embeddings):
            inp = inputs[i]
            if inp.is_text_only:
                input_type = "text"
            elif inp.is_image_only:
                input_type = "image"
            else:
                input_type = "multimodal"
            
            # Handle both tensor and list
            if hasattr(emb, 'tolist'):
                emb_list = emb.tolist()
            else:
                emb_list = list(emb)
            
            results.append(EmbeddingResult(
                embedding=emb_list,
                dimension=2048,
                input_type=input_type
            ))
        
        return results


class Qwen3VLReranker(BaseReranker):
    """
    Multimodal reranker using Qwen3-VL-Reranker.
    
    Scores (query, document) pairs where both can contain text and/or images.
    Returns relevance scores between 0 and 1.
    
    Note: This model is slower than MiniLM cross-encoder but supports
    image-to-text and image-to-image matching.
    """
    
    def __init__(
        self,
        model_name: str = "Qwen/Qwen3-VL-Reranker-2B",
        device: Optional[str] = None,
        torch_dtype: Optional[str] = None,
    ):
        import torch
        
        # Import from our local models package
        from models.qwen3_vl_reranker import Qwen3VLReranker as QwenReranker
        
        self._device = device or _detect_device()
        self._model_name = model_name
        
        # Determine dtype based on device
        if torch_dtype:
            dtype = getattr(torch, torch_dtype)
        elif self._device == "cpu":
            dtype = torch.float32
        else:
            dtype = torch.float16
        
        logger.info(f"Loading Qwen3-VL reranker: {model_name} on {self._device} with {dtype}")
        
        self._model = QwenReranker(
            model_name_or_path=model_name,
            dtype=dtype,
            device_map=self._device if self._device != "cpu" else None,
        )
        
        logger.info(f"Qwen3-VL reranker loaded successfully")
    
    @property
    def name(self) -> str:
        return f"Qwen3-VL-Reranker ({self._model_name})"
    
    @property
    def supports_images(self) -> bool:
        return True
    
    @property
    def device(self) -> str:
        return self._device
    
    def rerank(
        self,
        query: EmbeddingInput,
        documents: List[EmbeddingInput],
        instruction: Optional[str] = None,
    ) -> RerankerResult:
        """Rerank documents (text, image, or both) against query."""
        # Build query dict
        query_dict = {}
        if query.text:
            query_dict["text"] = query.text
        if query.image:
            query_dict["image"] = query.image
        
        # Build documents list
        docs_list = []
        for doc in documents:
            doc_dict = {}
            if doc.text:
                doc_dict["text"] = doc.text
            if doc.image:
                doc_dict["image"] = doc.image
            docs_list.append(doc_dict)
        
        # Call Qwen reranker
        inputs = {
            "query": query_dict,
            "documents": docs_list,
        }
        if instruction or query.instruction:
            inputs["instruction"] = instruction or query.instruction
        
        scores = self._model.process(inputs)
        
        return RerankerResult(scores=scores)
