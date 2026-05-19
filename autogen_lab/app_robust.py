yimport os
import subprocess
import json

# Manual Agent Implementation to bypass networking issues
print("--- Starting Robust AI Agent (CURL Mode) ---")

def ask_ai(prompt):
    payload = {
        "model": "gemma3:4b",
        "prompt": prompt,
        "stream": False
    }
    # Using the native curl.exe which we verified works on your machine
    cmd = [
        'curl.exe', '-s', '-X', 'POST', 
        'http://127.0.0.1:11434/api/generate',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps(payload)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get('response', 'No response')
        else:
            return f"Error: {result.stderr}"
    except Exception as e:
        return f"Local Connection Error: {e}"

# The Test Task
task = "Dost! check karo ke tumhare pas files ka access hai ya nahi. Current directory mein maujood files ki list dikhao aur ek nai file 'agent_test_ok.txt' banao jis mein 'HELLO FROM AI AGENT' likha ho."

print(f"\nUser Proxy: {task}")
print("\nThinking...")

# Get AI instruction
# We ask it specifically to give us python code to run
response = ask_ai(f"I want to: {task}. Please give me ONLY the python code to do this, no explanation.")
print(f"\nAI Agent Response:\n{response}")

# Clean and execute the code if it looks like python
if "import" in response or "open(" in response:
    # Filter out markdown backticks if any
    clean_code = response.replace("```python", "").replace("```", "").strip()
    print("\nExecuting Code...")
    try:
        exec(clean_code)
        print("✅ Code executed successfully!")
        if os.path.exists("agent_test_ok.txt"):
            print("🚀 'agent_test_ok.txt' has been created!")
    except Exception as e:
        print(f"❌ Execution Error: {e}")
else:
    print("⚠️ Agent did not return valid code.")

print("\n--- Session Finished ---")
