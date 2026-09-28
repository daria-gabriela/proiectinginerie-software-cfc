"""
Integration tests for vector search with the new abstraction layer.
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chunk_model import Chunk, ChunkContentType
from vector_search import VectorSearch


class TestVectorSearch:
    """Tests for VectorSearch class."""
    
    @pytest.fixture
    def vector_search(self):
        """Create VectorSearch instance."""
        return VectorSearch(model_type="minilm")
    
    @pytest.fixture
    def sample_chunks(self):
        """Create sample chunks for testing."""
        return [
            Chunk(
                document_id="doc1",
                page=1,
                text="Machine learning is a subset of artificial intelligence."
            ),
            Chunk(
                document_id="doc1",
                page=1,
                text="Neural networks are inspired by biological neurons."
            ),
            Chunk(
                document_id="doc1",
                page=2,
                text="Deep learning uses multiple layers of neural networks."
            ),
            Chunk(
                document_id="doc1",
                page=3,
                text="The weather forecast predicts rain tomorrow."
            ),
        ]
    
    def test_encode_chunks(self, vector_search, sample_chunks):
        """Should encode chunks with embeddings."""
        encoded = vector_search.encode_chunks(sample_chunks)
        
        assert len(encoded) == 4
        for chunk in encoded:
            assert chunk.embedding is not None
            assert len(chunk.embedding) == 384
    
    def test_search_returns_relevant(self, vector_search, sample_chunks):
        """Search should return relevant chunks first."""
        # Encode chunks
        vector_search.encode_chunks(sample_chunks)
        
        # Search for ML-related query
        results = vector_search.search("What is machine learning?", sample_chunks, top_k=2)
        
        assert len(results) == 2
        # ML chunk should score highest
        assert "machine learning" in results[0][0].text.lower()
    
    def test_search_scores_descending(self, vector_search, sample_chunks):
        """Search results should be sorted by score descending."""
        vector_search.encode_chunks(sample_chunks)
        
        results = vector_search.search("neural networks", sample_chunks, top_k=4)
        
        scores = [score for _, score in results]
        assert scores == sorted(scores, reverse=True)
    
    def test_search_empty_chunks(self, vector_search):
        """Search with empty chunks should return empty list."""
        results = vector_search.search("query", [], top_k=5)
        assert results == []
    
    def test_search_without_embeddings(self, vector_search, sample_chunks):
        """Search without embeddings should return empty list."""
        # Don't encode chunks
        results = vector_search.search("query", sample_chunks, top_k=5)
        assert results == []
    
    def test_supports_images_property(self, vector_search):
        """MiniLM should not support images."""
        assert not vector_search.supports_images
    
    def test_embedding_dimension(self, vector_search):
        """Should report correct embedding dimension."""
        assert vector_search.embedding_dimension == 384


class TestVectorSearchWithImageChunks:
    """Tests for VectorSearch with image chunks."""
    
    @pytest.fixture
    def vector_search(self):
        return VectorSearch(model_type="minilm")
    
    def test_image_chunk_fallback(self, vector_search):
        """Image chunks should get fallback encoding with text-only model."""
        chunks = [
            Chunk(document_id="doc1", page=1, text="Text chunk"),
            Chunk(document_id="doc1", page=1, image_path="/path/to/img.png"),
        ]
        
        # Should not raise error
        encoded = vector_search.encode_chunks(chunks)
        
        assert len(encoded) == 2
        # Both should have embeddings (image gets fallback)
        assert encoded[0].embedding is not None
        assert encoded[1].embedding is not None
    
    def test_mixed_chunk_uses_text(self, vector_search):
        """Mixed chunks should use text content with text-only model."""
        chunks = [
            Chunk(
                document_id="doc1",
                page=1,
                text="Figure showing neural network architecture",
                image_path="/path/to/img.png"
            ),
        ]
        
        encoded = vector_search.encode_chunks(chunks)
        
        assert encoded[0].embedding is not None
        assert len(encoded[0].embedding) == 384


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
