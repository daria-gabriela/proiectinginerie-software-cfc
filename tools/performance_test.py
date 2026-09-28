import requests
import time
import os
import concurrent.futures
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Configuration
BASE_URL = "http://localhost:8080/api"
EMAIL = "perf_test_user_v1@example.com"
PASSWORD = "Password123!"
PDF_FILENAME = "test_50_pages.pdf"
NUM_PAGES = 50

def generate_pdf(filename, pages):
    print(f"Generating {pages}-page PDF: {filename}...")
    c = canvas.Canvas(filename, pagesize=letter)
    for i in range(pages):
        c.drawString(100, 750, f"Page {i+1}")
        c.drawString(100, 700, f"This is some dummy content for page {i+1}. " * 20)
        c.drawString(100, 650, "Random keyword for search: stress_test_keyword")
        c.showPage()
    c.save()
    print("PDF generation complete.")

def get_auth_token():
    # Try to login first
    login_payload = {"email": EMAIL, "password": PASSWORD}
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if resp.status_code == 200:
            return resp.text.strip()
    except Exception as e:
        print(f"Login failed (might not exist yet): {e}")

    # Register if login fails
    print("Registering new user...")
    register_payload = {
        "firstName": "Perf",
        "lastName": "Test",
        "email": EMAIL,
        "password": PASSWORD
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload)
    if resp.status_code == 200:
        return resp.text.strip()
    
    # If register fails (e.g., already exists but login failed for some reason), try login again
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if resp.status_code == 200:
        return resp.text.strip()
        
    raise Exception(f"Auth failed: {resp.text}")

def create_space(token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "Perf Test Space", "description": "Space for stress testing"}
    resp = requests.post(f"{BASE_URL}/spaces", json=payload, headers=headers)
    if resp.status_code in [200, 201]:
        return resp.json()["id"]
    raise Exception(f"Failed to create space: {resp.text}")

def upload_document(token, space_id, filepath):
    headers = {"Authorization": f"Bearer {token}"}
    files = {'file': open(filepath, 'rb')}
    start_time = time.time()
    resp = requests.post(f"{BASE_URL}/spaces/{space_id}/documents", headers=headers, files=files)
    if resp.status_code not in [200, 201]:
        raise Exception(f"Upload failed: {resp.text}")
    print("Upload completed.")
    return resp.json()["id"]

def poll_indexing(token, document_id):
    headers = {"Authorization": f"Bearer {token}"}
    start_time = time.time()
    print("Polling for indexing status...")
    while True:
        resp = requests.get(f"{BASE_URL}/documents/{document_id}", headers=headers)
        if resp.status_code != 200:
            print(f"Error checking status: {resp.status_code}")
            time.sleep(1)
            continue
            
        doc = resp.json()
        if doc["indexed"]:
            end_time = time.time()
            return end_time - start_time
        
        if doc.get("processingError"):
            raise Exception(f"Indexing failed: {doc['processingError']}")
            
        if time.time() - start_time > 60:
            raise Exception("Indexing timed out (> 60s)")
            
        time.sleep(1)

def run_concurrent_search(token, space_id, num_requests=10):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"query": "stress_test_keyword", "topK": 5}
    url = f"{BASE_URL}/spaces/{space_id}/search"
    
    print(f"Starting {num_requests} concurrent searches...")
    
    def search_request():
        try:
            start = time.time()
            r = requests.post(url, json=payload, headers=headers)
            duration = time.time() - start
            return r.status_code == 200, duration
        except Exception as e:
            return False, 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
        futures = [executor.submit(search_request) for _ in range(num_requests)]
        results = [f.result() for f in futures]
        
    successes = [r for r in results if r[0]]
    failures = [r for r in results if not r[0]]
    max_duration = max([r[1] for r in results]) if results else 0
    
    return len(successes), len(failures), max_duration

def main():
    try:
        # 1. Generate Data
        generate_pdf(PDF_FILENAME, NUM_PAGES)
        
        # 2. Auth
        token = get_auth_token()
        print("Authenticated.")
        
        # 3. Setup Space
        space_id = create_space(token)
        print(f"Created space: {space_id}")
        
        # 4. Bench 1: Indexing Speed
        print("\n--- Benchmark 1: Indexing Speed ---")
        doc_id = upload_document(token, space_id, PDF_FILENAME)
        indexing_time = poll_indexing(token, doc_id)
        print(f"Indexing Time: {indexing_time:.2f}s")
        
        if indexing_time < 30:
            print("✅ PASS: Indexing < 30s")
        else:
            print("❌ FAIL: Indexing > 30s")
            
        # 5. Bench 2: Concurrency
        print("\n--- Benchmark 2: Concurrent Search ---")
        success, fail, max_lat = run_concurrent_search(token, space_id, 10)
        print(f"Success: {success}, Fail: {fail}, Max Latency: {max_lat:.2f}s")
        
        if fail == 0:
            print("✅ PASS: No timeouts/failures")
        else:
            print("❌ FAIL: Some requests failed")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        if os.path.exists(PDF_FILENAME):
            os.remove(PDF_FILENAME)

if __name__ == "__main__":
    main()
