#!/usr/bin/env python3
"""
Qwen3-VL Embedding Speed Optimization Benchmark

Tests different optimization techniques to maximize speed on Apple Silicon:
1. FP16 (baseline on MPS)
2. torch.compile() optimization
3. Reduced embedding dimension (MRL)
4. Batch size optimization

Usage:
    cd /Users/geo/facultate/proiect-inginerie-software-cfc/ml-server
    python benchmarks/qwen3_vl_benchmark.py --chunks 100 --device mps
"""

import argparse
import time
import sys
import os
from pathlib import Path

# Add ml-server to path for local models module
ML_SERVER = Path(__file__).parent.parent
sys.path.insert(0, str(ML_SERVER))


def generate_realistic_chunks(n: int, target_tokens: int = 400) -> list[dict]:
    """Generate chunks closer to real StudySync size (~400 tokens)."""
    import random
    
    # Longer academic text fragments
    paragraphs = [
        "Machine learning algorithms optimize complex decision boundaries through iterative gradient descent procedures that minimize loss functions over large datasets. These algorithms learn from examples and adjust their parameters to improve prediction accuracy on unseen data.",
        "Neural networks are computational models inspired by biological neural systems, consisting of interconnected layers of artificial neurons with learnable weights and biases. Deep neural networks with multiple hidden layers can learn hierarchical representations of data.",
        "Natural language processing combines computational linguistics with machine learning to enable computers to understand, interpret, and generate human language. Modern NLP systems use transformer architectures and large language models pre-trained on massive text corpora.",
        "Computer vision systems extract meaningful information from digital images and videos using convolutional neural networks that learn to detect edges, textures, objects, and semantic concepts through hierarchical feature extraction.",
        "Reinforcement learning agents learn optimal decision-making policies through trial and error interactions with their environment, maximizing cumulative rewards over time using techniques like Q-learning and policy gradient methods.",
        "Transformer architectures revolutionized sequence modeling by introducing self-attention mechanisms that allow the model to weigh the importance of different parts of the input when generating each output element.",
    ]
    
    chunks = []
    for i in range(n):
        # Combine 3-5 paragraphs to get ~400 tokens
        num_paras = random.randint(3, 5)
        text = " ".join(random.choices(paragraphs, k=num_paras))
        chunks.append({"text": text})
    
    return chunks


def benchmark_baseline(model, chunks, device):
    """Baseline: Standard inference."""
    print("\n--- [TEST 1] Baseline FP16 Inference ---")
    
    start = time.perf_counter()
    embeddings = model.process(chunks)
    total_time = time.perf_counter() - start
    
    print(f"  Time: {total_time:.2f}s")
    print(f"  Throughput: {len(chunks)/total_time:.2f} chunks/sec")
    print(f"  Per chunk: {total_time/len(chunks)*1000:.1f}ms")
    
    return total_time, embeddings


def benchmark_with_compile(model, chunks, device):
    """Test with torch.compile() for potential speedup."""
    import torch
    
    print("\n--- [TEST 2] torch.compile() Optimization ---")
    
    # Check if MPS supports compile
    if device == "mps":
        print("  ⚠️ torch.compile() has limited MPS support, trying anyway...")
    
    try:
        # Compile the model
        compiled_model = torch.compile(model.model, mode="reduce-overhead")
        model.model = compiled_model
        
        # Warmup run
        print("  Warmup run...")
        _ = model.process(chunks[:5])
        
        start = time.perf_counter()
        embeddings = model.process(chunks)
        total_time = time.perf_counter() - start
        
        print(f"  Time: {total_time:.2f}s")
        print(f"  Throughput: {len(chunks)/total_time:.2f} chunks/sec")
        
        return total_time, embeddings
    except Exception as e:
        print(f"  ✗ torch.compile() failed: {e}")
        return None, None


def benchmark_reduced_dim(model, chunks, target_dim=512):
    """Test with reduced embedding dimensions (MRL)."""
    print(f"\n--- [TEST 3] Reduced Embedding Dim ({target_dim}) ---")
    
    start = time.perf_counter()
    embeddings = model.process(chunks)
    total_time = time.perf_counter() - start
    
    # Truncate to target dimension (MRL support)
    if hasattr(embeddings, 'shape'):
        truncated = embeddings[:, :target_dim]
        print(f"  Original dim: {embeddings.shape[1]}, Truncated to: {truncated.shape[1]}")
    else:
        truncated = [e[:target_dim] for e in embeddings]
        print(f"  Truncated to {target_dim} dimensions")
    
    print(f"  Time: {total_time:.2f}s (same as baseline - truncation is post-processing)")
    print(f"  Storage savings: {(1 - target_dim/2048)*100:.0f}% smaller vectors")
    
    return total_time, truncated


def benchmark_batch_sizes(model, chunks, device):
    """Find optimal batch size."""
    import torch
    
    print("\n--- [TEST 4] Batch Size Optimization ---")
    
    batch_sizes = [1, 4, 8, 16, 32]
    results = {}
    
    for bs in batch_sizes:
        try:
            # Clear cache
            if device == "mps":
                torch.mps.empty_cache()
            
            start = time.perf_counter()
            all_embeddings = []
            
            for i in range(0, len(chunks), bs):
                batch = chunks[i:i+bs]
                emb = model.process(batch)
                all_embeddings.append(emb)
            
            total_time = time.perf_counter() - start
            throughput = len(chunks) / total_time
            results[bs] = throughput
            
            print(f"  Batch {bs:2d}: {throughput:.2f} chunks/sec ({total_time:.2f}s)")
            
        except Exception as e:
            print(f"  Batch {bs:2d}: Failed - {e}")
            break
    
    if results:
        best_bs = max(results, key=results.get)
        print(f"\n  ✓ Best batch size: {best_bs} ({results[best_bs]:.2f} chunks/sec)")
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Qwen3-VL Speed Optimization Benchmark")
    parser.add_argument("--chunks", type=int, default=100, help="Number of chunks")
    parser.add_argument("--device", type=str, default="mps", choices=["cpu", "mps", "cuda"])
    parser.add_argument("--skip-compile", action="store_true", help="Skip torch.compile test")
    args = parser.parse_args()
    
    print("="*60)
    print("Qwen3-VL-Embedding Speed Optimization Benchmark")
    print("="*60)
    print(f"Chunks: {args.chunks} (realistic ~400 tokens each)")
    print(f"Device: {args.device}")
    
    import torch
    print(f"\nPyTorch: {torch.__version__}")
    
    # Import model
    print("\nLoading Qwen3VLEmbedder...")
    try:
        from models.qwen3_vl_embedding import Qwen3VLEmbedder
    except ImportError:
        print("Error: Run from ml-server directory: cd ml-server && python benchmarks/qwen3_vl_benchmark.py")
        sys.exit(1)
    
    # Load model
    model_name = "Qwen/Qwen3-VL-Embedding-2B"
    print(f"Loading {model_name}...")
    
    load_start = time.perf_counter()
    model = Qwen3VLEmbedder(
        model_name_or_path=model_name,
        torch_dtype=torch.float16,
    )
    if args.device == "mps":
        model.model = model.model.to("mps")
    load_time = time.perf_counter() - load_start
    print(f"Model loaded in {load_time:.1f}s")
    
    # Generate test chunks
    print(f"\nGenerating {args.chunks} realistic chunks (~400 tokens each)...")
    chunks = generate_realistic_chunks(args.chunks)
    
    # Count actual tokens
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    token_counts = [len(tokenizer.encode(c["text"])) for c in chunks]
    print(f"Avg tokens/chunk: {sum(token_counts)/len(token_counts):.0f}")
    print(f"Total tokens: {sum(token_counts)}")
    
    # Run benchmarks
    results = {}
    
    # Test 1: Baseline
    t1, emb1 = benchmark_baseline(model, chunks, args.device)
    results["baseline"] = t1
    
    # Test 2: torch.compile (optional)
    if not args.skip_compile:
        t2, emb2 = benchmark_with_compile(model, chunks, args.device)
        if t2:
            results["compiled"] = t2
    
    # Test 3: Reduced dimensions (informational)
    benchmark_reduced_dim(model, chunks, target_dim=512)
    
    # Test 4: Batch size optimization
    batch_results = benchmark_batch_sizes(model, chunks, args.device)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    baseline_throughput = args.chunks / results["baseline"]
    print(f"\n📊 Your Mac's Qwen3-VL-Embedding-2B Performance:")
    print(f"   Throughput: {baseline_throughput:.2f} chunks/sec")
    print(f"   Per 400-token chunk: {results['baseline']/args.chunks*1000:.0f}ms")
    
    print(f"\n⏱️ Estimated indexing times:")
    for n in [100, 500, 1000]:
        est_time = n / baseline_throughput
        print(f"   {n:4d} chunks: {est_time:.0f} sec ({est_time/60:.1f} min)")
    
    # Memory
    if args.device == "mps":
        try:
            mem = torch.mps.current_allocated_memory() / 1e9
            print(f"\n💾 MPS Memory: {mem:.2f} GB")
        except:
            pass
    
    print("\n" + "="*60)


if __name__ == "__main__":
    main()
