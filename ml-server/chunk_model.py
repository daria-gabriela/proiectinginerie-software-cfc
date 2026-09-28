"""
Unified Chunk Model - The single source of truth for document segments.

A Chunk is the atomic unit for:
- AI suggestions (RAG search results)
- User comments (anchored to chunkId)
- UI interactions (clickable regions in Study Mode)

Supports both text and image content types for multimodal search.
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Literal
from enum import Enum
import hashlib


class ChunkContentType(str, Enum):
    """Type of content in a chunk."""
    TEXT = "text"       # Text-only chunk (original behavior)
    IMAGE = "image"     # Image-only chunk (extracted figure/diagram)
    MIXED = "mixed"     # Text + Image together (e.g., figure with caption)


@dataclass
class ChunkBounds:
    """Visual bounding box for a chunk on a specific page."""
    x: float = 0.0       # % of page width (0-1)
    y: float = 0.0       # % of page height (0-1)
    width: float = 0.0   # % of page width
    height: float = 0.0  # % of page height
    
    def to_dict(self) -> dict:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }


@dataclass
class Chunk:
    """
    Unified chunk model that combines semantic content with visual positioning.
    
    Supports three content types:
    - TEXT: Traditional text chunk (backwards compatible)
    - IMAGE: Extracted image/figure/diagram
    - MIXED: Text with associated image (e.g., caption + figure)
    
    The chunk ID is deterministic based on document + page + content hash,
    ensuring stability across re-parses of the same document.
    """
    # Required fields
    document_id: str
    page: int
    
    # Content - at least one of text or image_path should be provided
    text: Optional[str] = None
    
    # Unique identifier (generated if not provided)
    id: str = ""
    
    # Content type for routing to appropriate embedding model
    content_type: ChunkContentType = ChunkContentType.TEXT
    
    # Image fields (for IMAGE or MIXED chunks)
    image_path: Optional[str] = None      # Relative path to extracted image file
    image_url: Optional[str] = None       # URL for serving (set by API layer)
    thumbnail_base64: Optional[str] = None  # Small preview for inline display
    
    # Original image metadata
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    
    # Visual bounds on the page (for Study Mode overlay)
    bounds: ChunkBounds = field(default_factory=ChunkBounds)
    
    # Which layout element indices this chunk covers (for mapping)
    element_indices: List[int] = field(default_factory=list)
    
    # Space association
    space_id: Optional[str] = None
    
    # Vector embedding (for semantic search)
    # For multimodal models, this embeds both text and image together
    embedding: Optional[List[float]] = None
    
    def __post_init__(self):
        # Auto-detect content type if not set
        if self.content_type == ChunkContentType.TEXT:
            if self.image_path and self.text:
                self.content_type = ChunkContentType.MIXED
            elif self.image_path and not self.text:
                self.content_type = ChunkContentType.IMAGE
        
        # Generate ID if not provided
        if not self.id:
            self.id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate a deterministic ID based on content."""
        if self.text:
            content = f"{self.document_id}:{self.page}:{self.text[:100]}"
        elif self.image_path:
            content = f"{self.document_id}:{self.page}:img:{self.image_path}"
        else:
            content = f"{self.document_id}:{self.page}:empty"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    @property
    def is_text_only(self) -> bool:
        return self.content_type == ChunkContentType.TEXT
    
    @property
    def is_image_only(self) -> bool:
        return self.content_type == ChunkContentType.IMAGE
    
    @property
    def is_multimodal(self) -> bool:
        return self.content_type == ChunkContentType.MIXED
    
    @property
    def has_image(self) -> bool:
        return self.image_path is not None or self.image_url is not None
    
    def to_dict(self) -> dict:
        """Convert to dict for JSON serialization."""
        result = {
            "id": self.id,
            "documentId": self.document_id,
            "page": self.page,
            "contentType": self.content_type.value,
            "bounds": self.bounds.to_dict() if hasattr(self.bounds, 'to_dict') else asdict(self.bounds),
            "elementIndices": self.element_indices,
        }
        
        # Include text if present
        if self.text:
            result["text"] = self.text
        
        # Include image fields if present
        if self.image_path:
            result["imagePath"] = self.image_path
        if self.image_url:
            result["imageUrl"] = self.image_url
        if self.thumbnail_base64:
            result["thumbnail"] = self.thumbnail_base64
        if self.image_width:
            result["imageWidth"] = self.image_width
        if self.image_height:
            result["imageHeight"] = self.image_height
        
        return result
    
    @classmethod
    def from_dict(cls, data: dict) -> "Chunk":
        """Create a Chunk from a dictionary (for loading from storage)."""
        # Handle content type
        content_type_str = data.get("contentType", data.get("content_type", "text"))
        try:
            content_type = ChunkContentType(content_type_str)
        except ValueError:
            content_type = ChunkContentType.TEXT
        
        # Handle bounds
        bounds_data = data.get("bounds", {})
        if isinstance(bounds_data, dict):
            bounds = ChunkBounds(
                x=bounds_data.get("x", 0),
                y=bounds_data.get("y", 0),
                width=bounds_data.get("width", 0),
                height=bounds_data.get("height", 0),
            )
        else:
            bounds = ChunkBounds()
        
        return cls(
            id=data.get("id", ""),
            document_id=data.get("documentId", data.get("document_id", "")),
            page=data.get("page", 1),
            text=data.get("text"),
            content_type=content_type,
            image_path=data.get("imagePath", data.get("image_path")),
            image_url=data.get("imageUrl", data.get("image_url")),
            thumbnail_base64=data.get("thumbnail", data.get("thumbnail_base64")),
            image_width=data.get("imageWidth", data.get("image_width")),
            image_height=data.get("imageHeight", data.get("image_height")),
            bounds=bounds,
            element_indices=data.get("elementIndices", data.get("element_indices", [])),
            space_id=data.get("spaceId", data.get("space_id")),
            embedding=data.get("embedding"),
        )


@dataclass
class PageChunks:
    """All chunks for a single page, with visual data for rendering."""
    pageNumber: int
    width: float
    height: float
    chunks: List[Chunk] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "pageNumber": self.pageNumber,
            "width": self.width,
            "height": self.height,
            "chunks": [c.to_dict() for c in self.chunks],
        }
    
    @property
    def text_chunks(self) -> List[Chunk]:
        """Get only text chunks."""
        return [c for c in self.chunks if c.is_text_only]
    
    @property
    def image_chunks(self) -> List[Chunk]:
        """Get only image chunks."""
        return [c for c in self.chunks if c.has_image]


@dataclass
class DocumentChunks:
    """Complete chunk data for a document."""
    documentId: str
    fileName: str
    fileType: str
    pageCount: int
    pages: List[PageChunks] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "documentId": self.documentId,
            "fileName": self.fileName,
            "fileType": self.fileType,
            "pageCount": self.pageCount,
            "pages": [p.to_dict() for p in self.pages],
        }
    
    def all_chunks(self) -> List[Chunk]:
        """Flatten all chunks from all pages."""
        result = []
        for page in self.pages:
            result.extend(page.chunks)
        return result
    
    def text_chunks(self) -> List[Chunk]:
        """Get all text-only chunks."""
        return [c for c in self.all_chunks() if c.is_text_only]
    
    def image_chunks(self) -> List[Chunk]:
        """Get all image chunks (IMAGE or MIXED)."""
        return [c for c in self.all_chunks() if c.has_image]
    
    def chunk_stats(self) -> dict:
        """Get statistics about chunk types."""
        all_chunks = self.all_chunks()
        return {
            "total": len(all_chunks),
            "text": sum(1 for c in all_chunks if c.is_text_only),
            "image": sum(1 for c in all_chunks if c.is_image_only),
            "mixed": sum(1 for c in all_chunks if c.is_multimodal),
        }

