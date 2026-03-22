import autogen

# Ollama configuration for AutoGen
# Note: Using 'llama3' as verified in tags
config_list = [
    {
        "model": "llama3",
        "api_base": "http://localhost:11434/v1",
        "api_key": "NULL",
    }
]

# Create Assistant Agent
assistant = autogen.AssistantAgent(
    name="assistant",
    llm_config={
        "config_list": config_list,
        "request_timeout": 120, # Increased timeout for local LLM
    },
)

# Create User Proxy Agent
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=2,
    is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
    code_execution_config=False, # Disable code execution for first test to avoid complex setup
)

print("--- Starting AutoGen Chat ---")
user_proxy.initiate_chat(
    assistant,
    message="",
)
