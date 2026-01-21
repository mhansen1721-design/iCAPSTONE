from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

db_patients = {
    "caregiver_admin": {
        "password": "icap",
        "patients": [
            {
                "patient_id": "P001",
                "name": "John Doe",
                "age": 90,
                "stage": "Middle",
                "memories": ["Former Carpenter", "Loves Jazz"],
                "triggers": ["Loud noises"]
            }
        ]
    }
}

# --- Data Models ---
# This defines what the 'info' looks like when updating
class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    stage: Optional[str] = None
    memories: Optional[List[str]] = None
    triggers: Optional[List[str]] = None

# --- 1. Login ---
@app.post("/login")
def login(username: str, password: str):
    """Returns True if credentials match, otherwise False."""
    user = db_patients.get(username)
    if user and user["password"] == password:
        return True
    return False

# --- 2. Retrieve ---
@app.post("/retrieve")
def retrieve(username: str, password: str):
    """Returns the list of patient information for a caregiver."""
    user = db_patients.get(username)
    
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Returns the list of patients associated with this caregiver
    return user["patients"]

# --- 3. Update Info ---
@app.put("/update/{patient_id}")
def update_info(patient_id: str, info: PatientInfo):
    """
    Updates patient info based on ID. 
    Returns True if successful, False if patient not found.
    """
    for caregiver in db_patients.values():
        for patient in caregiver["patients"]:
            if patient["patient_id"] == patient_id:
                # Update the patient fields with the new info
                update_data = info.model_dump(exclude_unset=True)
                patient.update(update_data)
                return True
                
    return False # Patient ID not found