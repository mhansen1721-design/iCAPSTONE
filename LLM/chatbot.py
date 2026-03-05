import json
from transformers import pipeline

# 1. Load the Qwen model (1.5B is small enough for most CPUs/8GB RAM)
# Using "auto" device map will default to CPU if no GPU is found
generator = pipeline(
    "text-generation", 
    model="Qwen/Qwen2.5-1.5B-Instruct", 
    device_map="auto"
)

# 2. Your JSON Input Data
raw_data =  { 
    "patient_id": "P001",
  "user_input": "I don't know you. Why are you talking to me?",
  "patient_info": {"name": "John Doe", "companion_figure": "your companion", "safe_topics": ["Jazz music"]},
  "chat_history": [{"role": "assistant", "content": "Hello John, it's a beautiful day."}, {"role": "user", "content": "Who said that?"}],
  "detected_tier": 1
}

input2 = {
  "patient_id": "P001",
  "user_input": "I need to leave. My shift starts at 8 AM.",
  "patient_info": {"memories": ["Former Carpenter"], "safe_topics": ["Woodworking"]},
  "chat_history": [{"role": "user", "content": "Where is my tool belt?"}],
  "detected_tier": 1
}

input3 = {
  "patient_id": "P001",
  "user_input": "Where is the bathroom? I'm lost in this house.",
  "patient_info": {"name": "John Doe", "companion_figure": "your companion"},
  "chat_history": [{"role": "user", "content": "I stood up but I don't know where to go."}],
  "detected_tier": 1
}
input4= {
  "patient_id": "P001",
  "user_input": "Is it 1995? I need to call my wife.",
  "patient_info": {"name": "John Doe", "safe_topics": ["Louis Armstrong"]},
  "chat_history": [{"role": "assistant", "content": "We were just talking about music."}, {"role": "user", "content": "I forgot what year it is."}],
  "detected_tier": 1
}
input5= {
  "patient_id": "P001",
  "user_input": "What is this place? This isn't my home.",
  "patient_info": {"name": "John Doe", "companion_figure": "your companion"},
  "chat_history": [{"role": "user", "content": "Everything looks different today."}],
  "detected_tier": 1
}
Input6= {
  "patient_id": "P001",
  "user_input": "I'm so frustrated! I can't remember anything!",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "assistant", "content": "Can you tell me about your day?"}, {"role": "user", "content": "I... I don't know. I can't think!"}],
  "detected_tier": 2
}

Input7= {
  "patient_id": "P001",
  "user_input": "I feel so scared. The house is making noises.",
  "patient_info": {"triggers": ["Loud noises"]},
  "chat_history": [{"role": "user", "content": "Did you hear that bang?"}],
  "detected_tier": 2
}

Input8= {
  "patient_id": "P001",
  "user_input": "I'm just a burden to everyone. They'd be better off without me.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "My kids haven't called in a week."}],
  "detected_tier": 2
}

Input9= {
  "patient_id": "P001",
  "user_input": "I want to go home. I'm crying and I can't stop.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "assistant", "content": "I'm here for you."}, {"role": "user", "content": "I just miss everything so much."}],
  "detected_tier": 2
}







  



# 3. Helper function to minify JSON for token efficiency
def to_compact_json(data):
    return json.dumps(data, separators=(',', ':'))

compact_input = to_compact_json(Input9)

# 4. Create a prompt that forces JSON output
# Assuming compact_input is defined elsewhere
compact_input = '{"user_input": "I am feeling confused about who I am today"}'

prompt = f"""<|im_start|>system
You are a diagnostic assistant. Your output must be a single JSON object.
Do not include any text before or after the JSON.

REQUIRED SCHEMA:
{{
  "response_text": "string (Empathetic message)",
  "ui_signal": "string (REDIRECT, NONE, or ALERT)",
  "log_entry": "string (Classification tag)"
}}
<|im_end|>
<|im_start|>user
Analyze this input and return the diagnostic JSON:
{compact_input}<|im_end|>
<|im_start|>assistant
"""

# 5. Generate the response
output = generator(prompt, max_new_tokens=150, return_full_text=False)
response_text = output[0]['generated_text']

print(response_text)