import json
import os
import datetime
import random
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enabling CORS for your React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "db_patients.json"
CHAT_LOGS_FILE = "db_chat_logs.json"

# --- 1. HELPERS ---
def load_json(filename):
    if not os.path.exists(filename):
        return {}
    with open(filename, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

def get_timestamp():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# --- 2. DATA MODELS ---

class UserRegistration(BaseModel):
    full_name: str
    email: str
    password: str

class KeyPerson(BaseModel):
    name: str
    relation: str

class PatientProfile(BaseModel):
    id: Optional[str] = None
    full_name: str
    age: int
    dementia_stage: str # mild, moderate, severe
    patient_story: str
    hobbies_and_career: str
    key_people: List[KeyPerson]
    approved_topics: List[str]
    known_triggers: List[str]

class ChatMessage(BaseModel):
    email: str
    patient_id: str
    message: str

class ChatEndRequest(BaseModel):
    email: str
    patient_id: str

# --- 3. AUTHENTICATION & REGISTRATION ---

@app.post("/register")
def register(data: UserRegistration):
    db = load_json(DB_FILE)
    email_key = data.email.lower().strip() # Normalize to prevent lookup errors
    
    if email_key in db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Initialize the caregiver and the empty patients list
    db[email_key] = {
        "full_name": data.full_name,
        "email": email_key,
        "password": data.password,
        "patients": [] 
    }
    save_json(DB_FILE, db)
    return {"success": True, "message": "Account created successfully."}

@app.post("/login")
def login(email: str, password: str):
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    user = db.get(email_key)
    
    if user and user["password"] == password:
        return {
            "success": True, 
            "caregiver_name": user.get("full_name"), 
            "patients": user.get("patients", [])
        }
    return {"success": False, "message": "Invalid credentials"}

# --- 4. PROFILE MANAGEMENT ---

@app.get("/caregiver/init-profile/{email}")
def init_companion_profile(email: str):
    """Retrieves existing info for editing or returns empty for new creation"""
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    user = db.get(email_key)
    
    if not user:
        raise HTTPException(status_code=404, detail="Caregiver not found. Register first.")
    
    patients = user.get("patients", [])
    if len(patients) > 0:
        return {"exists": True, "patient": patients[0]}
    
    return {"exists": False, "message": "No profile found."}

@app.post("/patients/save/{email}")
def save_or_update_patient(email: str, data: PatientProfile):
    """Stores info under the caregiver's record in the JSON file"""
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    
    if email_key not in db: 
        raise HTTPException(status_code=404, detail="User not found")
    
    patient_dict = data.model_dump()
    incoming_id = patient_dict.pop("id", None)
    # Generate ID if this is the first time saving
    final_id = incoming_id or f"P-{int(datetime.datetime.now().timestamp())}"
    patient_dict["patient_id"] = final_id
    
    patients = db[email_key].get("patients", [])
    updated = False
    
    # Update logic for existing patient IDs
    for i, p in enumerate(patients):
        if p.get("patient_id") == final_id:
            patients[i] = patient_dict
            updated = True
            break
            
    if not updated:
        patients.append(patient_dict)
    
    db[email_key]["patients"] = patients
    save_json(DB_FILE, db)
    return {"success": True, "message": "Profile saved", "patient_id": final_id}

@app.delete("/patients/delete/{email}/{patient_id}")
def delete_patient_profile(email: str, patient_id: str):
    """Permanently removes a patient profile from the caregiver's record"""
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    
    if email_key not in db:
        raise HTTPException(status_code=404, detail="Caregiver account not found.")
    
    original_count = len(db[email_key].get("patients", []))
    # Filter out the patient ID
    db[email_key]["patients"] = [
        p for p in db[email_key].get("patients", []) 
        if p.get("patient_id") != patient_id
    ]
    
    if len(db[email_key]["patients"]) == original_count:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    
    save_json(DB_FILE, db)
    return {"success": True, "message": "Profile permanently deleted."}

# --- 5. CHAT LOGIC ---

def analyze_distress(text: str, patient_triggers: List[str]):
    text_lower = text.lower()
    # Tier 3 critical distress check
    if any(k in text_lower for k in ["kill myself", "want to die", "hurt myself", "emergency", "help me"]):
        return 3, "CRITICAL DISTRESS", "BREAK_GLASS"
    # Tier 3 wandering and medication safety check
    if any(k in text_lower for k in ["wandering", "leaving", "stranger", "medication"]):
        return 3, "Wandering/Medication Hazard", "ALERT_CAREGIVER"
    if any(k in text_lower for k in ["scared", "afraid", "lonely", "crying", "sad", "angry"]):
        return 2, "Emotional Distress", "GROUNDING"
    return 0, "Normal", "NONE"

@app.post("/chat/message")
def chat_message(data: ChatMessage):
    db = load_json(DB_FILE)
    email_key = data.email.lower().strip()
    user = db.get(email_key)
    patient = next((p for p in user["patients"] if p.get("patient_id") == data.patient_id), None)
    
    tier, log_msg, action = analyze_distress(data.message, patient.get("known_triggers", []))
    response_text = f"That is interesting. Tell me more about {data.message}."
    
    # Relation recognition logic
    for person in patient.get("key_people", []):
        if person["name"].lower() in data.message.lower():
            response_text = f"Yes, {person['name']} is your {person['relation']}."
            break

    logs = load_json(CHAT_LOGS_FILE)
    if data.patient_id not in logs: logs[data.patient_id] = []
    logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "patient", "text": data.message, "distress_tier": tier})
    logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "ai", "text": response_text})
    save_json(CHAT_LOGS_FILE, logs)

    return {"response": response_text, "tier": tier, "ui_signal": action}