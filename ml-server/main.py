"""
StudySync ML Server - Unified Chunk-Centric API

All document interactions are based on CHUNKS:
- /index: Parse document into chunks (with visual bounds)
- /chunks/{document_id}: Get all chunks for a document (for Study Mode)
- /search: Search chunks and return matching chunk IDs
- /render: Render page as image (for Study Mode background)
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from unified_parser import parse_document_unified, render_page_as_image
from chunk_model import Chunk as ChunkModel, ChunkContentType
from storage import ChunkStore
from search import rerank_chunks
from vector_search import VectorSearch
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="StudySync ML Server - Chunk-Centric")
store = ChunkStore()
vector_engine = VectorSearch()


# =====================
# Request/Response Models
# =====================

class IndexRequest(BaseModel):
    document_id: str
    file_path: str
    space_id: str
    max_tokens: int = 400  # Configurable chunk size (100-1000)


class IndexResponse(BaseModel):
    success: bool
    chunk_count: int
    error: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    space_id: str
    top_k: int = 10         # Number of text/global results
    top_k_images: int = 5   # Number of image results (when include_images=True)
    document_ids: Optional[List[str]] = None
    include_images: bool = True   # Whether to include image chunks in search
    use_reranker: bool = True     # Whether to use cross-encoder reranking




class ChunkResult(BaseModel):
    """A chunk returned from search or chunk listing."""
    id: str
    documentId: str
    page: int
    contentType: str = "text"  # "text", "image", or "mixed"
    
    # Text content (for text and mixed chunks)
    text: Optional[str] = None
    
    # Image content (for image and mixed chunks)
    imagePath: Optional[str] = None
    imageUrl: Optional[str] = None
    thumbnail: Optional[str] = None  # Base64 thumbnail
    imageWidth: Optional[int] = None
    imageHeight: Optional[int] = None
    
    # Search score and visual bounds
    score: Optional[float] = None
    bounds: Optional[dict] = None


class RenderRequest(BaseModel):
    file_path: str
    page_number: int = 1
    scale: float = 2.0


# =====================
# Endpoints
# =====================

@app.post("/index", response_model=IndexResponse)
def index_document(req: IndexRequest):
    """
    Parse document into unified chunks with visual bounds.
    Stores chunks for both AI search and Study Mode UI.
    
    Args:
        max_tokens: Chunk size in tokens (100-1000, default: 400)
                   - 200: Fine-grained (sentence-level)
                   - 400: Standard (paragraph-level)
                   - 800: Coarse (section-level)
    """
    try:
        # Delete existing chunks first (for re-indexing)
        store.remove_document(req.document_id)
        
        # Parse with specified chunk size
        doc_chunks = parse_document_unified(req.file_path, req.document_id, req.max_tokens)
        all_chunks = doc_chunks.all_chunks()
        
        # Generate embeddings
        vector_engine.encode_chunks(all_chunks)
        
        # Store in chunk store with space association
        store.add_document_chunks(req.document_id, doc_chunks, space_id=req.space_id)
        
        return IndexResponse(success=True, chunk_count=len(all_chunks))
    except Exception as e:
        import traceback
        traceback.print_exc()
        return IndexResponse(success=False, chunk_count=0, error=str(e))


@app.get("/chunks/{document_id}")
def get_document_chunks(document_id: str):
    """
    Get all chunks for a document with their visual bounds.
    Used by Study Mode to render clickable chunk regions.
    """
    doc_chunks = store.get_document_chunks(document_id)
    if not doc_chunks:
        raise HTTPException(status_code=404, detail=f"Document {document_id} not found")
    
    return doc_chunks.to_dict()


@app.post("/search", response_model=List[ChunkResult])
def search(req: SearchRequest):
    """
    Search for chunks matching a query.
    Returns chunk IDs that can be highlighted in Study Mode.
    
    When include_images is False, only text chunks are included in the search.
    When use_reranker is False, returns vector search results directly (faster).
    """
    chunks = store.get_chunks_for_space(req.space_id)

    if req.document_ids:
        # Păstrăm doar chunk-urile care aparțin documentelor bifate
        chunks = [c for c in chunks if str(c.document_id) in req.document_ids]

    # Filter out image chunks if not requested (text-only search)
    if not req.include_images:
        chunks = [c for c in chunks if c.content_type == ChunkContentType.TEXT]
        logger.debug(f"Text-only search: filtered to {len(chunks)} text chunks")

    if not chunks:
        return []

    # 1. Vector Search (Retriever)
    retriever_k = max(req.top_k * 2, 20) if req.use_reranker else req.top_k
    retriever_k = min(retriever_k, len(chunks))
    
    # A. Global Search
    vector_results = vector_engine.search(req.query, chunks, top_k=retriever_k)
    
    # Track unique candidates with their scores
    candidate_map = {c.id: (c, score) for c, score in vector_results}
    
    # B. Diversity Boost (Force Image Candidates)
    # Perform this regardless of reranker usage to guarantee image presence in results
    if req.include_images:
        image_chunks = [c for c in chunks if c.content_type != ChunkContentType.TEXT]
        
        if image_chunks:
            # Fetch as many image candidates as requested in top_k_images
            img_retriever_k = min(req.top_k_images, len(image_chunks))
            
            image_results = vector_engine.search(req.query, image_chunks, top_k=img_retriever_k)
            
            added_count = 0
            for c, score in image_results:
                if c.id not in candidate_map:
                    candidate_map[c.id] = (c, score)
                    added_count += 1
            
            if added_count > 0:
                logger.debug(f"Diversity Boost: Added {added_count} image candidates to pool")

    # Determine total result limit (Text Quota + Image Quota)
    total_limit = req.top_k + req.top_k_images

    if req.use_reranker:
        # 2. Cross-Encoder (Reranker)
        candidate_chunks = [c for c, s in candidate_map.values()]
        results = rerank_chunks(req.query, candidate_chunks, top_k=total_limit)
        logger.debug(f"Reranked {len(candidate_chunks)} candidates → top {total_limit}")
    else:
        # Skip reranking - return merged list
        # IMPORTANT: We return Top Global + Top Images.
        # This might exceed req.top_k, but it guarantees textual AND visual relevance.
        results = list(candidate_map.values())
        results.sort(key=lambda x: x[1], reverse=True)
        
        # If we strictly clipped to top_k here, images might fall off due to score differences.
        # Instead, we try to preserve diversity.
        # Simplest approach: Return everything found (Global Top K + Image Top K)
        # This gives the user maximum options.
        logger.debug(f"Skipped reranker, returning {len(results)} merged results")


    
    # Build response with support for image chunks
    response = []
    for c, score in results:
        result = ChunkResult(
            id=c.id,
            documentId=c.document_id,
            page=c.page,
            contentType=c.content_type.value if hasattr(c.content_type, 'value') else str(c.content_type),
            text=c.text,
            imagePath=c.image_path,
            thumbnail=c.thumbnail_base64,
            imageWidth=c.image_width,
            imageHeight=c.image_height,
            score=score,
            bounds=c.bounds.to_dict() if hasattr(c.bounds, 'to_dict') else {
                "x": c.bounds.x,
                "y": c.bounds.y,
                "width": c.bounds.width,
                "height": c.bounds.height
            } if c.bounds else None
        )
        response.append(result)
    
    return response


@app.post("/render")
def render_page(req: RenderRequest):
    """Render a document page as a PNG image for Study Mode background."""
    try:
        result = render_page_as_image(req.file_path, req.page_number, req.scale)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/images/{document_id}/{filename}")
def serve_extracted_image(document_id: str, filename: str):
    """
    Serve an extracted image from a document.
    Used for displaying image chunks in the frontend.
    """
    import os
    from fastapi.responses import FileResponse
    
    image_path = os.path.join("extracted_images", document_id, filename)
    
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail=f"Image not found: {filename}")
    
    # Determine content type
    ext = os.path.splitext(filename)[1].lower()
    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    content_type = content_types.get(ext, "application/octet-stream")
    
    return FileResponse(image_path, media_type=content_type)


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    """Remove a document and all its chunks, including extracted images."""
    import shutil
    import os
    
    store.remove_document(document_id)
    
    # Also remove extracted images
    image_dir = os.path.join("extracted_images", document_id)
    if os.path.exists(image_dir):
        shutil.rmtree(image_dir)
    
    return {"success": True}


@app.get("/health")
def health():
    """
    Health check with model status information.
    """
    from embeddings import get_model_info
    
    info = get_model_info()
    
    return {
        "status": "ok",
        "version": "2.1-multimodal",
        "models": {
            "embedder": info.get("embedder_model", "not_loaded"),
            "reranker": info.get("reranker_model", "not_loaded"),
        },
        "capabilities": {
            "supports_images": info.get("embedder_supports_images", False),
            "embedding_dimension": info.get("embedding_dimension", 384),
        }
    }


@app.get("/model-info")
def model_info():
    """
    Get detailed information about loaded models.
    """
    from embeddings import get_model_info
    return get_model_info()



