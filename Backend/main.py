import json
import os
import datetime
import random
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

app = FastAPI()
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
    appointments: List[str] 
    family_members: Dict[str, str]

class PatientUpdate(BaseModel):
    patient_id: Optional[str] = None 
    name: str
    age: int
    stage: str
    companion_figure: str
    memories: List[str]
    triggers: List[str]
    safe_topics: List[str]
    appointments: List[str]
    family_members: Dict[str, str]

class ChatStartRequest(BaseModel):
    username: str
    password: str
    patient_id: str
    duration_minutes: int

class ChatMessage(BaseModel):
    username: str
    patient_id: str
    message: str

class ChatEndRequest(BaseModel):
    username: str
    patient_id: str

# --- 3. AUTHENTICATION ---
@app.get("/register/check-username/{username}")
def check_username(username: str):
    db = load_json(DB_FILE)
    return {"username": username, "available": username not in db}

@app.post("/register")
def register(data: UnifiedRegistration):
    db = load_json(DB_FILE)
    if data.username in db: raise HTTPException(status_code=400, detail="Username exists")
    first_patient = {
        "patient_id": "P-1", "name": data.patient_name, "age": data.patient_age,
        "stage": data.stage, "companion_figure": data.companion_figure,
        "memories": data.memories, "triggers": data.triggers, "safe_topics": data.safe_topics,
        "appointments": data.appointments, "family_members": data.family_members
    }
    db[data.username] = {"full_name": data.full_name, "email": data.email, "password": data.password, "patients": [first_patient]}
    save_json(DB_FILE, db)
    return {"success": True, "message": "Account created."}

@app.post("/login")
def login(username: str, password: str):
    db = load_json(DB_FILE)
    user = db.get(username)
    if user and user["password"] == password:
        return {"success": True, "caregiver_name": user.get("full_name"), "patients": user.get("patients", [])}
    return {"success": False, "message": "Invalid credentials"}

@app.post("/logout")
def logout(username: str):
    return {"success": True, "message": "Session terminated."}

@app.delete("/caregiver/delete/{username}")
def delete_caregiver_account(username: str):
    db = load_json(DB_FILE)
    if username in db: del db[username]; save_json(DB_FILE, db)
    return {"success": True}

# --- 4. PATIENT MANAGEMENT ---
@app.get("/patients/retrieve")
def get_patient_by_name(username: str, patient_full_name: str):
    db = load_json(DB_FILE)
    user = db.get(username)
    if user:
        for p in user.get("patients", []):
            if p["name"].lower().strip() == patient_full_name.lower().strip(): return p
    raise HTTPException(status_code=404, detail="Not found")

@app.get("/patients/{username}/{patient_id}")
def get_patient_to_edit(username: str, patient_id: str):
    db = load_json(DB_FILE)
    user = db.get(username)
    if user:
        for p in user["patients"]:
            if p["patient_id"] == patient_id: return p
    raise HTTPException(status_code=404, detail="Not found")

@app.post("/patients/save/{username}")
def save_or_update_patient(username: str, data: PatientUpdate):
    db = load_json(DB_FILE)
    if username not in db: raise HTTPException(status_code=404)
    patients = db[username]["patients"]
    if data.patient_id:
        for i, p in enumerate(patients):
            if p["patient_id"] == data.patient_id:
                patients[i] = data.model_dump(); save_json(DB_FILE, db)
                return {"success": True, "message": "Updated"}
        raise HTTPException(status_code=404)
    else:
        new_id = f"P-{len(patients)+1}"
        new_p = data.model_dump(); new_p["patient_id"] = new_id
        patients.append(new_p); save_json(DB_FILE, db)
        return {"success": True, "patient_id": new_id}

@app.delete("/patients/delete/{username}/{patient_id}")
def delete_patient(username: str, patient_id: str):
    db = load_json(DB_FILE)
    if username in db:
        db[username]["patients"] = [p for p in db[username]["patients"] if p["patient_id"] != patient_id]
        save_json(DB_FILE, db); return {"success": True}
    raise HTTPException(status_code=404)

# --- 5. AI CHATBOT LOGIC ---

def analyze_distress(text: str, patient_triggers: List[str]):
    text_lower = text.lower()
    if any(k in text_lower for k in ["kill myself", "want to die", "hurt myself", "emergency", "help me"]):
        return 3, "CRITICAL DISTRESS", "BREAK_GLASS"
    if any(k in text_lower for k in ["scared", "afraid", "lonely", "crying", "sad", "angry"]):
        return 2, "Emotional Distress", "GROUNDING"
    if any(k in text_lower for k in ["who are you", "where am i", "home"]) or any(t.lower() in text_lower for t in patient_triggers):
        return 1, "Confusion", "REDIRECT"
    return 0, "Normal", "NONE"

def get_safe_previous_session(patient_id: str):
    logs = load_json(CHAT_LOGS_FILE)
    if patient_id not in logs: return None, "No history found."
    user_logs = logs[patient_id]
    if not user_logs: return None, "No history found."

    session_messages = []
    found_end_marker = False
    
    for entry in reversed(user_logs):
        text = entry.get("text", "")
        if "SESSION ENDED" in text:
            if not found_end_marker: found_end_marker = True; continue
            else: break
        if found_end_marker: session_messages.append(entry)

    if not session_messages: return None, "No recent completed session found."

    for msg in session_messages:
        if msg.get("distress_tier", 0) >= 2: return False, "High distress detected."

    user_msgs = [m["text"] for m in session_messages if m["sender"] == "patient"]
    summary = user_msgs[0] if user_msgs else "general things"
    return True, summary

@app.post("/chat/start")
def start_session(data: ChatStartRequest):
    db = load_json(DB_FILE)
    user = db.get(data.username)
    if not user or user["password"] != data.password: raise HTTPException(status_code=401, detail="Invalid Password")
    patient = next((p for p in user["patients"] if p["patient_id"] == data.patient_id), None)
    if not patient: raise HTTPException(status_code=404, detail="Patient not found")
    
    logs = load_json(CHAT_LOGS_FILE)
    if data.patient_id not in logs: logs[data.patient_id] = []
    logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "system", "text": "SESSION STARTED"})
    save_json(CHAT_LOGS_FILE, logs)

    start_time = datetime.datetime.now()
    end_time = start_time + datetime.timedelta(minutes=data.duration_minutes)
    return {"success": True, "session_details": {"patient_name": patient["name"], "end_time": end_time.strftime("%H:%M")}}

@app.post("/chat/message")
def chat_message(data: ChatMessage):
    db = load_json(DB_FILE)
    user = db.get(data.username)
    if not user: raise HTTPException(status_code=404)
    patient = next((p for p in user["patients"] if p["patient_id"] == data.patient_id), None)
    
    # 1. SPECIAL RECALL LOGIC
    recall_keywords = ["yesterday", "last time", "talk about before", "previous session"]
    if any(k in data.message.lower() for k in recall_keywords):
        is_safe, summary = get_safe_previous_session(data.patient_id)
        if is_safe is False:
            response_text = "I'm having a little trouble remembering that clearly right now. But I'd love to hear about what you're doing today!"
        elif is_safe is True:
            response_text = f"Last time, you mentioned: \"{summary}\". It was nice talking to you about that."
        else:
            response_text = "We haven't chatted in a while, but I'm happy to be here with you now."
            
        logs = load_json(CHAT_LOGS_FILE)
        logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "patient", "text": data.message, "distress_tier": 0})
        logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "ai", "text": response_text})
        save_json(CHAT_LOGS_FILE, logs)
        return {"response": response_text, "tier": 0, "ui_signal": "NONE"}

    # 2. STANDARD FLOW
    tier, log_msg, action = analyze_distress(data.message, patient.get("triggers", []))
    response_text = ""
    ui_signal = "NONE"

    if tier == 3:
        response_text = "I am alerting your caregiver immediately. Please stay here with me."
        ui_signal = "BREAK_GLASS_ALERT"
    elif tier == 2:
        response_text = f"I hear that you are feeling {log_msg.lower()}. Can you tell me what made you feel this way?"
        ui_signal = "CALM_MODE"
    elif tier == 1:
        safe_topic = random.choice(patient.get("safe_topics", ["weather"]))
        response_text = f"It's okay. Let's talk about {safe_topic}."
    else:
        # TIER 0: NORMAL + FULL SESSION MEMORY
        logs = load_json(CHAT_LOGS_FILE)
        current_session_messages = [] # Will hold all messages from THIS session
        
        if data.patient_id in logs:
            # Iterate REVERSE to find start marker
            for msg in reversed(logs[data.patient_id]):
                if "SESSION STARTED" in msg["text"]: 
                    break # Stop when we hit the start of this session
                
                # Collect user messages only
                if msg["sender"] == "patient": 
                    current_session_messages.append(msg["text"])
            
            # Since we collected in reverse, flip list to be Chronological (Oldest -> Newest)
            current_session_messages.reverse()

        # Family Check
        found_family = False
        for name, relation in patient.get("family_members", {}).items():
            if name.lower() in data.message.lower():
                response_text = f"Yes, {name} is your {relation}."
                found_family = True
                break
        
        if not found_family:
            if current_session_messages:
                # Mock AI response referencing older messages in session
                # Example: "You mentioned [Topic from 10 mins ago] earlier..."
                start_topic = current_session_messages[0] 
                response_text = f"That is interesting. Earlier you mentioned {start_topic}, and now {data.message}. Tell me more."
            else:
                response_text = f"That is interesting about {data.message}. Tell me more."

    # 3. LOG HISTORY
    logs = load_json(CHAT_LOGS_FILE)
    if data.patient_id not in logs: logs[data.patient_id] = []
    logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "patient", "text": data.message, "distress_tier": tier})
    logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "ai", "text": response_text})
    save_json(CHAT_LOGS_FILE, logs)

    return {"response": response_text, "tier": tier, "ui_signal": ui_signal}

@app.get("/chat/history/{patient_id}")
def get_chat_history(patient_id: str):
    logs = load_json(CHAT_LOGS_FILE)
    return {"history": logs.get(patient_id, [])}

@app.get("/chat/presets")
def get_presets(username: str, patient_id: str, type: str):
    db = load_json(DB_FILE)
    user = db.get(username)
    patient = next((p for p in user["patients"] if p["patient_id"] == patient_id), None)
    if type == "today":
        appt = ", ".join(patient.get("appointments", [])) or "No appointments."
        return {"title": "Today", "content": f"Today is {datetime.datetime.now().strftime('%A')}. {appt}"}
    elif type == "memory":
        return {"title": "Memory", "content": random.choice(patient.get("memories", ["Tell me a story."]))}
    return {"error": "Invalid"}

@app.post("/chat/end")
def end_chat(data: ChatEndRequest):
    logs = load_json(CHAT_LOGS_FILE)
    if data.patient_id not in logs: logs[data.patient_id] = []
    logs[data.patient_id].append({"timestamp": get_timestamp(), "sender": "system", "text": "SESSION ENDED"})
    save_json(CHAT_LOGS_FILE, logs)
    return {"success": True}