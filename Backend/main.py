import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()
DB_FILE = "db_patients.json"

# --- 1. HELPERS ---
def load_db():
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

# --- 2. DATA MODELS ---

class UnifiedRegistration(BaseModel):
    username: str
    password: str
    full_name: str
    email: str
    patient_name: str
    patient_age: int
    stage: str
    companion_figure: str
    memories: List[str]
    triggers: List[str]
    safe_topics: List[str]

class PatientUpdate(BaseModel):
    patient_id: Optional[str] = None 
    name: str
    age: int
    stage: str
    companion_figure: str
    memories: List[str]
    triggers: List[str]
    safe_topics: List[str]

# --- 3. AUTHENTICATION & ACCOUNT MANAGEMENT ---

@app.get("/register/check-username/{username}")
def check_username(username: str):
    """Checks if a username is already taken during registration."""
    db = load_db()
    is_available = username not in db
    return {"username": username, "available": is_available}

@app.post("/register")
def register(data: UnifiedRegistration):
    db = load_db()
    if data.username in db:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    first_patient = {
        "patient_id": "P-1",
        "name": data.patient_name,
        "age": data.patient_age,
        "stage": data.stage,
        "companion_figure": data.companion_figure,
        "memories": data.memories,
        "triggers": data.triggers,
        "safe_topics": data.safe_topics
    }
    
    db[data.username] = {
        "full_name": data.full_name,
        "email": data.email,
        "password": data.password,
        "patients": [first_patient]
    }
    save_db(db)
    return {"success": True, "message": "Account and first patient created."}

@app.post("/login")
def login(username: str, password: str):
    db = load_db()
    user = db.get(username)
    if user and user["password"] == password:
        return {
            "success": True,
            "caregiver_name": user.get("full_name"),
            "patients": user.get("patients", [])
        }
    return {"success": False, "message": "Invalid credentials"}

@app.post("/logout")
def logout(username: str):
    print(f"DEBUG: User {username} logged out.")
    return {"success": True, "message": "Session terminated."}

@app.delete("/caregiver/delete/{username}")
def delete_caregiver_account(username: str):
    db = load_db()
    if username not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found")
    del db[username]
    save_db(db)
    return {"success": True, "message": "Account deleted successfully."}

# --- 4. PATIENT MANAGEMENT ---

#  Retrieve Patient Info by Full Name
@app.get("/patients/retrieve")
def get_patient_by_name(username: str, patient_full_name: str):
    """
    Finds a patient by name within a caregiver's list. 
    Use this to pre-fill your edit form.
    """
    db = load_db()
    user = db.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    for patient in user.get("patients", []):
        # Case-insensitive search for the patient name
        if patient["name"].strip().lower() == patient_full_name.strip().lower():
            return patient 
            
    raise HTTPException(status_code=404, detail="Patient name not found.")

@app.get("/patients/{username}/{patient_id}")
def get_patient_to_edit(username: str, patient_id: str):
    db = load_db()
    user = db.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    for patient in user["patients"]:
        if patient["patient_id"] == patient_id:
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")

@app.post("/patients/save/{username}")
def save_or_update_patient(username: str, data: PatientUpdate):
    db = load_db()
    if username not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    patients_list = db[username]["patients"]

    if data.patient_id:
        found = False
        for i, p in enumerate(patients_list):
            if p["patient_id"] == data.patient_id:
                patients_list[i] = data.model_dump()
                found = True
                break
        
        if not found:
            raise HTTPException(status_code=404, detail="Patient ID not found")
        save_db(db)
        return {"success": True, "message": "Patient info updated."}
    else:
        new_id = f"P-{len(patients_list) + 1}"
        new_patient = data.model_dump()
        new_patient["patient_id"] = new_id
        patients_list.append(new_patient)
        save_db(db)
        return {"success": True, "message": "New patient created.", "patient_id": new_id}

@app.delete("/patients/delete/{username}/{patient_id}")
def delete_patient(username: str, patient_id: str):
    db = load_db()
    if username not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    original_count = len(db[username]["patients"])
    db[username]["patients"] = [p for p in db[username]["patients"] if p["patient_id"] != patient_id]

    if len(db[username]["patients"]) == original_count:
        raise HTTPException(status_code=404, detail="Patient not found")
    save_db(db)
    return {"success": True, "message": "Patient profile removed."}