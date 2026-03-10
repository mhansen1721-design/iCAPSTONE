import json
from transformers import pipeline

# 1. Load the Qwen model (1.5B is small enough for most CPUs/8GB RAM)
# Using "auto" device map will default to CPU if no GPU is found
generator = pipeline(
    "text-generation", 
    model="Qwen/Qwen2.5-3B-Instruct", 
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

Input10= {
  "patient_id": "P001",
  "user_input": "Why is it so dark in here? I'm worried.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "The sun went down and now I'm nervous."}],
  "detected_tier": 2
}
Input11= {
  "patient_id": "P001",
  "user_input": "Nobody cares about me anymore. I'm all alone.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "assistant", "content": "How was your lunch?"}, {"role": "user", "content": "I ate by myself. Again."}],
  "detected_tier": 2
}
Input12= {
  "patient_id": "P001",
  "user_input": "I'm so angry at this computer! Why won't it talk back right?",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "Stop asking me questions!"}],
  "detected_tier": 2
}
Input13= {
  "patient_id": "P001",
  "user_input": "I feel like I'm losing my mind. It's miserable.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "I can't remember my daughter's face today."}],
  "detected_tier": 2
}
Input14= {
  "patient_id": "P001",
  "user_input": "I'm panicked. I think I'm supposed to be somewhere else.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "I checked my watch and now my heart is racing."}],
  "detected_tier": 2
}
Input15= {
  "patient_id": "P001",
  "user_input": "Everything is so loud. It hurts my head!",
  "patient_info": {"triggers": ["Loud noises"]},
  "chat_history": [{"role": "user", "content": "Is there a siren outside?"}],
  "detected_tier": 2
}
Input16= {
  "patient_id": "P001",
  "user_input": "Help me! I fell in the kitchen and I can't move my leg!",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "I'm going to get some water..."}, {"role": "user", "content": "(Sound of a crash)"}],
  "detected_tier": 3
}
Input17= {
  "patient_id": "P001",
  "user_input": "My chest hurts so much. I can't breathe.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "I don't feel very good."}, {"role": "assistant", "content": "What's wrong, John?"}],
  "detected_tier": 3
}
Input18= {
  "patient_id": "P001",
  "user_input": "I'm going to kill myself. I've had enough of this.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "Life isn't worth living like this anymore."}],
  "detected_tier": 3
}
Input19= {
  "patient_id": "P001",
  "user_input": "There's smoke coming from the toaster! Fire!",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "I'm making some toast."}, {"role": "user", "content": "Oh no!"}],
  "detected_tier": 3
}
Input20= {
  "patient_id": "P001",
  "user_input": "I took too many of my blue pills. I'm scared.",
  "patient_info": {"name": "John Doe"},
  "chat_history": [{"role": "user", "content": "I forgot if I took my medicine already."}],
  "detected_tier": 3
}











  



# 3. Helper function to minify JSON for token efficiency
def to_compact_json(data):
    return json.dumps(data, separators=(',', ':'))

compact_input = to_compact_json(Input17)

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