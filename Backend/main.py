import json
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()
# Filename set to db_patients.json as requested
DB_FILE = "db_patients.json"

# --- 1. HELPERS ---
def load_db():
    """Reads the JSON file and returns the database dictionary."""
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_db(data):
    """Writes the updated dictionary back to the JSON file."""
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

# --- 2. DATA MODELS ---

class UnifiedRegistration(BaseModel):
    """Used for the 'Create Account' page to set up caregiver and first patient."""
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
    """Used for adding NEW profiles or UPDATING existing profiles."""
    patient_id: Optional[str] = None 
    name: str
    age: int
    stage: str
    companion_figure: str
    memories: List[str]
    triggers: List[str]
    safe_topics: List[str]

# --- 3. AUTHENTICATION & ACCOUNT MANAGEMENT ---

@app.post("/register")
def register(data: UnifiedRegistration):
    """Creates a caregiver account and their first patient profile."""
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
    """Logs in caregiver and returns their patient list."""
    db = load_db()
    user = db.get(username)
    if user and user["password"] == password:
        return {
            "success": True,
            "caregiver_name": user.get("full_name"),
            "patients": user.get("patients", [])
        }
    return {"success": False, "message": "Login failed"}

@app.delete("/caregiver/delete/{username}")
def delete_caregiver_account(username: str):
    """Wipes the caregiver account and all associated patient profiles from the JSON."""
    db = load_db()
    if username not in db:
        raise HTTPException(status_code=404, detail="Caregiver account not found")
    
    del db[username]
    save_db(db)
    return {"success": True, "message": f"Account '{username}' deleted successfully."}

# --- 4. PATIENT MANAGEMENT (The Retrieve-Edit-Save Cycle) ---

@app.get("/patients/{username}/{patient_id}")
def get_patient_to_edit(username: str, patient_id: str):
    """Retrieves specific patient info to pre-fill the configuration/edit form."""
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
    """Saves edited info back to the specific patient or creates a new profile if no ID exists."""
    db = load_db()
    if username not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    patients_list = db[username]["patients"]

    # --- UPDATE EXISTING ---
    if data.patient_id:
        found = False
        for i, p in enumerate(patients_list):
            if p["patient_id"] == data.patient_id:
                patients_list[i] = data.model_dump()
                found = True
                break
        
        if not found:
            raise HTTPException(status_code=404, detail="Patient ID match failed")
            
        save_db(db)
        return {"success": True, "message": "Patient info updated."}

    # --- CREATE NEW ---
    else:
        new_patient = data.model_dump()
        new_patient["patient_id"] = f"P-{len(patients_list) + 1}"
        patients_list.append(new_patient)
        save_db(db)
        return {"success": True, "message": "New patient profile added.", "patient_id": new_patient["patient_id"]}

@app.delete("/patients/delete/{username}/{patient_id}")
def delete_patient(username: str, patient_id: str):
    """Deletes a specific patient profile from a caregiver's list."""
    db = load_db()
    if username not in db:
        raise HTTPException(status_code=404, detail="Caregiver not found")

    original_count = len(db[username]["patients"])
    db[username]["patients"] = [p for p in db[username]["patients"] if p["patient_id"] != patient_id]

    if len(db[username]["patients"]) == original_count:
        raise HTTPException(status_code=404, detail="Patient ID not found")

    save_db(db)
    return {"success": True, "message": "Patient profile removed."}