"""
Integration tests for the embeddings factory.
"""

import pytest
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestEmbeddingsFactory:
    """Tests for the embeddings factory."""
    
    def test_import_factory(self):
        """Should import factory functions."""
        from embeddings import get_embedder, get_reranker, get_model_info
        
        assert callable(get_reranker)
        assert callable(get_model_info)

    @pytest.fixture(autouse=True)
    def mock_sentence_transformer(self, monkeypatch):
        """Mock SentenceTransformer to avoid downloading models."""
        class MockModel:
            def __init__(self, *args, **kwargs):
                # Plain object, so we can set device freely
                self.device = "cpu"

            def encode(self, texts, **kwargs):
                # Return dummy embeddings equal to output dimension
                import numpy as np
                return np.zeros((len(texts), 384))
            
            def predict(self, pairs, **kwargs):
                # Return dummy scores [High, Low, High] to satisfy test_minilm_reranking
                import numpy as np
                return np.array([0.9, 0.1, 0.8][:len(pairs)])

        # Mock both SentenceTransformer and CrossEncoder classes entirely
        import sentence_transformers
        monkeypatch.setattr(sentence_transformers, "SentenceTransformer", MockModel)
        monkeypatch.setattr(sentence_transformers, "CrossEncoder", MockModel)
    
    def test_get_minilm_embedder(self):
        """Should load MiniLM embedder."""
        from embeddings import get_embedder, EmbeddingInput
        
        embedder = get_embedder("minilm")
        
        assert embedder is not None
        assert embedder.name == "MiniLM (all-MiniLM-L6-v2)"
        assert embedder.embedding_dimension == 384
        assert not embedder.supports_images
    
    def test_minilm_embedding(self):
        """MiniLM should produce embeddings."""
        from embeddings import get_embedder, EmbeddingInput
        
        embedder = get_embedder("minilm")
        
        inputs = [EmbeddingInput(text="Hello world")]
        results = embedder.encode(inputs)
        
        assert len(results) == 1
        assert len(results[0].embedding) == 384
    
    def test_batch_embedding(self):
        """Should handle batch encoding."""
        from embeddings import get_embedder, EmbeddingInput
        
        embedder = get_embedder("minilm")
        
        inputs = [
            EmbeddingInput(text="First sentence"),
            EmbeddingInput(text="Second sentence"),
            EmbeddingInput(text="Third sentence"),
        ]
        results = embedder.encode(inputs)
        
        assert len(results) == 3
        for result in results:
            assert len(result.embedding) == 384
    
    def test_get_minilm_reranker(self):
        """Should load MiniLM reranker."""
        from embeddings import get_reranker, EmbeddingInput
        
        reranker = get_reranker("minilm")
        
        assert reranker is not None
        assert "MiniLM" in reranker.name
        assert not reranker.supports_images
    
    def test_minilm_reranking(self):
        """MiniLM reranker should produce scores."""
        from embeddings import get_reranker, EmbeddingInput
        
        reranker = get_reranker("minilm")
        
        query = EmbeddingInput(text="What is machine learning?")
        docs = [
            EmbeddingInput(text="Machine learning is a subset of AI."),
            EmbeddingInput(text="The weather is nice today."),
            EmbeddingInput(text="Deep learning uses neural networks."),
        ]
        
        result = reranker.rerank(query, docs)
        
        assert len(result.scores) == 3
        # ML-related docs should score higher than weather
        assert result.scores[0] > result.scores[1]  # ML > weather
        assert result.scores[2] > result.scores[1]  # DL > weather
    
    def test_model_info_after_loading(self):
        """get_model_info should return info after models are loaded."""
        from embeddings import get_model_info, get_embedder, get_reranker
        
        # Ensure models are loaded
        get_embedder("minilm")
        get_reranker("minilm")
        
        info = get_model_info()
        
        assert info["embedder"] is not None
        assert info["embedder"]["dimension"] == 384
        assert info["reranker"] is not None
    
    def test_force_reload(self):
        """Should reload models when force_reload is True."""
        from embeddings import get_embedder
        
        # Load first time
        e1 = get_embedder("minilm")
        
        # Force reload
        e2 = get_embedder("minilm", force_reload=True)
        
        # Should be different instances
        assert e1 is not e2


class TestEmbeddingsEnvConfig:
    """Tests for environment variable configuration."""
    
    def test_default_model(self):
        """Default should be minilm when env not set."""
        from embeddings import get_embedder
        
        # Clear any existing env
        old_val = os.environ.pop("EMBEDDER_MODEL", None)
        
        try:
            embedder = get_embedder(force_reload=True)
            assert "MiniLM" in embedder.name
        finally:
            if old_val:
                os.environ["EMBEDDER_MODEL"] = old_val


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
