"""
Image extraction utilities for PDFs.

Extracts embedded images and optionally detected tables from PDF pages.
Uses PyMuPDF (fitz) for extraction.
"""

import os
import base64
import logging
from pathlib import Path
from typing import List, Optional, Tuple
from dataclasses import dataclass

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

# Minimum image dimensions to extract (skip icons, decorations)
MIN_IMAGE_WIDTH = 100  # pixels
MIN_IMAGE_HEIGHT = 100  # pixels

# Maximum thumbnail size for inline display
THUMBNAIL_MAX_SIZE = 150  # pixels

# Supported image formats for extraction
SUPPORTED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}


@dataclass
class ExtractedImage:
    """Represents an image extracted from a document."""
    page: int
    image_path: str  # Path where image is saved
    width: int
    height: int
    bounds: Tuple[float, float, float, float]  # (x, y, width, height) normalized 0-1
    thumbnail_base64: Optional[str] = None
    source_type: str = "embedded"  # "embedded", "table", or "figure"


def get_image_storage_dir(document_id: str, base_dir: str = "extracted_images") -> str:
    """Get the directory for storing extracted images for a document."""
    storage_dir = os.path.join(base_dir, document_id)
    os.makedirs(storage_dir, exist_ok=True)
    return storage_dir


def create_thumbnail_base64(image_path: str, max_size: int = THUMBNAIL_MAX_SIZE) -> Optional[str]:
    """Create a base64-encoded thumbnail for inline display."""
    try:
        from PIL import Image
        import io
        
        with Image.open(image_path) as img:
            # Calculate thumbnail size maintaining aspect ratio
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            b64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{b64_data}"
    except Exception as e:
        logger.warning(f"Failed to create thumbnail for {image_path}: {e}")
        return None


def extract_images_from_page(
    page: fitz.Page,
    document_id: str,
    page_num: int,
    storage_dir: str,
    min_width: int = MIN_IMAGE_WIDTH,
    min_height: int = MIN_IMAGE_HEIGHT,
    page_text_length: int = 0,  # NEW: Length of text on this page
) -> List[ExtractedImage]:
    """
    Extract embedded images from a PDF page.
    
    Args:
        page: PyMuPDF page object
        document_id: Document identifier for file naming
        page_num: 1-indexed page number
        storage_dir: Directory to save extracted images
        min_width: Minimum image width to extract
        min_height: Minimum image height to extract
        page_text_length: Length of extracted text on this page (for smart filtering)
        
    Returns:
        List of ExtractedImage objects
    """
    doc = page.parent
    page_width = page.rect.width
    page_height = page.rect.height
    extracted = []
    

    # Get all images on the page
    image_list = page.get_images(full=True)
    
    for img_index, img_info in enumerate(image_list):
        xref = img_info[0]  # Image reference number
        
        try:
            # Extract the raw image
            base_image = doc.extract_image(xref)
            if not base_image:
                continue
            
            img_width = base_image["width"]
            img_height = base_image["height"]
            
            # Skip small images (likely icons, bullets, decorations)
            if img_width < min_width or img_height < min_height:
                logger.debug(f"Skipping small image: {img_width}x{img_height}")
                continue
            
            # Skip full-page images ONLY when page has significant text
            # This avoids redundant image chunks on text-heavy slides/pages
            # but preserves full-page images on image-only pages (diagrams, figures)
            MIN_TEXT_FOR_SKIP = 50  # Characters threshold
            
            img_area = img_width * img_height
            page_area = page_width * page_height
            coverage_ratio = img_area / page_area if page_area > 0 else 0
            
            if coverage_ratio > 0.8 and page_text_length > MIN_TEXT_FOR_SKIP:
                logger.debug(f"Skipping full-page image on text-heavy page (coverage: {coverage_ratio:.1%}, text: {page_text_length} chars)")
                continue

            
            # Get image extension
            img_ext = base_image["ext"]
            if not img_ext:
                img_ext = "png"
            
            # Save the image
            image_filename = f"p{page_num}_img{img_index}.{img_ext}"
            image_path = os.path.join(storage_dir, image_filename)
            
            with open(image_path, "wb") as f:
                f.write(base_image["image"])
            
            # Try to get the image position on the page
            # This is tricky - we need to find where the image is rendered
            bounds = _find_image_bounds(page, xref, page_width, page_height)
            
            # Create thumbnail
            thumbnail = create_thumbnail_base64(image_path)
            
            extracted.append(ExtractedImage(
                page=page_num,
                image_path=image_path,
                width=img_width,
                height=img_height,
                bounds=bounds,
                thumbnail_base64=thumbnail,
                source_type="embedded"
            ))
            
            logger.debug(f"Extracted image: {image_filename} ({img_width}x{img_height})")
            
        except Exception as e:
            logger.warning(f"Failed to extract image {xref} from page {page_num}: {e}")
            continue
    
    return extracted


def _find_image_bounds(
    page: fitz.Page,
    xref: int,
    page_width: float,
    page_height: float
) -> Tuple[float, float, float, float]:
    """
    Try to find the bounds of an image on the page.
    
    Returns normalized (x, y, width, height) tuple.
    Falls back to center placement if location cannot be determined.
    """
    try:
        # Get all image instances on the page
        image_rects = page.get_image_rects(xref)
        
        if image_rects and len(image_rects) > 0:
            # Use the first occurrence
            rect = image_rects[0]
            return (
                rect.x0 / page_width,
                rect.y0 / page_height,
                (rect.x1 - rect.x0) / page_width,
                (rect.y1 - rect.y0) / page_height
            )
    except Exception:
        pass
    
    # Fallback: center of page, medium size
    return (0.2, 0.3, 0.6, 0.4)


def extract_tables_from_page(
    page: fitz.Page,
    document_id: str,
    page_num: int,
    storage_dir: str,
) -> List[ExtractedImage]:
    """
    Detect tables on a PDF page and save them as images.
    
    Uses PyMuPDF's built-in table detection (requires PyMuPDF >= 1.23.0).
    
    Args:
        page: PyMuPDF page object
        document_id: Document identifier
        page_num: 1-indexed page number
        storage_dir: Directory to save table images
        
    Returns:
        List of ExtractedImage objects for detected tables
    """
    page_width = page.rect.width
    page_height = page.rect.height
    extracted = []
    
    try:
        # find_tables() requires PyMuPDF >= 1.23.0
        table_finder = page.find_tables()
        
        if not table_finder or not table_finder.tables:
            return []
        
        for i, table in enumerate(table_finder.tables):
            try:
                bbox = table.bbox  # (x0, y0, x1, y1)
                
                # Skip very small tables
                table_width = bbox[2] - bbox[0]
                table_height = bbox[3] - bbox[1]
                if table_width < 50 or table_height < 30:
                    continue
                
                # Render the table region as an image
                clip = fitz.Rect(bbox)
                # Add small padding
                clip = clip + (-5, -5, 5, 5)
                clip = clip & page.rect  # Clip to page bounds
                
                # Render at 2x resolution for quality
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(clip=clip, matrix=mat)
                
                # Save as PNG
                table_filename = f"p{page_num}_table{i}.png"
                table_path = os.path.join(storage_dir, table_filename)
                pix.save(table_path)
                
                # Normalized bounds
                bounds = (
                    bbox[0] / page_width,
                    bbox[1] / page_height,
                    (bbox[2] - bbox[0]) / page_width,
                    (bbox[3] - bbox[1]) / page_height
                )
                
                # Create thumbnail
                thumbnail = create_thumbnail_base64(table_path)
                
                extracted.append(ExtractedImage(
                    page=page_num,
                    image_path=table_path,
                    width=pix.width,
                    height=pix.height,
                    bounds=bounds,
                    thumbnail_base64=thumbnail,
                    source_type="table"
                ))
                
                logger.debug(f"Extracted table: {table_filename}")
                
            except Exception as e:
                logger.warning(f"Failed to extract table {i} from page {page_num}: {e}")
                continue
                
    except AttributeError:
        # find_tables() not available in this PyMuPDF version
        logger.debug("Table detection not available (requires PyMuPDF >= 1.23.0)")
    except Exception as e:
        logger.warning(f"Table detection failed on page {page_num}: {e}")
    
    return extracted


def extract_all_images_from_pdf(
    doc: fitz.Document,
    document_id: str,
    storage_dir: str,
    extract_tables: bool = True,
    min_width: int = MIN_IMAGE_WIDTH,
    min_height: int = MIN_IMAGE_HEIGHT,
) -> List[ExtractedImage]:
    """
    Extract all images (and optionally tables) from a PDF document.
    
    Args:
        doc: Open PyMuPDF document
        document_id: Document identifier
        storage_dir: Base directory for storing images
        extract_tables: Whether to detect and screenshot tables
        min_width: Minimum image width to extract
        min_height: Minimum image height to extract
        
    Returns:
        List of all ExtractedImage objects
    """
    # Ensure storage directory exists
    image_dir = get_image_storage_dir(document_id, storage_dir)
    
    all_images = []
    
    for page_num, page in enumerate(doc, 1):
        # Extract embedded images
        page_images = extract_images_from_page(
            page=page,
            document_id=document_id,
            page_num=page_num,
            storage_dir=image_dir,
            min_width=min_width,
            min_height=min_height
        )
        all_images.extend(page_images)
        
        # Extract tables as images
        if extract_tables:
            page_tables = extract_tables_from_page(
                page=page,
                document_id=document_id,
                page_num=page_num,
                storage_dir=image_dir
            )
            all_images.extend(page_tables)
    
    logger.info(f"Extracted {len(all_images)} images from document {document_id}")
    return all_images


def cleanup_document_images(document_id: str, base_dir: str = "extracted_images") -> None:
    """Remove all extracted images for a document."""
    import shutil
    storage_dir = os.path.join(base_dir, document_id)
    if os.path.exists(storage_dir):
        shutil.rmtree(storage_dir)
        logger.debug(f"Cleaned up images for document {document_id}")
