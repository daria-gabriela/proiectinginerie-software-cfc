"""
Chunk Store - Persists unified chunks with visual bounds.

Supports:
- Storing DocumentChunks (with pages and visual bounds)
- Retrieving chunks by document or space
- Legacy Chunk format for search compatibility
"""

import json
from pathlib import Path
from typing import List, Optional, Dict
from chunk_model import Chunk, ChunkBounds, PageChunks, DocumentChunks



class ChunkStore:
    """
    Storage for unified document chunks.
    
    Stores both:
    - Full DocumentChunks (with page structure and visual bounds)
    - Flat chunk list per space (for search)
    """
    
    def __init__(self, storage_path: str = "./chunk_store_v2.json"):
        self.storage_path = Path(storage_path)
        self.documents: Dict[str, DocumentChunks] = {}
        self.doc_to_space: Dict[str, str] = {}
        self._load()
    
    def add_document_chunks(self, document_id: str, doc_chunks: DocumentChunks, space_id: str = None):
        """Store a document's chunks."""
        self.documents[document_id] = doc_chunks
        if space_id:
            self.doc_to_space[document_id] = space_id
        self._save()
    
    def get_document_chunks(self, document_id: str) -> Optional[DocumentChunks]:
        """Get all chunks for a document."""
        return self.documents.get(document_id)
    
    def get_chunk_by_id(self, document_id: str, chunk_id: str) -> Optional[Chunk]:
        """Get a specific chunk by ID."""
        doc_chunks = self.documents.get(document_id)
        if not doc_chunks:
            return None
        
        for page in doc_chunks.pages:
            for chunk in page.chunks:
                if chunk.id == chunk_id:
                    return chunk
        return None
    
    def get_chunks_for_space(self, space_id: str) -> List[Chunk]:
        """Get all chunks for a space (for RAG search)."""
        result = []
        for doc_id, s_id in self.doc_to_space.items():
            if s_id == space_id:
                doc_chunks = self.documents.get(doc_id)
                if doc_chunks:
                    result.extend(doc_chunks.all_chunks())
        return result
    
    def remove_document(self, document_id: str):
        """Remove a document and its chunks."""
        self.documents.pop(document_id, None)
        self.doc_to_space.pop(document_id, None)
        self._save()
    
    def _save(self):
        """Persist to JSON file."""
        data = {
            "documents": {},
            "doc_to_space": self.doc_to_space
        }
        
        for doc_id, doc_chunks in self.documents.items():
            data["documents"][doc_id] = {
                "documentId": doc_chunks.documentId,
                "fileName": doc_chunks.fileName,
                "fileType": doc_chunks.fileType,
                "pageCount": doc_chunks.pageCount,
                "pages": [
                    {
                        "pageNumber": p.pageNumber,
                        "width": p.width,
                        "height": p.height,
                        "chunks": [
                            {
                                "id": c.id,
                                "text": c.text,
                                "document_id": c.document_id,
                                "page": c.page,
                                "bounds": {
                                    "x": c.bounds.x,
                                    "y": c.bounds.y,
                                    "width": c.bounds.width,
                                    "height": c.bounds.height
                                },
                                "embedding": c.embedding
                            }
                            for c in p.chunks
                        ]
                    }
                    for p in doc_chunks.pages
                ]
            }
        
        self.storage_path.write_text(json.dumps(data, indent=2))
    
    def _load(self):
        """Load from JSON file."""
        if not self.storage_path.exists():
            return
        
        try:
            data = json.loads(self.storage_path.read_text())
            self.doc_to_space = data.get("doc_to_space", {})
            
            for doc_id, doc_data in data.get("documents", {}).items():
                pages = []
                for p_data in doc_data.get("pages", []):
                    chunks = []
                    for c_data in p_data.get("chunks", []):
                        bounds_data = c_data.get("bounds", {})
                        chunk = Chunk(
                            id=c_data.get("id", ""),
                            text=c_data.get("text", ""),
                            document_id=c_data.get("document_id", doc_id),
                            page=c_data.get("page", 1),
                            bounds=ChunkBounds(
                                x=bounds_data.get("x", 0),
                                y=bounds_data.get("y", 0),
                                width=bounds_data.get("width", 0),
                                height=bounds_data.get("height", 0)
                            ),
                            embedding=c_data.get("embedding", None)
                        )
                        chunks.append(chunk)
                    
                    page_chunks = PageChunks(
                        pageNumber=p_data.get("pageNumber", 1),
                        width=p_data.get("width", 800),
                        height=p_data.get("height", 600),
                        chunks=chunks
                    )
                    pages.append(page_chunks)
                
                doc_chunks = DocumentChunks(
                    documentId=doc_data.get("documentId", doc_id),
                    fileName=doc_data.get("fileName", ""),
                    fileType=doc_data.get("fileType", ""),
                    pageCount=doc_data.get("pageCount", len(pages)),
                    pages=pages
                )
                self.documents[doc_id] = doc_chunks
                
        except Exception as e:
            print(f"Error loading chunk store: {e}")



