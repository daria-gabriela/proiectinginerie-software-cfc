import sys
import os

# Ensure we can import from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from vector_search import VectorSearch
from chunk_model import Chunk
from search import rerank_chunks

def test_integration():
    print("Initializing Vector Search Engine...")
    engine = VectorSearch()
    
    # Create dummy chunks
    chunks = [
        Chunk(text="The capital of France is Paris.", document_id="doc1", page=1),
        Chunk(text="Python is a popular programming language.", document_id="doc2", page=1),
        Chunk(text="The Eiffel Tower is located in Paris.", document_id="doc1", page=2),
        Chunk(text="Machine learning uses statistical models.", document_id="doc3", page=1),
        Chunk(text="Apples are a type of fruit.", document_id="doc4", page=1),
    ]
    
    print(f"Created {len(chunks)} chunks.")
    
    # 1. Generate Embeddings
    print("Generating embeddings...")
    engine.encode_chunks(chunks)
    
    # Verify embeddings
    for i, c in enumerate(chunks):
        if c.embedding is None or len(c.embedding) == 0:
            print(f"ERROR: Chunk {i} has no embedding!")
            return
        # print(f"Chunk {i} embedding length: {len(c.embedding)}")
    print("Embeddings generated successfully.")
    
    # 2. Perform Vector Search (Retriever)
    query = "Where is the Eiffel Tower?"
    print(f"\nQuery: '{query}'")
    
    print("Running Vector Search (Top 3)...")
    vector_results = engine.search(query, chunks, top_k=3)
    
    print("\nVector Search Results:")
    for c, score in vector_results:
        print(f" - [{score:.4f}] {c.text}")
        
    # Check if expected result is in top results
    expected_text = "The Eiffel Tower is located in Paris."
    found = any(c.text == expected_text for c, _ in vector_results)
    
    if found:
        print("PASS: Relevant chunk found in vector search results.")
    else:
        print("FAIL: Relevant chunk NOT found in vector search results.")
        
    # 3. Perform Re-ranking
    print("\nRunning Cross-Encoder Reranking...")
    rerank_results = rerank_chunks(query, [c for c, _ in vector_results], top_k=1)
    
    print("\nReranked Top 1:")
    for c, score in rerank_results:
        print(f" - [{score:.4f}] {c.text}")
        
    if rerank_results[0][0].text == expected_text:
        print("PASS: Most relevant chunk is top 1 after reranking.")
    else:
        print("FAIL: Reranking didn't surface the expected chunk as top 1.")

if __name__ == "__main__":
    test_integration()
