"""
Unified Document Parser - Creates chunks with both semantic content AND visual bounds.

This replaces both document_parser.py and layout_parser.py logic by:
1. Parsing document structure (pages, text blocks)
2. Grouping text blocks into semantic chunks (using token limits)
3. Computing visual bounding boxes for each chunk
4. Extracting embedded images and tables as image chunks (NEW)
"""

import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pptx import Presentation
from pptx.util import Emu
from pathlib import Path
from typing import List, Tuple, Optional
from tokenizers import Tokenizer
from chunk_model import Chunk, ChunkBounds, PageChunks, DocumentChunks, ChunkContentType
import base64
import logging
import os

logger = logging.getLogger(__name__)

tokenizer = Tokenizer.from_pretrained("cross-encoder/ms-marco-MiniLM-L6-v2")
DEFAULT_CHUNK_TOKENS = 400  # Default ~300-400 words per chunk
DEFAULT_IMAGE_STORAGE_DIR = "extracted_images"  # Base directory for extracted images



def parse_pdf_unified(
    file_path: str,
    document_id: str,
    max_tokens: int = DEFAULT_CHUNK_TOKENS,
    extract_images: bool = True,
    extract_tables: bool = True,
    image_storage_dir: str = DEFAULT_IMAGE_STORAGE_DIR,
) -> DocumentChunks:
    """
    Parse PDF and create chunks with visual bounds.
    
    Args:
        file_path: Path to the PDF file
        document_id: Unique document identifier
        max_tokens: Maximum tokens per chunk (default: 400)
        extract_images: Whether to extract embedded images as image chunks
        extract_tables: Whether to detect and extract tables as image chunks
        image_storage_dir: Base directory for storing extracted images
        
    Returns:
        DocumentChunks with both text and image chunks
    """
    doc = fitz.open(file_path)
    file_name = Path(file_path).name
    
    result = DocumentChunks(
        documentId=document_id,
        fileName=file_name,
        fileType="pdf",
        pageCount=len(doc)
    )
    
    # Import image extraction if needed
    if extract_images or extract_tables:
        try:
            from image_extraction import (
                extract_images_from_page,
                extract_tables_from_page,
                get_image_storage_dir
            )
            image_dir = get_image_storage_dir(document_id, image_storage_dir)
        except ImportError:
            logger.warning("Image extraction module not available, skipping image extraction")
            extract_images = False
            extract_tables = False
    
    for page_num, page in enumerate(doc, 1):
        page_width = page.rect.width
        page_height = page.rect.height
        
        page_chunks = PageChunks(
            pageNumber=page_num,
            width=page_width,
            height=page_height
        )
        
        # ==========================================
        # PART 1: Extract text chunks (original logic)
        # ==========================================
        
        # Get text blocks with positions
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        
        # Collect text spans with their bounding boxes
        text_spans: List[Tuple[str, Tuple[float, float, float, float]]] = []
        
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    line_text_parts = []
                    line_bbox = None
                    
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            line_text_parts.append(text)
                            bbox = span["bbox"]
                            if line_bbox is None:
                                line_bbox = list(bbox)
                            else:
                                # Expand bbox to include this span
                                line_bbox[0] = min(line_bbox[0], bbox[0])
                                line_bbox[1] = min(line_bbox[1], bbox[1])
                                line_bbox[2] = max(line_bbox[2], bbox[2])
                                line_bbox[3] = max(line_bbox[3], bbox[3])
                    
                    if line_text_parts and line_bbox:
                        line_text = " ".join(line_text_parts)
                        text_spans.append((line_text, tuple(line_bbox)))
        
        # Group spans into chunks based on token limit
        current_chunk_texts = []
        current_chunk_bboxes = []
        current_tokens = 0
        
        def flush_chunk():
            nonlocal current_chunk_texts, current_chunk_bboxes, current_tokens
            if not current_chunk_texts:
                return
            
            # Combine text
            chunk_text = " ".join(current_chunk_texts)
            
            # Compute unified bounding box (normalized to 0-1)
            min_x = min(b[0] for b in current_chunk_bboxes)
            min_y = min(b[1] for b in current_chunk_bboxes)
            max_x = max(b[2] for b in current_chunk_bboxes)
            max_y = max(b[3] for b in current_chunk_bboxes)
            
            bounds = ChunkBounds(
                x=min_x / page_width,
                y=min_y / page_height,
                width=(max_x - min_x) / page_width,
                height=(max_y - min_y) / page_height
            )
            
            chunk = Chunk(
                text=chunk_text,
                document_id=document_id,
                page=page_num,
                bounds=bounds,
                content_type=ChunkContentType.TEXT
            )
            page_chunks.chunks.append(chunk)
            
            current_chunk_texts = []
            current_chunk_bboxes = []
            current_tokens = 0
        
        for text, bbox in text_spans:
            # Estimate tokens for this span
            encoding = tokenizer.encode(text)
            span_tokens = len(encoding.ids)
            
            # Check if adding this would exceed limit
            if current_tokens + span_tokens > max_tokens and current_chunk_texts:
                flush_chunk()
            
            current_chunk_texts.append(text)
            current_chunk_bboxes.append(bbox)
            current_tokens += span_tokens
        
        # Don't forget the last chunk
        flush_chunk()
        
        # Calculate total text length for this page (for smart image filtering)
        page_text_length = sum(len(chunk.text or '') for chunk in page_chunks.chunks)
        
        # ==========================================
        # PART 2: Extract image chunks (NEW)
        # ==========================================
        
        if extract_images:
            try:
                extracted_images = extract_images_from_page(
                    page=page,
                    document_id=document_id,
                    page_num=page_num,
                    storage_dir=image_dir,
                    page_text_length=page_text_length  # Pass text length for smart filtering
                )

                
                for img in extracted_images:
                    bounds = ChunkBounds(
                        x=img.bounds[0],
                        y=img.bounds[1],
                        width=img.bounds[2],
                        height=img.bounds[3]
                    )
                    
                    chunk = Chunk(
                        document_id=document_id,
                        page=page_num,
                        image_path=img.image_path,
                        thumbnail_base64=img.thumbnail_base64,
                        image_width=img.width,
                        image_height=img.height,
                        bounds=bounds,
                        content_type=ChunkContentType.IMAGE
                    )
                    page_chunks.chunks.append(chunk)
                    
            except Exception as e:
                logger.warning(f"Failed to extract images from page {page_num}: {e}")
        
        # ==========================================
        # PART 3: Extract table chunks (NEW)
        # ==========================================
        
        if extract_tables:
            try:
                extracted_tables = extract_tables_from_page(
                    page=page,
                    document_id=document_id,
                    page_num=page_num,
                    storage_dir=image_dir
                )
                
                for table in extracted_tables:
                    bounds = ChunkBounds(
                        x=table.bounds[0],
                        y=table.bounds[1],
                        width=table.bounds[2],
                        height=table.bounds[3]
                    )
                    
                    chunk = Chunk(
                        document_id=document_id,
                        page=page_num,
                        image_path=table.image_path,
                        thumbnail_base64=table.thumbnail_base64,
                        image_width=table.width,
                        image_height=table.height,
                        bounds=bounds,
                        content_type=ChunkContentType.IMAGE
                    )
                    page_chunks.chunks.append(chunk)
                    
            except Exception as e:
                logger.warning(f"Failed to extract tables from page {page_num}: {e}")
        
        result.pages.append(page_chunks)
    
    doc.close()
    
    # Log stats
    stats = result.chunk_stats()
    logger.info(f"Parsed {file_name}: {stats['text']} text chunks, {stats['image']} image chunks")
    
    return result



def parse_docx_unified(file_path: str, document_id: str, max_tokens: int = DEFAULT_CHUNK_TOKENS) -> DocumentChunks:
    """Parse DOCX and create chunks with configurable token limit."""
    document = DocxDocument(file_path)
    file_name = Path(file_path).name
    
    # Collect paragraphs as potential chunk boundaries
    paragraphs = [p.text.strip() for p in document.paragraphs if p.text.strip()]
    
    result = DocumentChunks(
        documentId=document_id,
        fileName=file_name,
        fileType="docx",
        pageCount=1  # DOCX doesn't have fixed pages
    )
    
    page_chunks = PageChunks(
        pageNumber=1,
        width=612,  # Letter size
        height=792
    )
    
    # Group paragraphs into chunks
    current_texts = []
    current_tokens = 0
    y_position = 0.02
    
    def flush_chunk():
        nonlocal current_texts, current_tokens, y_position
        if not current_texts:
            return
        
        chunk_text = "\n".join(current_texts)
        chunk_height = min(0.15, len(current_texts) * 0.03)
        
        bounds = ChunkBounds(
            x=0.05,
            y=y_position,
            width=0.9,
            height=chunk_height
        )
        
        chunk = Chunk(
            text=chunk_text,
            document_id=document_id,
            page=1,
            bounds=bounds
        )
        page_chunks.chunks.append(chunk)
        
        y_position += chunk_height + 0.02
        if y_position > 0.95:
            y_position = 0.02  # Wrap (simplified)
        
        current_texts = []
        current_tokens = 0
    
    for para in paragraphs:
        encoding = tokenizer.encode(para)
        para_tokens = len(encoding.ids)
        
        if current_tokens + para_tokens > max_tokens and current_texts:
            flush_chunk()
        
        current_texts.append(para)
        current_tokens += para_tokens
    
    flush_chunk()
    result.pages.append(page_chunks)
    
    return result


def parse_pptx_unified(file_path: str, document_id: str, max_tokens: int = DEFAULT_CHUNK_TOKENS) -> DocumentChunks:
    """Parse PPTX and create chunks per slide with configurable token limit."""
    prs = Presentation(file_path)
    file_name = Path(file_path).name
    
    slide_width = prs.slide_width
    slide_height = prs.slide_height
    
    result = DocumentChunks(
        documentId=document_id,
        fileName=file_name,
        fileType="pptx",
        pageCount=len(prs.slides)
    )
    
    for slide_num, slide in enumerate(prs.slides, 1):
        page_chunks = PageChunks(
            pageNumber=slide_num,
            width=slide_width / Emu(914400),
            height=slide_height / Emu(914400)
        )
        
        # Collect all text shapes with positions
        shape_texts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                # Extragem valorile cu getattr pentru a evita erorile dacă lipsesc
                l = getattr(shape, 'left', 0)
                t = getattr(shape, 'top', 0)
                w = getattr(shape, 'width', 0)
                h = getattr(shape, 'height', 0)

                # Calculăm coordonatele normalizate (doar dacă avem dimensiuni valide)
                bounds = ChunkBounds(
                    x=(l / slide_width) if (l is not None and slide_width) else 0,
                    y=(t / slide_height) if (t is not None and slide_height) else 0,
                    width=(w / slide_width) if (w is not None and slide_width) else 0,
                    height=(h / slide_height) if (h is not None and slide_height) else 0
                )
                shape_texts.append((shape.text.strip(), bounds))
        
        # For slides, each text shape could be a separate chunk
        # OR group small ones together based on proximity
        # For now: each shape is a chunk (slides typically have fewer text blocks)
        for text, bounds in shape_texts:
            chunk = Chunk(
                text=text,
                document_id=document_id,
                page=slide_num,
                bounds=bounds
            )
            page_chunks.chunks.append(chunk)
        
        result.pages.append(page_chunks)
    
    return result


def parse_txt_unified(file_path: str, document_id: str, max_tokens: int = DEFAULT_CHUNK_TOKENS) -> DocumentChunks:
    """Parse TXT and create chunks with configurable token limit."""
    file_name = Path(file_path).name
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = DocumentChunks(
        documentId=document_id,
        fileName=file_name,
        fileType="txt",
        pageCount=1
    )
    
    page_chunks = PageChunks(
        pageNumber=1,
        width=800,
        height=1000
    )
    
    # Split into paragraphs
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    if not paragraphs:
        paragraphs = [content.strip()] if content.strip() else []
    
    y_position = 0.02
    current_texts = []
    current_tokens = 0
    
    def flush_chunk():
        nonlocal current_texts, current_tokens, y_position
        if not current_texts:
            return
        
        chunk_text = "\n".join(current_texts)
        chunk_height = min(0.15, len(current_texts) * 0.03)
        
        bounds = ChunkBounds(
            x=0.05,
            y=y_position,
            width=0.9,
            height=chunk_height
        )
        
        chunk = Chunk(
            text=chunk_text,
            document_id=document_id,
            page=1,
            bounds=bounds
        )
        page_chunks.chunks.append(chunk)
        
        y_position += chunk_height + 0.02
        current_texts = []
        current_tokens = 0
    
    for para in paragraphs:
        encoding = tokenizer.encode(para)
        para_tokens = len(encoding.ids)
        
        if current_tokens + para_tokens > max_tokens and current_texts:
            flush_chunk()
        
        current_texts.append(para)
        current_tokens += para_tokens
    
    flush_chunk()
    result.pages.append(page_chunks)
    
    return result


def parse_document_unified(file_path: str, document_id: str, max_tokens: int = DEFAULT_CHUNK_TOKENS) -> DocumentChunks:
    """
    Main entry point: Parse any supported document and return unified chunks.
    
    Args:
        file_path: Path to the document
        document_id: Unique document identifier  
        max_tokens: Maximum tokens per chunk (100-1000, default: 400)
    
    Chunks have:
    - Semantic text content (for AI search)
    - Visual bounds (for Study Mode UI)
    - Unique IDs (for comment anchoring)
    """
    # Validate token range
    max_tokens = max(100, min(1000, max_tokens))
    
    path = Path(file_path)
    suffix = path.suffix.lower()
    
    if suffix == ".pdf":
        return parse_pdf_unified(file_path, document_id, max_tokens)
    elif suffix == ".docx":
        return parse_docx_unified(file_path, document_id, max_tokens)
    elif suffix == ".pptx":
        return parse_pptx_unified(file_path, document_id, max_tokens)
    elif suffix == ".txt":
        return parse_txt_unified(file_path, document_id, max_tokens)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")

def render_page_as_image(file_path: str, page_number: int, scale: float = 2.0) -> dict:
    """Render a single page as a PNG image and return as base64.
    
    Args:
        file_path: Path to the document
        page_number: 1-indexed page number
        scale: Render scale (2.0 = 2x resolution for crisp display)
    
    Returns:
        dict with 'image' (base64 data URL), 'width', 'height'
    """
    path = Path(file_path)
    suffix = path.suffix.lower()
    
    if suffix == ".pdf":
        doc = fitz.open(file_path)
        if page_number < 1 or page_number > len(doc):
            raise ValueError(f"Page {page_number} out of range (1-{len(doc)})")
        
        page = doc[page_number - 1]
        
        # Render at higher resolution for crisp display
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PNG bytes
        png_bytes = pix.tobytes("png")
        b64_data = base64.b64encode(png_bytes).decode('utf-8')
        
        result = {
            "image": f"data:image/png;base64,{b64_data}",
            "width": pix.width,
            "height": pix.height,
            "originalWidth": page.rect.width,
            "originalHeight": page.rect.height,
            "pageNumber": page_number,
            "totalPages": len(doc)
        }
        
        doc.close()
        return result
    
    elif suffix == ".pptx":
        # For PPTX, we need to use a different approach
        # Option 1: Convert to PDF first, then render
        # Option 2: Use python-pptx with PIL (limited)
        raise ValueError("PPTX page rendering not yet implemented - use PDF export")
    
    else:
        # Default placeholder for other types
        raise ValueError(f"Page rendering not supported for: {suffix}")
