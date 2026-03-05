import json
import os
import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enabling CORS for React frontend connectivity
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
    """Safely loads JSON or returns an empty dict if file is missing/corrupt."""
    if not os.path.exists(filename):
        return {}
    with open(filename, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_json(filename, data):
    """Saves data with clean indentation for readability."""
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

def get_timestamp():
    """Generates standard timestamp for session logging."""
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
    patient_id: Optional[str] = None
    full_name: str
    age: int = Field(gt=0)
    dementia_stage: str
    patient_story: str
    hobbies_and_career: str
    key_people: List[KeyPerson]
    approved_topics: List[str]
    known_triggers: List[str]

class ChatMessage(BaseModel):
    email: str
    patient_id: str
    message: str

class MessageModel(BaseModel):
    sender: str
    text: str
    timestamp: str

class SessionSave(BaseModel):
    email: str
    password: str
    patient_id: str
    full_name: str
    messages: List[MessageModel]

# --- 3. AUTH & REGISTRATION ---
@app.post("/register")
def register(data: UserRegistration):
    db = load_json(DB_FILE)
    email_key = data.email.lower().strip()
    if email_key in db:
        raise HTTPException(status_code=400, detail="Email already registered")
    db[email_key] = {
        "full_name": data.full_name, 
        "email": email_key, 
        "password": data.password, 
        "patients": []
    }
    save_json(DB_FILE, db)
    return {"success": True}

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
    """Fetches the caregiver's patient list for the dashboard."""
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    user = db.get(email_key)
    if not user:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    
    patients = user.get("patients", [])
    return {"exists": len(patients) > 0, "patients": patients}

@app.post("/patients/save/{email}")
def save_or_update_patient(email: str, data: PatientProfile):
    """Saves a new patient or updates an existing one."""
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    if email_key not in db: 
        raise HTTPException(status_code=404, detail="Caregiver account not found.")
    
    patient_dict = data.model_dump()
    final_id = patient_dict.get("patient_id") or f"P-{int(datetime.datetime.now().timestamp())}"
    patient_dict["patient_id"] = final_id
    
    patients = db[email_key].get("patients", [])
    updated = False
    for i, p in enumerate(patients):
        if p.get("patient_id") == final_id:
            patients[i] = patient_dict
            updated = True
            break
            
    if not updated:
        patients.append(patient_dict)
    
    db[email_key]["patients"] = patients
    save_json(DB_FILE, db)
    return {"success": True, "patient_id": final_id}

@app.delete("/patients/delete/{email}/{patient_id}")
def delete_patient_profile(email: str, patient_id: str):
    """Permanently removes a patient profile from the JSON database."""
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    
    if email_key not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    
    patients = db[email_key].get("patients", [])
    filtered_patients = [p for p in patients if p.get("patient_id") != patient_id]
    
    if len(filtered_patients) == len(patients):
         raise HTTPException(status_code=404, detail="Patient ID not found in JSON.")

    db[email_key]["patients"] = filtered_patients
    save_json(DB_FILE, db)
    return {"success": True, "message": "Profile permanently deleted."}

# --- 5. CHAT & DISTRESS LOGIC ---

def analyze_distress(text: str):
    """Analyzes text for practical hazards like wandering, medication, or strangers."""
    text_lower = text.lower()
    tier_3 = ["wandering", "leaving the house", "go outside", "pill", "medication", "stranger"]
    if any(k in text_lower for k in tier_3):
        return 3, "Hazard Alert", "ALERT_CAREGIVER"
    return 0, "Normal", "NONE"

@app.post("/chat/message")
def chat_message(data: ChatMessage):
    """Processes live chat messages (currently handles echo logic)."""
    tier, log_msg, action = analyze_distress(data.message)
    return {"response": data.message, "tier": tier, "ui_signal": action}

@app.post("/chat/save-session")
def save_session(data: SessionSave):
    db = load_json(DB_FILE)
    email_key = data.email.lower().strip()
    
    user = db.get(email_key)
    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Verification failed")

    logs = load_json(CHAT_LOGS_FILE)
    
    if email_key not in logs:
        logs[email_key] = {}
    
    pass_key = data.password
    if pass_key not in logs[email_key]:
        logs[email_key][pass_key] = {}
        
    if data.patient_id not in logs[email_key][pass_key]:
        logs[email_key][pass_key][data.patient_id] = {
            "full_name": data.full_name,
            "sessions": []
        }
  
    # Convert each MessageModel into a standard dictionary so JSON can handle it
    serializable_messages = [msg.model_dump() for msg in data.messages]
    
    logs[email_key][pass_key][data.patient_id]["sessions"].append({
        "timestamp": get_timestamp(),
        "transcript": serializable_messages # Save the dictionaries, not the models
    })
    
    save_json(CHAT_LOGS_FILE, logs)
    return {"success": True}

@app.post("/caregiver/delete-account") # Using POST so we can send credentials in the body
def delete_caregiver_account(data: dict):
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")
    
    db = load_json(DB_FILE)
    
    # 1. Verification
    if email not in db or db[email]["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid email or password. Deletion denied.")
    
    # 2. Delete from Patients DB
    del db[email]
    save_json(DB_FILE, db)
    
    # 3. Delete from Chat Logs
    logs = load_json(CHAT_LOGS_FILE)
    if email in logs:
        del logs[email]
        save_json(CHAT_LOGS_FILE, logs)
        
    return {"success": True}


