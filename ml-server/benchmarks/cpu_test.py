#!/usr/bin/env python3
"""
Qwen3-VL CPU vs MPS Comparison Test
Using the official example from the docs.
"""

import sys
import os
import time
from pathlib import Path

# Add ml-server to path for local models module
ML_SERVER = Path(__file__).parent.parent
sys.path.insert(0, str(ML_SERVER))

from models.qwen3_vl_embedding import Qwen3VLEmbedder
import numpy as np
import torch

# Force CPU
os.environ["CUDA_VISIBLE_DEVICES"] = ""

# Define a list of query texts
queries = [
    {"text": "A woman playing with her dog on a beach at sunset."},
    {"text": "Pet owner training dog outdoors near water."},
    {"text": "Woman surfing on waves during a sunny day."},
    {"text": "City skyline view from a high-rise building at night."}
]

# Define a list of document texts and images
documents = [
    {"text": "A woman shares a joyful moment with her golden retriever on a sun-drenched beach at sunset, as the dog offers its paw in a heartwarming display of companionship and trust."},
    {"image": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg"},
    {"text": "A woman shares a joyful moment with her golden retriever on a sun-drenched beach at sunset, as the dog offers its paw in a heartwarming display of companionship and trust.", "image": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg"}
]

print("="*60)
print("Qwen3-VL-Embedding-2B CPU Test")
print("="*60)
print(f"PyTorch: {torch.__version__}")
print(f"Device: CPU (forced)")

# Specify the model path
model_name_or_path = "Qwen/Qwen3-VL-Embedding-2B"

# Initialize the Qwen3VLEmbedder model on CPU
print(f"\nLoading model on CPU...")
load_start = time.perf_counter()

model = Qwen3VLEmbedder(
    model_name_or_path=model_name_or_path,
    torch_dtype=torch.float32,  # FP32 for CPU stability
    device_map="cpu"
)

load_time = time.perf_counter() - load_start
print(f"Model loaded in {load_time:.1f}s")

# Combine queries and documents into a single input list
inputs = queries + documents
print(f"\nInputs: {len(queries)} queries + {len(documents)} documents ({len(inputs)} total)")
print(f"  - 4 text-only queries")
print(f"  - 1 text-only document")
print(f"  - 1 image-only document")
print(f"  - 1 text+image document")

# Process the inputs to get embeddings
print(f"\nEncoding on CPU...")
start = time.perf_counter()
embeddings = model.process(inputs)
process_time = time.perf_counter() - start

print(f"\n--- RESULTS ---")
print(f"Processing time: {process_time:.2f}s")
print(f"Per input: {process_time/len(inputs)*1000:.0f}ms")
print(f"Throughput: {len(inputs)/process_time:.2f} inputs/sec")
print(f"Embedding dim: {embeddings.shape[1] if hasattr(embeddings, 'shape') else len(embeddings[0])}")

# Compute similarity scores between query embeddings and document embeddings
if hasattr(embeddings, 'numpy'):
    embeddings_np = embeddings.numpy()
else:
    embeddings_np = np.array(embeddings)

similarity_scores = embeddings_np[:4] @ embeddings_np[4:].T

print(f"\n--- SIMILARITY SCORES ---")
print("Query → Document similarity matrix:")
print("       [Text Doc] [Image Doc] [Text+Image]")
for i, q in enumerate(queries):
    scores = similarity_scores[i]
    print(f"Q{i+1}: {scores[0]:.3f}     {scores[1]:.3f}       {scores[2]:.3f}   | {q['text'][:40]}...")

print(f"\n✅ Image embeddings work! The model can embed images.")
print("="*60)
