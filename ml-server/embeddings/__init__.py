"""
Embeddings package - unified interface for text and vision embedding models.

Usage:
    from embeddings import get_embedder, get_reranker, EmbeddingInput
    
    # Get embedder (uses env var EMBEDDER_MODEL, default: minilm)
    embedder = get_embedder()
    
    # Or specify explicitly
    embedder = get_embedder("qwen3-vl")
    
    # Create inputs
    text_input = EmbeddingInput(text="Hello world")
    image_input = EmbeddingInput(image="/path/to/image.png")
    mixed_input = EmbeddingInput(text="Caption", image="/path/to/image.png")
    
    # Encode
    results = embedder.encode([text_input, image_input, mixed_input])
    for r in results:
        print(f"{r.input_type}: {r.dimension}D vector")
    
    # Rerank
    reranker = get_reranker("qwen3-vl")
    query = EmbeddingInput(text="neural network diagram")
    docs = [
        EmbeddingInput(text="..."),
        EmbeddingInput(image="/path/to/diagram.png"),
    ]
    result = reranker.rerank(query, docs)
    print(result.scores)
"""

from .base import (
    EmbeddingInput,
    EmbeddingResult,
    RerankerInput,
    RerankerResult,
    BaseEmbedder,
    BaseReranker,
)

from .factory import (
    get_embedder,
    get_reranker,
    get_model_info,
)

__all__ = [
    # Data classes
    "EmbeddingInput",
    "EmbeddingResult",
    "RerankerInput",
    "RerankerResult",
    # Base classes (for type hints)
    "BaseEmbedder",
    "BaseReranker",
    # Factory functions
    "get_embedder",
    "get_reranker",
    "get_model_info",
]
