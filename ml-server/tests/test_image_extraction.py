"""
Unit tests for image extraction utilities.
"""

import pytest
import tempfile
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from image_extraction import (
    ExtractedImage,
    get_image_storage_dir,
    create_thumbnail_base64,
    MIN_IMAGE_WIDTH,
    MIN_IMAGE_HEIGHT,
)


class TestExtractedImage:
    """Tests for ExtractedImage dataclass."""
    
    def test_creation(self):
        """Should create ExtractedImage with all fields."""
        img = ExtractedImage(
            page=1,
            image_path="/path/to/img.png",
            width=800,
            height=600,
            bounds=(0.1, 0.2, 0.8, 0.6),
            thumbnail_base64="data:image/png;base64,abc",
            source_type="embedded"
        )
        
        assert img.page == 1
        assert img.width == 800
        assert img.height == 600
        assert img.source_type == "embedded"
        assert img.bounds == (0.1, 0.2, 0.8, 0.6)
    
    def test_default_values(self):
        """Should have sensible defaults."""
        img = ExtractedImage(
            page=1,
            image_path="/path.png",
            width=100,
            height=100,
            bounds=(0.0, 0.0, 1.0, 1.0)
        )
        
        assert img.thumbnail_base64 is None
        assert img.source_type == "embedded"


class TestImageStorageDir:
    """Tests for get_image_storage_dir."""
    
    def test_creates_directory(self):
        """Should create directory if it doesn't exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            storage_dir = get_image_storage_dir("test_doc", base_dir=tmpdir)
            
            assert os.path.exists(storage_dir)
            assert "test_doc" in storage_dir
    
    def test_returns_existing_directory(self):
        """Should return existing directory without error."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create twice
            dir1 = get_image_storage_dir("test_doc", base_dir=tmpdir)
            dir2 = get_image_storage_dir("test_doc", base_dir=tmpdir)
            
            assert dir1 == dir2


class TestThumbnailGeneration:
    """Tests for create_thumbnail_base64."""
    
    def test_creates_base64_thumbnail(self):
        """Should create base64 thumbnail from image."""
        # Create a simple test image
        try:
            from PIL import Image
        except ImportError:
            pytest.skip("PIL not installed")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test image
            img_path = os.path.join(tmpdir, "test.png")
            img = Image.new("RGB", (200, 200), color="red")
            img.save(img_path)
            
            # Generate thumbnail
            thumb = create_thumbnail_base64(img_path)
            
            assert thumb is not None
            assert thumb.startswith("data:image/")
            assert "base64," in thumb
    
    def test_handles_missing_file(self):
        """Should return None for missing file."""
        thumb = create_thumbnail_base64("/nonexistent/path.png")
        assert thumb is None


class TestMinImageSize:
    """Tests for minimum image size constants."""
    
    def test_min_size_constants(self):
        """Minimum size should be reasonable."""
        assert MIN_IMAGE_WIDTH >= 50
        assert MIN_IMAGE_HEIGHT >= 50
        assert MIN_IMAGE_WIDTH <= 200
        assert MIN_IMAGE_HEIGHT <= 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
