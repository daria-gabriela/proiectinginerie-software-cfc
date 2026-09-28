"""
Unit tests for the embeddings abstraction layer.
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from embeddings.base import EmbeddingInput, EmbeddingResult, RerankerResult


class TestEmbeddingInput:
    """Tests for EmbeddingInput dataclass."""
    
    def test_text_only_input(self):
        """Text-only input should work."""
        inp = EmbeddingInput(text="Hello world")
        assert inp.text == "Hello world"
        assert inp.image is None
        assert inp.is_text_only
        assert not inp.is_image_only
        assert not inp.is_multimodal
    
    def test_image_only_input(self):
        """Image-only input should work."""
        inp = EmbeddingInput(image="/path/to/image.png")
        assert inp.text is None
        assert inp.image == "/path/to/image.png"
        assert not inp.is_text_only
        assert inp.is_image_only
        assert not inp.is_multimodal
    
    def test_multimodal_input(self):
        """Text + image input should be multimodal."""
        inp = EmbeddingInput(text="A cat", image="/path/to/cat.png")
        assert inp.text == "A cat"
        assert inp.image == "/path/to/cat.png"
        assert not inp.is_text_only
        assert not inp.is_image_only
        assert inp.is_multimodal
    
    def test_empty_input_raises(self):
        """Empty input should raise ValueError."""
        with pytest.raises(ValueError):
            EmbeddingInput()  # Raises in __post_init__
    
    def test_to_dict(self):
        """Should convert to dict."""
        inp = EmbeddingInput(text="Hello", image="/img.png")
        d = inp.to_dict()
        assert d["text"] == "Hello"
        assert d["image"] == "/img.png"


class TestEmbeddingResult:
    """Tests for EmbeddingResult dataclass."""
    
    def test_result_creation(self):
        """Should create result with embedding and dimension."""
        result = EmbeddingResult(embedding=[0.1, 0.2, 0.3], dimension=3)
        assert result.embedding == [0.1, 0.2, 0.3]
        assert result.dimension == 3
    
    def test_empty_embedding(self):
        """Empty embedding should have dimension 0."""
        result = EmbeddingResult(embedding=[], dimension=0)
        assert result.dimension == 0
    
    def test_input_type(self):
        """Should track input type."""
        result = EmbeddingResult(embedding=[0.1], dimension=1, input_type="image")
        assert result.input_type == "image"


class TestRerankerResult:
    """Tests for RerankerResult dataclass."""
    
    def test_result_creation(self):
        """Should create result with scores."""
        result = RerankerResult(scores=[0.9, 0.7, 0.3])
        assert result.scores == [0.9, 0.7, 0.3]
    
    def test_scores_ordering(self):
        """Scores should be in document order."""
        result = RerankerResult(scores=[0.3, 0.9, 0.7])
        # Scores are in same order as input documents
        assert result.scores[0] == 0.3
        assert result.scores[1] == 0.9


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
