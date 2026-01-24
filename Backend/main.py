import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()
JSON_FILE = "db_patients.json"

# --- Persistent Storage Logic ---
def save_db():
    with open(JSON_FILE, "w") as f:
        json.dump(db_patients, f, indent=4)

def load_db():
    if os.path.exists(JSON_FILE):
        with open(JSON_FILE, "r") as f:
            return json.load(f)
    return {}

# Initialize DB from file or use your default
db_patients = load_db() or {
    "caregiver_admin": {
        "full_name": "Admin User",
        "email": "admin@icap.com",
        "password": "icap",
        "patients": []
    }
}

# --- Data Models ---
class CaregiverCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: str

class PatientConfig(BaseModel):
    patient_id: Optional[str] = None
    name: str
    age: int
    stage: str # Early, Medium, Advanced
    companion_figure: str
    memories: List[str]
    triggers: List[str]
    safe_topics: List[str]

# --- 1. Registration (Flow 1: Create Account) ---
@app.post("/register")
def register(data: CaregiverCreate):
    if data.username in db_patients:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    db_patients[data.username] = {
        "full_name": data.full_name,
        "email": data.email,
        "password": data.password,
        "patients": []
    }
    save_db()
    return {"success": True, "message": "Account created"}

# --- 2. Login (Triggers "Your Loved Ones" Page) ---
@app.post("/login")
def login(username: str, password: str):
    user = db_patients.get(username)
    if user and user["password"] == password:
        # Return caregiver info to display on the dashboard
        return {
            "success": True, 
            "full_name": user["full_name"],
            "username": username
        }
    return {"success": False, "detail": "Login failed"}

# --- 3. Retrieve (Populates the Patient List) ---
@app.get("/retrieve/{username}")
def retrieve_patients(username: str):
    if username not in db_patients:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    return db_patients[username]["patients"]

# --- 4. Create/Configure Patient (Flow 1: Add New Profile) ---
@app.post("/patients/create/{username}")
def create_patient(username: str, config: PatientConfig):
    if username not in db_patients:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    
    # Generate simple ID if not provided
    new_id = config.patient_id or f"P{len(db_patients[username]['patients']) + 1:03}"
    
    new_patient = config.model_dump()
    new_patient["patient_id"] = new_id
    
    db_patients[username]["patients"].append(new_patient)
    save_db()
    return {"success": True, "patient_id": new_id}

# --- 5. Update (Edit Existing Configuration) ---
@app.put("/update/{username}/{patient_id}")
def update_info(username: str, patient_id: str, info: PatientConfig):
    if username not in db_patients:
        return False
        
    for patient in db_patients[username]["patients"]:
        if patient["patient_id"] == patient_id:
            update_data = info.model_dump(exclude_unset=True)
            patient.update(update_data)
            save_db()
            return True
                
    return False

