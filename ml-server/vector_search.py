"""
Vector Search - Embedding generation and Cosine Similarity Search.

Uses the embeddings abstraction layer to support both text-only (MiniLM)
and multimodal (Qwen3-VL) embedding models.

The model used is determined by the EMBEDDER_MODEL environment variable:
- "minilm" (default): Fast text-only embeddings (384 dimensions)
- "qwen3-vl": Multimodal vision-language embeddings (2048 dimensions)
"""

import logging
from typing import List, Tuple, Optional
import torch

from chunk_model import Chunk, ChunkContentType
from embeddings import get_embedder, EmbeddingInput, BaseEmbedder

logger = logging.getLogger(__name__)


class VectorSearch:
    """
    Vector search engine using the embeddings abstraction layer.
    
    Automatically selects between text-only and multimodal embeddings
    based on configuration and chunk content types.
    """
    
    def __init__(self, model_type: Optional[str] = None):
        """
        Initialize the vector search engine.
        
        Args:
            model_type: "minilm" or "qwen3-vl". If None, uses EMBEDDER_MODEL env var.
        """
        self._model_type = model_type
        self._embedder: Optional[BaseEmbedder] = None
    
    @property
    def embedder(self) -> BaseEmbedder:
        """Lazy-load the embedder on first use."""
        if self._embedder is None:
            self._embedder = get_embedder(self._model_type)
            logger.info(f"VectorSearch initialized with {self._embedder.name}")
        return self._embedder
    
    @property
    def supports_images(self) -> bool:
        """Whether the current embedder supports image inputs."""
        return self.embedder.supports_images
    
    @property
    def embedding_dimension(self) -> int:
        """Current embedding dimension."""
        return self.embedder.embedding_dimension
    
    def _chunk_to_input(self, chunk: Chunk) -> EmbeddingInput:
        """Convert a Chunk to an EmbeddingInput for the embedder."""
        if chunk.content_type == ChunkContentType.IMAGE:
            # Image-only chunk
            if not self.supports_images:
                # Fallback: use empty text for text-only models
                logger.debug(f"Chunk {chunk.id} is image-only but embedder doesn't support images")
                return EmbeddingInput(text="[Image]")
            return EmbeddingInput(image=chunk.image_path)
        
        elif chunk.content_type == ChunkContentType.MIXED:
            # Text + Image chunk
            if self.supports_images:
                return EmbeddingInput(text=chunk.text, image=chunk.image_path)
            else:
                # Fallback: just use text
                return EmbeddingInput(text=chunk.text)
        
        else:
            # Text-only chunk
            return EmbeddingInput(text=chunk.text or "")
    
    def encode_chunks(self, chunks: List[Chunk]) -> List[Chunk]:
        """
        Generate embeddings for a list of chunks in place.
        
        Handles text, image, and mixed content types based on the
        current embedder's capabilities.
        
        Args:
            chunks: List of Chunk objects (will be modified in place)
            
        Returns:
            The same list of chunks with embeddings populated
        """
        if not chunks:
            return chunks
        
        # Convert chunks to embedding inputs
        inputs = [self._chunk_to_input(chunk) for chunk in chunks]
        
        # Generate embeddings
        logger.debug(f"Encoding {len(chunks)} chunks with {self.embedder.name}")
        results = self.embedder.encode(inputs)
        
        # Assign embeddings back to chunks
        for i, chunk in enumerate(chunks):
            chunk.embedding = results[i].embedding
        
        logger.info(f"Encoded {len(chunks)} chunks ({self.embedding_dimension}D)")
        return chunks
    
    def encode_query(self, query: str, query_image: Optional[str] = None) -> List[float]:
        """
        Encode a search query.
        
        Args:
            query: Text query
            query_image: Optional image path for multimodal search
            
        Returns:
            Query embedding as a list of floats
        """
        if query_image and self.supports_images:
            inp = EmbeddingInput(text=query, image=query_image)
        else:
            inp = EmbeddingInput(text=query)
        
        results = self.embedder.encode([inp])
        return results[0].embedding
    
    def search(
        self,
        query: str,
        chunks: List[Chunk],
        top_k: int = 20,
        query_image: Optional[str] = None,
    ) -> List[Tuple[Chunk, float]]:
        """
        Perform cosine similarity search.
        
        Args:
            query: The search query text
            chunks: A list of chunks (must have 'embedding' populated)
            top_k: Number of results to return
            query_image: Optional image for multimodal queries
            
        Returns:
            List of (Chunk, score) tuples sorted by relevance
        """
        if not chunks:
            return []
        
        # Filter out chunks without embeddings
        valid_chunks = [c for c in chunks if c.embedding is not None]
        
        if not valid_chunks:
            logger.warning("No chunks with embeddings found")
            return []
        
        # Check embedding dimension compatibility
        expected_dim = self.embedding_dimension
        actual_dim = len(valid_chunks[0].embedding)
        if actual_dim != expected_dim:
            logger.warning(
                f"Embedding dimension mismatch: chunks have {actual_dim}D, "
                f"embedder produces {expected_dim}D. Results may be inaccurate."
            )
        
        # Encode query
        query_embedding = torch.tensor(self.encode_query(query, query_image))
        chunk_embeddings = torch.tensor([c.embedding for c in valid_chunks])
        
        # Compute cosine similarity
        # Normalize embeddings
        query_norm = query_embedding / query_embedding.norm()
        chunks_norm = chunk_embeddings / chunk_embeddings.norm(dim=1, keepdim=True)
        
        cos_scores = torch.matmul(chunks_norm, query_norm)
        
        # Get top k
        k = min(top_k, len(valid_chunks))
        top_results = torch.topk(cos_scores, k=k)
        
        scored_chunks = []
        for score, idx in zip(top_results.values, top_results.indices):
            scored_chunks.append((valid_chunks[idx], float(score)))
        
        return scored_chunks

