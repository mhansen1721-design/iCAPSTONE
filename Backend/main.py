from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# --- Mock Database ---
# In a real app, this would be a SQL or NoSQL database
db_patients = {
    "admin": {
        "password": "secretpassword",
        "patient_id": "P001",
        "name": "John Doe",
        "age": 30,
        "medical_history": ["Asthma", "Allergy to Penicillin"]
    }
}

# --- Data Models ---
class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    medical_history: Optional[List[str]] = None

# --- 1. Login (Existing) ---
@app.post("/login")
def login(username: str, password: str):
    user = db_patients.get(username)
    if user and user["password"] == password:
        return True
    return False

# --- 2. Retrieve (username, password) ---
@app.post("/retrieve")
def retrieve_info(username: str, password: str):
    """Returns a list of patient information if credentials match."""
    user = db_patients.get(username)
    
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Returning a list of values as requested
    return [user["patient_id"], user["name"], user["age"], user["medical_history"]]

# --- 3. Update Info (patient_id, info) ---
@app.put("/update/{patient_id}")
def update_info(patient_id: str, updates: PatientUpdate):
    """Updates patient info and returns True if successful, False otherwise."""
    
    # Find the patient by ID in our mock DB
    target_username = None
    for username, data in db_patients.items():
        if data["patient_id"] == patient_id:
            target_username = username
            break
    
    if not target_username:
        return False  # Update failed (Patient not found)

    # Apply updates
    current_data = db_patients[target_username]
    update_dict = updates.model_dump(exclude_unset=True) # Only update fields provided
    current_data.update(update_dict)
    
    return True