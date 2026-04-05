import autogen
import os

# Ensuring local connection bypasses any system proxies
os.environ['NO_PROXY'] = '127.0.0.1,localhost'
os.environ['HTTP_PROXY'] = ''
os.environ['HTTPS_PROXY'] = ''

# Ollama configuration for AutoGen
# Note: Using 'llama3' as verified in tags
config_list = [
    {
        "model": "gemma3:4b",
        "base_url": "http://127.0.0.1:11434/v1",
        "api_key": "NULL",
    }
]

# Create Assistant Agent
assistant = autogen.AssistantAgent(
    name="assistant",
    system_message="You are a helpful AI assistant that can read and write files on the local disk to help with the inventory management system. Use python code to interact with files when needed.",
    llm_config={
        "config_list": config_list,
        "timeout": 120, 
    },
)

# Create User Proxy Agent
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=5,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
    code_execution_config={
        "work_dir": "agent_workspace",
        "use_docker": False, # Directly use local system like the main assistant
    },
)

print("--- Starting AutoGen Chat ---")
# Create the workspace directory if it doesn't exist
import os
if not os.path.exists("agent_workspace"):
    os.makedirs("agent_workspace")

user_proxy.initiate_chat(
    assistant,
    message="Dost! check karo ke tumhare pas files ka access hai ya nahi. Current directory mein maujood files ki list dikhao aur ek nai file 'agent_test_ok.txt' banao jis mein 'HELLO FROM AI AGENT' likha ho. Kaam khatam kar ke 'TERMINATE' bol dena.",
)
