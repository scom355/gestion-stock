import requests
try:
    r = requests.post("http://127.0.0.1:11434/api/generate", json={"model": "gemma3:4b", "prompt": "hi", "stream": False}, timeout=10)
    print(r.status_code)
    print(r.json().get('response'))
except Exception as e:
    print(f"FAILED: {e}")
