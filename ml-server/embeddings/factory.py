"""
Factory for creating embedder and reranker instances.

Uses environment variables to determine which model backend to use:
- EMBEDDER_MODEL: "minilm" (default) or "qwen3-vl"
- RERANKER_MODEL: "minilm" (default) or "qwen3-vl"

Example:
    # Use default (MiniLM)
    embedder = get_embedder()
    
    # Use Qwen3-VL for multimodal
    embedder = get_embedder("qwen3-vl")
    
    # Or set via environment
    export EMBEDDER_MODEL=qwen3-vl
    embedder = get_embedder()  # Will use Qwen3-VL
"""

import os
import logging
from typing import Optional, Literal

from .base import BaseEmbedder, BaseReranker

logger = logging.getLogger(__name__)

ModelType = Literal["minilm", "qwen3-vl"]


# Singleton instances (lazy loaded)
_embedder_instance: Optional[BaseEmbedder] = None
_reranker_instance: Optional[BaseReranker] = None


def get_embedder(
    model_type: Optional[ModelType] = None,
    force_reload: bool = False,
) -> BaseEmbedder:
    """
    Get an embedder instance.
    
    Args:
        model_type: "minilm" or "qwen3-vl". If None, uses EMBEDDER_MODEL env var.
        force_reload: If True, creates a new instance even if one exists.
        
    Returns:
        BaseEmbedder instance
    """
    global _embedder_instance
    
    # Use env var if not specified
    if model_type is None:
        model_type = os.getenv("EMBEDDER_MODEL", "minilm").lower()
    
    # Check if we need to reload
    if _embedder_instance is not None and not force_reload:
        # Check if it's the right type
        current_is_qwen = "qwen" in _embedder_instance.name.lower()
        want_qwen = model_type == "qwen3-vl"
        if current_is_qwen == want_qwen:
            return _embedder_instance
    
    logger.info(f"Creating embedder: {model_type}")
    
    if model_type == "qwen3-vl":
        from .qwen_vl import Qwen3VLEmbedder
        _embedder_instance = Qwen3VLEmbedder()
    else:
        from .minilm import MiniLMEmbedder
        _embedder_instance = MiniLMEmbedder()
    
    logger.info(f"Embedder ready: {_embedder_instance.name} ({_embedder_instance.embedding_dimension}D)")
    return _embedder_instance


def get_reranker(
    model_type: Optional[ModelType] = None,
    force_reload: bool = False,
) -> BaseReranker:
    """
    Get a reranker instance.
    
    Args:
        model_type: "minilm" or "qwen3-vl". If None, uses RERANKER_MODEL env var.
        force_reload: If True, creates a new instance even if one exists.
        
    Returns:
        BaseReranker instance
    """
    global _reranker_instance
    
    # Use env var if not specified
    if model_type is None:
        model_type = os.getenv("RERANKER_MODEL", "minilm").lower()
    
    # Check if we need to reload
    if _reranker_instance is not None and not force_reload:
        current_is_qwen = "qwen" in _reranker_instance.name.lower()
        want_qwen = model_type == "qwen3-vl"
        if current_is_qwen == want_qwen:
            return _reranker_instance
    
    logger.info(f"Creating reranker: {model_type}")
    
    if model_type == "qwen3-vl":
        from .qwen_vl import Qwen3VLReranker
        _reranker_instance = Qwen3VLReranker()
    else:
        from .minilm import MiniLMReranker
        _reranker_instance = MiniLMReranker()
    
    logger.info(f"Reranker ready: {_reranker_instance.name}")
    return _reranker_instance


def get_model_info() -> dict:
    """Get information about currently loaded models."""
    info = {
        "embedder": None,
        "reranker": None,
    }
    
    if _embedder_instance:
        info["embedder"] = {
            "name": _embedder_instance.name,
            "supports_images": _embedder_instance.supports_images,
            "dimension": _embedder_instance.embedding_dimension,
            "device": _embedder_instance.device,
        }
    
    if _reranker_instance:
        info["reranker"] = {
            "name": _reranker_instance.name,
            "supports_images": _reranker_instance.supports_images,
            "device": _reranker_instance.device,
        }
    
    return info
