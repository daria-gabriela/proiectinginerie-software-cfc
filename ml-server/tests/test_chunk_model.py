"""
Unit tests for the chunk model with multimodal support.
"""

import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chunk_model import Chunk, ChunkContentType, ChunkBounds, PageChunks, DocumentChunks


class TestChunkContentType:
    """Tests for ChunkContentType detection."""
    
    def test_text_only_chunk(self):
        """Chunk with only text should be TEXT type."""
        chunk = Chunk(
            document_id="doc1",
            page=1,
            text="Hello world"
        )
        assert chunk.content_type == ChunkContentType.TEXT
        assert chunk.is_text_only
        assert not chunk.is_image_only
        assert not chunk.is_multimodal
        assert not chunk.has_image
    
    def test_image_only_chunk(self):
        """Chunk with only image should be IMAGE type."""
        chunk = Chunk(
            document_id="doc1",
            page=1,
            image_path="/path/to/image.png"
        )
        assert chunk.content_type == ChunkContentType.IMAGE
        assert not chunk.is_text_only
        assert chunk.is_image_only
        assert not chunk.is_multimodal
        assert chunk.has_image
    
    def test_mixed_chunk(self):
        """Chunk with text and image should be MIXED type."""
        chunk = Chunk(
            document_id="doc1",
            page=1,
            text="Figure 1: A diagram",
            image_path="/path/to/diagram.png"
        )
        assert chunk.content_type == ChunkContentType.MIXED
        assert not chunk.is_text_only
        assert not chunk.is_image_only
        assert chunk.is_multimodal
        assert chunk.has_image
    
    def test_explicit_content_type(self):
        """Explicit content_type should override detection."""
        chunk = Chunk(
            document_id="doc1",
            page=1,
            text="Some text",
            content_type=ChunkContentType.IMAGE  # Override
        )
        assert chunk.content_type == ChunkContentType.IMAGE


class TestChunkId:
    """Tests for chunk ID generation."""
    
    def test_deterministic_id(self):
        """Same content should produce same ID."""
        chunk1 = Chunk(document_id="doc1", page=1, text="Hello")
        chunk2 = Chunk(document_id="doc1", page=1, text="Hello")
        assert chunk1.id == chunk2.id
    
    def test_different_text_different_id(self):
        """Different text should produce different ID."""
        chunk1 = Chunk(document_id="doc1", page=1, text="Hello")
        chunk2 = Chunk(document_id="doc1", page=1, text="World")
        assert chunk1.id != chunk2.id
    
    def test_different_page_different_id(self):
        """Different page should produce different ID."""
        chunk1 = Chunk(document_id="doc1", page=1, text="Hello")
        chunk2 = Chunk(document_id="doc1", page=2, text="Hello")
        assert chunk1.id != chunk2.id
    
    def test_image_chunk_id(self):
        """Image chunks should have deterministic IDs."""
        chunk1 = Chunk(document_id="doc1", page=1, image_path="/path/img.png")
        chunk2 = Chunk(document_id="doc1", page=1, image_path="/path/img.png")
        assert chunk1.id == chunk2.id


class TestChunkBounds:
    """Tests for ChunkBounds."""
    
    def test_bounds_to_dict(self):
        """Bounds should serialize to dict."""
        bounds = ChunkBounds(x=0.1, y=0.2, width=0.3, height=0.4)
        d = bounds.to_dict()
        assert d == {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4}
    
    def test_chunk_with_bounds(self):
        """Chunk should properly include bounds."""
        chunk = Chunk(
            document_id="doc1",
            page=1,
            text="Hello",
            bounds=ChunkBounds(x=0.1, y=0.2, width=0.8, height=0.1)
        )
        assert chunk.bounds.x == 0.1
        assert chunk.bounds.width == 0.8


class TestChunkSerialization:
    """Tests for Chunk serialization."""
    
    def test_to_dict_text_chunk(self):
        """Text chunk should serialize correctly."""
        chunk = Chunk(document_id="doc1", page=1, text="Hello")
        d = chunk.to_dict()
        
        # API uses camelCase
        assert d["documentId"] == "doc1"
        assert d["page"] == 1
        assert d["text"] == "Hello"
        assert d["contentType"] == "text"
    
    def test_to_dict_image_chunk(self):
        """Image chunk should serialize with all fields."""
        chunk = Chunk(
            document_id="doc1",
            page=2,
            image_path="/path/to/img.png",
            thumbnail_base64="data:image/png;base64,abc",
            image_width=800,
            image_height=600
        )
        d = chunk.to_dict()
        
        assert d["contentType"] == "image"
        assert d["imagePath"] == "/path/to/img.png"
        assert d["thumbnail"] == "data:image/png;base64,abc"
        assert d["imageWidth"] == 800
        assert d["imageHeight"] == 600
    
    def test_from_dict_roundtrip(self):
        """Chunk should survive dict roundtrip."""
        original = Chunk(
            document_id="doc1",
            page=1,
            text="Hello world",
            bounds=ChunkBounds(x=0.1, y=0.2, width=0.8, height=0.1)
        )
        d = original.to_dict()
        restored = Chunk.from_dict(d)
        
        assert restored.document_id == original.document_id
        assert restored.page == original.page
        assert restored.text == original.text
        assert restored.content_type == original.content_type


class TestPageChunks:
    """Tests for PageChunks."""
    
    def test_text_and_image_chunks(self):
        """Should correctly filter text and image chunks."""
        page = PageChunks(
            pageNumber=1,
            width=612.0,
            height=792.0,
            chunks=[
                Chunk(document_id="doc1", page=1, text="Text 1"),
                Chunk(document_id="doc1", page=1, image_path="/img.png"),
                Chunk(document_id="doc1", page=1, text="Text 2"),
            ]
        )
        
        assert len(page.text_chunks) == 2
        assert len(page.image_chunks) == 1
    
    def test_to_dict(self):
        """PageChunks should serialize correctly."""
        page = PageChunks(
            pageNumber=1,
            width=612.0,
            height=792.0,
            chunks=[Chunk(document_id="doc1", page=1, text="Hello")]
        )
        d = page.to_dict()
        
        assert d["pageNumber"] == 1
        assert d["width"] == 612.0
        assert len(d["chunks"]) == 1


class TestDocumentChunks:
    """Tests for DocumentChunks."""
    
    def test_chunk_stats(self):
        """Should correctly count chunk types."""
        doc = DocumentChunks(
            documentId="doc1",
            fileName="test.pdf",
            fileType="pdf",
            pageCount=2,
            pages=[
                PageChunks(pageNumber=1, width=612, height=792, chunks=[
                    Chunk(document_id="doc1", page=1, text="Text"),
                    Chunk(document_id="doc1", page=1, image_path="/img.png"),
                ]),
                PageChunks(pageNumber=2, width=612, height=792, chunks=[
                    Chunk(document_id="doc1", page=2, text="More", image_path="/img2.png"),
                ]),
            ]
        )
        
        stats = doc.chunk_stats()
        assert stats["total"] == 3
        assert stats["text"] == 1
        assert stats["image"] == 1
        assert stats["mixed"] == 1
    
    def test_all_chunks(self):
        """all_chunks should flatten pages."""
        doc = DocumentChunks(
            documentId="doc1",
            fileName="test.pdf",
            fileType="pdf",
            pageCount=2,
            pages=[
                PageChunks(pageNumber=1, width=612, height=792, chunks=[
                    Chunk(document_id="doc1", page=1, text="A"),
                    Chunk(document_id="doc1", page=1, text="B"),
                ]),
                PageChunks(pageNumber=2, width=612, height=792, chunks=[
                    Chunk(document_id="doc1", page=2, text="C"),
                ]),
            ]
        )
        
        all_chunks = doc.all_chunks()
        assert len(all_chunks) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
