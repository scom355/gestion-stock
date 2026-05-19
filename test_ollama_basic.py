import urllib.request
import json

url = "http://127.0.0.1:11434/api/generate"
data = json.dumps({"model": "gemma3:4b", "prompt": "hi", "stream": False}).encode('utf-8')

req = urllib.request.Request(url, data=data, method="POST")
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req, timeout=5) as response:
        res = json.loads(response.read().decode('utf-8'))
        print(f"SUCCESS: {res.get('response')}")
except Exception as e:
    print(f"FAILED: {e}")
