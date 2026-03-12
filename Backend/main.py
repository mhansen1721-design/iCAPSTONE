import json
import os
import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enabling CORS for React frontend connectivity
# Using "*" for development; update to specific origins for production
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
    name: str = ""
    relation: str = ""

class PatientProfile(BaseModel):
    patient_id: Optional[str] = None
    full_name: str = "Unnamed"
    age: Optional[int] = 0
    dementia_stage: str = "Early"
    patient_story: Optional[str] = ""
    hobbies_and_career: Optional[str] = ""
    avatarType: str = "jellyfish"
    key_people: List[KeyPerson] = []
    approved_topics: List[str] = []
    known_triggers: List[str] = []

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
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    user = db.get(email_key)
    if not user:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    
    patients = user.get("patients", [])
    return {"exists": len(patients) > 0, "patients": patients}

@app.post("/patients/save/{email}")
def save_or_update_patient(email: str, data: PatientProfile):
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    if email_key not in db: 
        raise HTTPException(status_code=404, detail="Caregiver account not found.")
    
    patient_dict = data.model_dump()
    
    # 1. Handle Patient ID
    incoming_id = patient_dict.get("patient_id")
    if not incoming_id:
        final_id = f"P-{int(datetime.datetime.now().timestamp())}"
        patient_dict["patient_id"] = final_id
    else:
        final_id = incoming_id

    # 2. Update Patient Profile in db_patients.json
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

    # 3. SYNC NAME TO CHAT LOGS
    # We load the chat logs and look for any sessions belonging to this patient_id
    # to update the "full_name" field so the Logs view stays current.
    logs = load_json(CHAT_LOGS_FILE)
    new_name = patient_dict.get("full_name", "Unnamed")

    if email_key in logs:
        # The structure is logs[email][password][patient_id]
        for password_key in logs[email_key]:
            if final_id in logs[email_key][password_key]:
                logs[email_key][password_key][final_id]["full_name"] = new_name
        
        save_json(CHAT_LOGS_FILE, logs)
    
    return {"success": True, "patient_id": final_id}
    


@app.delete("/patients/delete/{email}/{patient_id}")
async def delete_patient_profile(email: str, patient_id: str): # Added async
    db = load_json(DB_FILE)
    email_key = email.lower().strip()
    
    if email_key not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    
    patients = db[email_key].get("patients", [])
    
    # Check if patient exists before filtering
    patient_exists = any(p.get("patient_id") == patient_id for p in patients)
    if not patient_exists:
         raise HTTPException(status_code=404, detail="Patient ID not found.")

    # Filter out the patient
    filtered_patients = [p for p in patients if p.get("patient_id") != patient_id]
    
    db[email_key]["patients"] = filtered_patients
    save_json(DB_FILE, db)
    
    # Return a clean 200 OK with the success body
    return {"success": True, "message": "Patient deleted successfully"}

# --- 5. SESSION LOGGING ---
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
  
    serializable_messages = [msg.model_dump() for msg in data.messages]
    logs[email_key][pass_key][data.patient_id]["sessions"].append({
        "timestamp": get_timestamp(),
        "transcript": serializable_messages 
    })
    
    save_json(CHAT_LOGS_FILE, logs)
    return {"success": True}

@app.post("/caregiver/delete-account")
def delete_caregiver_account(data: dict):
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")
    db = load_json(DB_FILE)
    
    if email not in db or db[email]["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials. Could not find your account.")
    
    del db[email]
    save_json(DB_FILE, db)
    
    logs = load_json(CHAT_LOGS_FILE)
    if email in logs:
        del logs[email]
        save_json(CHAT_LOGS_FILE, logs)
        
    return {"success": True}

@app.get("/chat/logs")
def get_chat_logs():
    """Returns the entire chat logs JSON to the frontend."""
    logs = load_json(CHAT_LOGS_FILE)
    return logs

