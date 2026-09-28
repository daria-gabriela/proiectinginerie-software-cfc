"""
Semantic Search using Cross-Encoder for chunk reranking.

Uses the embeddings abstraction layer to support both text-only (MiniLM)
and multimodal (Qwen3-VL) reranking models.

The model used is determined by the RERANKER_MODEL environment variable:
- "minilm" (default): Fast text-only cross-encoder
- "qwen3-vl": Multimodal vision-language reranker
"""

import logging
from typing import List, Tuple, Optional

from chunk_model import Chunk, ChunkContentType
from embeddings import get_reranker, EmbeddingInput, BaseReranker

logger = logging.getLogger(__name__)

# Lazy-loaded reranker instance
_reranker: Optional[BaseReranker] = None


def get_reranker_instance(model_type: Optional[str] = None) -> BaseReranker:
    """Get or create the reranker instance."""
    global _reranker
    
    if _reranker is None:
        _reranker = get_reranker(model_type)
        logger.info(f"Reranker initialized: {_reranker.name}")
    
    return _reranker


def _chunk_to_input(chunk: Chunk, supports_images: bool) -> EmbeddingInput:
    """Convert a Chunk to an EmbeddingInput for the reranker."""
    if chunk.content_type == ChunkContentType.IMAGE:
        # Image-only chunk
        if supports_images:
            return EmbeddingInput(image=chunk.image_path)
        else:
            # Fallback for text-only rerankers
            return EmbeddingInput(text="[Image content]")
    
    elif chunk.content_type == ChunkContentType.MIXED:
        # Text + Image chunk
        if supports_images:
            return EmbeddingInput(text=chunk.text, image=chunk.image_path)
        else:
            return EmbeddingInput(text=chunk.text)
    
    else:
        # Text-only chunk
        return EmbeddingInput(text=chunk.text or "")


def rerank_chunks(
    query: str,
    chunks: List[Chunk],
    top_k: int = 5,
    query_image: Optional[str] = None,
    model_type: Optional[str] = None,
) -> List[Tuple[Chunk, float]]:
    """
    Rerank chunks using cross-encoder semantic similarity.
    
    Supports both text-only and multimodal reranking based on the
    configured reranker model.
    
    Args:
        query: Search query text
        chunks: List of Chunk objects to rerank
        top_k: Number of top results to return
        query_image: Optional image for multimodal queries
        model_type: Override reranker type ("minilm" or "qwen3-vl")
    
    Returns:
        List of (Chunk, score) tuples sorted by relevance
    """
    if not chunks:
        return []
    
    reranker = get_reranker_instance(model_type)
    supports_images = reranker.supports_images
    
    # Build query input
    if query_image and supports_images:
        query_input = EmbeddingInput(text=query, image=query_image)
    else:
        query_input = EmbeddingInput(text=query)
    
    # Convert chunks to reranker inputs
    doc_inputs = [_chunk_to_input(chunk, supports_images) for chunk in chunks]
    
    # Get relevance scores
    logger.debug(f"Reranking {len(chunks)} chunks with {reranker.name}")
    result = reranker.rerank(query_input, doc_inputs)
    
    # Combine chunks with scores and sort
    scored_chunks = list(zip(chunks, result.scores))
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    
    # Return top k
    return scored_chunks[:top_k]


def rerank_with_images(
    query: str,
    chunks: List[Chunk],
    top_k: int = 5,
) -> List[Tuple[Chunk, float]]:
    """
    Rerank chunks, automatically using image content for image chunks.
    
    This is a convenience wrapper that:
    - Uses the vision reranker if available
    - Falls back gracefully for text-only models
    
    Args:
        query: Search query text
        chunks: List of Chunk objects (can include image chunks)
        top_k: Number of top results to return
    
    Returns:
        List of (Chunk, score) tuples sorted by relevance
    """
    reranker = get_reranker_instance()
    
    if reranker.supports_images:
        logger.debug("Using multimodal reranking")
    else:
        # Count image chunks that won't be properly ranked
        image_chunks = sum(1 for c in chunks if c.content_type != ChunkContentType.TEXT)
        if image_chunks > 0:
            logger.warning(
                f"{image_chunks} image chunks will be ranked with placeholder text "
                f"(reranker doesn't support images)"
            )
    
    return rerank_chunks(query, chunks, top_k)

