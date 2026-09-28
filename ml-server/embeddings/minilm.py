"""
MiniLM-based embedder and reranker - text-only, fast.

These wrap the existing SentenceTransformers models that were previously
used directly in vector_search.py and search.py.

Models:
- Embedder: all-MiniLM-L6-v2 (384 dimensions)
- Reranker: cross-encoder/ms-marco-MiniLM-L6-v2
"""

import logging
from typing import List

from .base import (
    BaseEmbedder,
    BaseReranker,
    EmbeddingInput,
    EmbeddingResult,
    RerankerResult,
)

logger = logging.getLogger(__name__)


class MiniLMEmbedder(BaseEmbedder):
    """
    Fast text embedder using all-MiniLM-L6-v2.

    This is the original embedder used in StudySync.
    Does NOT support image embeddings.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading MiniLM embedder: {model_name}")
        self._model = SentenceTransformer(model_name)
        self._model_name = model_name
        self._device = str(self._model.device)
        logger.info(f"MiniLM embedder loaded on {self._device}")

    @property
    def name(self) -> str:
        return f"MiniLM ({self._model_name})"

    @property
    def supports_images(self) -> bool:
        return False

    @property
    def embedding_dimension(self) -> int:
        return 384

    @property
    def device(self) -> str:
        return self._device

    def encode(self, inputs: List[EmbeddingInput]) -> List[EmbeddingResult]:
        """Encode text inputs. Ignores any image fields."""
        # Extract texts, use empty string for image-only inputs
        texts = []
        for inp in inputs:
            if inp.text:
                texts.append(inp.text)
            else:
                # Image-only input - can't embed with MiniLM
                logger.warning("MiniLM received image-only input, using empty text")
                texts.append("")

        # Batch encode
        embeddings = self._model.encode(texts, convert_to_tensor=False)

        results = []
        for i, emb in enumerate(embeddings):
            input_type = "text" if inputs[i].is_text_only else "multimodal"
            results.append(
                EmbeddingResult(
                    embedding=emb.tolist(), dimension=384, input_type=input_type
                )
            )

        return results


class MiniLMReranker(BaseReranker):
    """
    Fast text reranker using ms-marco-MiniLM-L6-v2 cross-encoder.

    This is the original reranker used in StudySync.
    Does NOT support image inputs.
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L6-v2"):
        from sentence_transformers import CrossEncoder

        logger.info(f"Loading MiniLM reranker: {model_name}")
        # Force CPU and disable low_cpu_mem_usage to avoid meta tensor issues
        self._model = CrossEncoder(
            model_name, device="cpu", automodel_args={"low_cpu_mem_usage": False}
        )
        self._model_name = model_name
        self._device = "cpu"  # CrossEncoder doesn't expose device easily
        logger.info("MiniLM reranker loaded")

    @property
    def name(self) -> str:
        return f"MiniLM CrossEncoder ({self._model_name})"

    @property
    def supports_images(self) -> bool:
        return False

    @property
    def device(self) -> str:
        return self._device

    def rerank(
        self, query: EmbeddingInput, documents: List[EmbeddingInput]
    ) -> RerankerResult:
        """Rerank text documents. Ignores any image fields."""
        query_text = query.text or ""

        pairs = []
        for doc in documents:
            doc_text = doc.text or ""
            pairs.append((query_text, doc_text))

        scores = self._model.predict(pairs)

        return RerankerResult(scores=scores.tolist())
