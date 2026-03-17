import json
from transformers import pipeline

# 1. Load a different LLM (Using Llama 3.2 3B as an example alternative to Qwen)
# Note: If you don't have access to Llama, you can swap this for "mistralai/Mistral-7B-Instruct-v0.2"
generator = pipeline(
    "text-generation", 
    model="meta-llama/Llama-3.2-3B-Instruct", 
    device_map="auto"
)

# 2. Define the exact JSON schema your React dashboard expects
# Using the specific Llama prompt format (<|start_header_id|>, etc.)
prompt = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a medical data generator for a dementia care app. 
Your output must be a single, valid JSON object.
Do not include any text before or after the JSON, and do not use markdown blocks.

REQUIRED SCHEMA:
{
  "patients": [
    {
      "patient_id": "string (e.g., 'P001')",
      "full_name": "string",
      "avatarType": "string (e.g., 'jellyfish', 'fox', 'owl')",
      "dementia_stage": "string (e.g., 'Mild Cognitive Impairment', 'Moderate', 'Severe')",
      "authorized_users": ["string (emails of caregivers)"]
    }
  ]
}
<|eot_id|><|start_header_id|>user<|end_header_id|>
Generate a JSON object containing exactly 3 realistic dummy patients for a caregiver whose email is 'a@a'. 
Make sure 'a@a' is included in the authorized_users array for every single patient so they show up on the dashboard.
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

# 3. Generate the response
# max_new_tokens is increased here because a list of 3 patients takes more space than a single diagnostic log
output = generator(prompt, max_new_tokens=400, return_full_text=False)
response_text = output[0]['generated_text'].strip()

print("--- RAW LLM OUTPUT ---")
print(response_text)
print("----------------------\n")

# 4. Save the generated JSON directly to a file for your FastAPI backend to read
try:
    # Verify it is valid JSON before saving to prevent crashing your backend
    parsed_json = json.loads(response_text)
    
    # Save it to the db_patients.json file you use in your backend
    with open("db_patients.json", "w") as outfile:
        json.dump(parsed_json, outfile, indent=4)
        
    print("✅ Successfully generated mock data and saved to db_patients.json!")
    
except json.JSONDecodeError:
    print("❌ Error: The LLM didn't output perfectly valid JSON. It might have included markdown formatting.")