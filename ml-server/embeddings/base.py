"""
Base interfaces for embedding and reranking models.

This abstraction layer allows swapping between different model backends
(MiniLM for text-only, Qwen3-VL for multimodal) without changing the rest of the pipeline.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Union
from pathlib import Path


@dataclass
class EmbeddingInput:
    """
    Unified input for embedding - can be text, image, or both.
    
    For text-only models, only `text` is used.
    For vision models like Qwen3-VL, `image` can also be provided.
    """
    text: Optional[str] = None
    image: Optional[str] = None  # File path or URL
    
    # Optional instruction for instruction-aware models
    instruction: Optional[str] = None
    
    def __post_init__(self):
        if self.text is None and self.image is None:
            raise ValueError("At least one of 'text' or 'image' must be provided")
    
    @property
    def is_text_only(self) -> bool:
        return self.text is not None and self.image is None
    
    @property
    def is_image_only(self) -> bool:
        return self.image is not None and self.text is None
    
    @property
    def is_multimodal(self) -> bool:
        return self.text is not None and self.image is not None
    
    def to_dict(self) -> dict:
        """Convert to dict format expected by Qwen models."""
        result = {}
        if self.text:
            result["text"] = self.text
        if self.image:
            result["image"] = self.image
        if self.instruction:
            result["instruction"] = self.instruction
        return result


@dataclass
class EmbeddingResult:
    """Result of embedding a single input."""
    embedding: List[float]
    dimension: int
    
    # Original input reference (for debugging/logging)
    input_type: str = "text"  # "text", "image", or "multimodal"


@dataclass
class RerankerInput:
    """
    Input for reranking - a query and list of documents to score.
    
    Both query and documents can be text, image, or multimodal.
    """
    query: EmbeddingInput
    documents: List[EmbeddingInput]
    
    # Optional instruction for the reranking task
    instruction: Optional[str] = None


@dataclass
class RerankerResult:
    """Result of reranking - scores for each document."""
    scores: List[float]  # Same order as input documents


class BaseEmbedder(ABC):
    """
    Abstract base class for all embedding models.
    
    Implementations:
    - MiniLMEmbedder: Fast, text-only (384 dimensions)
    - Qwen3VLEmbedder: Multimodal vision-language (2048 dimensions)
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable model name."""
        pass
    
    @property
    @abstractmethod
    def supports_images(self) -> bool:
        """Whether this embedder can handle image inputs."""
        pass
    
    @property
    @abstractmethod
    def embedding_dimension(self) -> int:
        """Output embedding dimension."""
        pass
    
    @property
    @abstractmethod
    def device(self) -> str:
        """Current device (cpu, cuda, mps)."""
        pass
    
    @abstractmethod
    def encode(self, inputs: List[EmbeddingInput]) -> List[EmbeddingResult]:
        """
        Encode a batch of inputs to embeddings.
        
        Args:
            inputs: List of EmbeddingInput objects
            
        Returns:
            List of EmbeddingResult objects (same order as inputs)
        """
        pass
    
    def encode_texts(self, texts: List[str]) -> List[EmbeddingResult]:
        """Convenience method for encoding plain text strings."""
        inputs = [EmbeddingInput(text=t) for t in texts]
        return self.encode(inputs)
    
    def encode_images(self, image_paths: List[str]) -> List[EmbeddingResult]:
        """Convenience method for encoding image files."""
        if not self.supports_images:
            raise NotImplementedError(f"{self.name} does not support image embeddings")
        inputs = [EmbeddingInput(image=p) for p in image_paths]
        return self.encode(inputs)


class BaseReranker(ABC):
    """
    Abstract base class for all reranking models.
    
    Rerankers score (query, document) pairs for relevance.
    
    Implementations:
    - MiniLMReranker: Fast, text-only cross-encoder
    - Qwen3VLReranker: Multimodal vision-language reranker
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable model name."""
        pass
    
    @property
    @abstractmethod
    def supports_images(self) -> bool:
        """Whether this reranker can handle image inputs."""
        pass
    
    @property
    @abstractmethod
    def device(self) -> str:
        """Current device (cpu, cuda, mps)."""
        pass
    
    @abstractmethod
    def rerank(self, query: EmbeddingInput, documents: List[EmbeddingInput]) -> RerankerResult:
        """
        Score documents for relevance to query.
        
        Args:
            query: The search query (can be text, image, or both)
            documents: List of documents to rank
            
        Returns:
            RerankerResult with scores for each document
        """
        pass
    
    def rerank_texts(self, query: str, documents: List[str]) -> RerankerResult:
        """Convenience method for reranking plain text."""
        q = EmbeddingInput(text=query)
        docs = [EmbeddingInput(text=d) for d in documents]
        return self.rerank(q, docs)
