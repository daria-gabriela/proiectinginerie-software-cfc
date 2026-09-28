
import fitz
from docx import Document as DocxDocument
from pptx import Presentation
from dataclasses import dataclass
from pathlib import Path
from tokenizers import Tokenizer

tokenizer = Tokenizer.from_pretrained("cross-encoder/ms-marco-MiniLM-L6-v2")
MAX_CHUNK_TOKENS = 400


@dataclass
class Chunk:
    text: str
    document_id: str
    page: int
    space_id: str = None


def parse_document(file_path: str, document_id: str = None) -> list[Chunk]:
    path = Path(file_path)
    suffix = path.suffix.lower()
    
    if suffix == ".pdf":
        return parse_pdf(file_path, document_id)
    elif suffix == ".docx":
        return parse_docx(file_path, document_id)
    elif suffix == ".pptx":
        return parse_pptx(file_path, document_id)
    elif suffix == ".txt":
        return parse_txt(file_path, document_id)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def chunk_texts(texts: list[str], document_id: str, page_numbers: list[int]) -> list[Chunk]:
    if not texts:
        return []
    
    encodings = tokenizer.encode_batch(texts)
    
    chunks = []
    for idx, (encoding, page_num) in enumerate(zip(encodings, page_numbers)):
        tokens = encoding.ids
        original_text = texts[idx]
        
        if len(tokens) <= MAX_CHUNK_TOKENS:
            chunks.append(Chunk(text=original_text.strip(), document_id=document_id, page=page_num))
        else:
            for i in range(0, len(tokens), MAX_CHUNK_TOKENS):
                chunk_tokens = tokens[i:i + MAX_CHUNK_TOKENS]
                chunk_text = tokenizer.decode(chunk_tokens, skip_special_tokens=True)
                chunks.append(Chunk(text=chunk_text.strip(), document_id=document_id, page=page_num))
    
    return chunks


def parse_pdf(file_path: str, document_id: str) -> list[Chunk]:
    doc = fitz.open(file_path)
    
    texts = []
    page_numbers = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if text:
            texts.append(text)
            page_numbers.append(page_num)
    
    doc.close()
    return chunk_texts(texts, document_id, page_numbers)


def parse_docx(file_path: str, document_id: str) -> list[Chunk]:
    doc = DocxDocument(file_path)
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if not full_text.strip():
        return []
    return chunk_texts([full_text], document_id, [1])


def parse_pptx(file_path: str, document_id: str) -> list[Chunk]:
    prs = Presentation(file_path)
    
    texts = []
    slide_numbers = []
    for slide_num, slide in enumerate(prs.slides, start=1):
        slide_texts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                slide_texts.append(shape.text.strip())
        
        if slide_texts:
            texts.append("\n".join(slide_texts))
            slide_numbers.append(slide_num)
    
    return chunk_texts(texts, document_id, slide_numbers)


def parse_txt(file_path: str, document_id: str) -> list[Chunk]:
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    if not text.strip():
        return []
    return chunk_texts([text], document_id, [1])
