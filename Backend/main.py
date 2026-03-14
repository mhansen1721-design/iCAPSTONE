import json
import os
import shutil
import datetime
import random
import string
import threading
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger("nura.main")

app = FastAPI()

# ─────────────────────────────────────────────
# LLM LOAD STATE
# Model is NOT loaded at startup — it loads on first chat session.
# Call GET /llm/warmup to trigger loading in the background.
# Poll GET /llm/status to check progress.
# ─────────────────────────────────────────────
_llm_load_error: str | None = None
_llm_loading: bool = False   # True while the background thread is running

def _load_llm_background():
    """Loads the model in a background thread. Safe to call multiple times."""
    global _llm_load_error, _llm_loading
    if _llm_loading:
        return   # already in progress — don't start a second thread
    _llm_loading = True
    try:
        import llm_chat
        if llm_chat._pipeline is not None:
            return   # already loaded
        try:
            import os as _os
            _os.nice(10)   # lower CPU priority so API stays responsive
        except Exception:
            pass
        logger.info("[LLM] Loading model in background thread …")
        llm_chat.get_pipeline()
        logger.info("[LLM] Model ready.")
    except Exception as exc:
        _llm_load_error = str(exc)
        logger.error("[LLM] Failed to load: %s", exc)
    finally:
        _llm_loading = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# FILE LAYOUT  (all auto-created on first write)
# ─────────────────────────────────────────────
# db_caregivers.json    { email: { full_name, password, patient_ids[] } }
# db_patients.json      { patient_id: { ...profile, access_code, authorized_users[] } }
# db_chat_logs.json     { patient_id: { full_name, sessions[{ timestamp, logged_by, transcript[] }] } }
# db_care_journal.json  { patient_id: [{ entry_id, author_email, author_name, content, type, timestamp }] }
# db_help_requests.json { patient_id: [{ request_id, title, description,
#                                        author_email, author_name,
#                                        claimed_by, claimed_name, status, timestamp }] }
# db_memory_box.json    { patient_id: [{ photo_id, filename, url, description,
#                                        uploaded_by_email, uploaded_by_name, timestamp }] }
#
# uploads/              Folder where image files are physically stored on disk.
#                       Served as static files at GET /uploads/{filename}
CAREGIVERS_FILE    = "db_caregivers.json"
PATIENTS_FILE      = "db_patients.json"
CHAT_LOGS_FILE     = "db_chat_logs.json"
JOURNAL_FILE       = "db_care_journal.json"
HELP_REQUESTS_FILE = "db_help_requests.json"
MEMORY_BOX_FILE    = "db_memory_box.json"
UPLOADS_DIR        = "uploads"

# Create the uploads folder if it doesn't exist yet
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Serve the uploads folder as static files so the frontend can load images
# e.g. GET http://127.0.0.1:8000/uploads/photo_abc123.jpg
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Allowed image extensions (basic safety check)
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"}


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def load_json(filename: str) -> dict:
    if not os.path.exists(filename):
        return {}
    with open(filename, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def save_json(filename: str, data: dict):
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)


def get_timestamp() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def generate_access_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def short_id(prefix: str) -> str:
    return f"{prefix}-{int(datetime.datetime.now().timestamp())}-{random.randint(100, 999)}"


def require_authorized(patient: dict, email: str):
    if email.lower() not in patient.get("authorized_users", []):
        raise HTTPException(status_code=403, detail="Not authorized for this patient's care circle.")


# ─────────────────────────────────────────────
# DATA MODELS
# ─────────────────────────────────────────────
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
    end_reason: str = "completed"   # "completed" = timer ended | "early" = End Session button


class JoinCircleRequest(BaseModel):
    email: str
    access_code: str


class JournalEntryCreate(BaseModel):
    patient_id: str
    author_email: str
    content: str
    type: str = "update"   # update | medication | problem | milestone


class HelpRequestCreate(BaseModel):
    patient_id: str
    author_email: str
    title: str
    description: str = ""


class ClaimRequest(BaseModel):
    claimer_email: str


class ChatRequest(BaseModel):
    patient_id: str
    user_input: str
    chat_history: list = []   # [{"role": "user"|"assistant", "content": str}, …]


# ─────────────────────────────────────────────
# 1. AUTH & REGISTRATION
# ─────────────────────────────────────────────
@app.post("/register")
def register(data: UserRegistration):
    caregivers = load_json(CAREGIVERS_FILE)
    email_key = data.email.lower().strip()
    if email_key in caregivers:
        raise HTTPException(status_code=400, detail="Email already registered.")
    caregivers[email_key] = {
        "full_name": data.full_name,
        "email": email_key,
        "password": data.password,
        "patient_ids": []
    }
    save_json(CAREGIVERS_FILE, caregivers)
    return {"success": True}


@app.post("/login")
def login(email: str, password: str):
    caregivers = load_json(CAREGIVERS_FILE)
    email_key = email.lower().strip()
    user = caregivers.get(email_key)
    if user and user["password"] == password:
        return {"success": True, "caregiver_name": user.get("full_name")}
    return {"success": False, "message": "Invalid credentials"}


# ─────────────────────────────────────────────
# 2. PATIENT MANAGEMENT
# ─────────────────────────────────────────────
@app.get("/caregiver/{email}/patients")
def get_caregiver_patients(email: str):
    caregivers = load_json(CAREGIVERS_FILE)
    patients_db = load_json(PATIENTS_FILE)
    email_key = email.lower().strip()
    caregiver = caregivers.get(email_key)
    if not caregiver:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    patient_ids = caregiver.get("patient_ids", [])
    patients = [patients_db[pid] for pid in patient_ids if pid in patients_db]
    return {"exists": len(patients) > 0, "patients": patients}


# Backward-compatible alias
@app.get("/caregiver/init-profile/{email}")
def init_companion_profile_legacy(email: str):
    return get_caregiver_patients(email)


@app.post("/patients/save/{email}")
def save_or_update_patient(email: str, data: PatientProfile):
    caregivers = load_json(CAREGIVERS_FILE)
    patients_db = load_json(PATIENTS_FILE)
    email_key = email.lower().strip()
    if email_key not in caregivers:
        raise HTTPException(status_code=404, detail="Caregiver account not found.")

    patient_dict = data.model_dump()
    incoming_id = patient_dict.get("patient_id")
    final_id = incoming_id if incoming_id else f"P-{int(datetime.datetime.now().timestamp())}"
    patient_dict["patient_id"] = final_id

    existing = patients_db.get(final_id, {})
    patient_dict["access_code"] = existing.get("access_code") or generate_access_code()
    authorized = existing.get("authorized_users", [])
    if email_key not in authorized:
        authorized.append(email_key)
    patient_dict["authorized_users"] = authorized

    patients_db[final_id] = patient_dict
    save_json(PATIENTS_FILE, patients_db)

    if final_id not in caregivers[email_key]["patient_ids"]:
        caregivers[email_key]["patient_ids"].append(final_id)
    save_json(CAREGIVERS_FILE, caregivers)

    logs = load_json(CHAT_LOGS_FILE)
    if final_id in logs:
        logs[final_id]["full_name"] = patient_dict.get("full_name", "Unnamed")
        save_json(CHAT_LOGS_FILE, logs)

    return {"success": True, "patient_id": final_id, "access_code": patient_dict["access_code"]}


@app.delete("/patients/delete/{email}/{patient_id}")
def delete_patient_profile(email: str, patient_id: str):
    caregivers = load_json(CAREGIVERS_FILE)
    patients_db = load_json(PATIENTS_FILE)
    email_key = email.lower().strip()
    if email_key not in caregivers:
        raise HTTPException(status_code=404, detail="Caregiver not found.")
    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, email_key)

    authorized = [u for u in patient.get("authorized_users", []) if u != email_key]
    caregivers[email_key]["patient_ids"] = [
        p for p in caregivers[email_key]["patient_ids"] if p != patient_id
    ]
    save_json(CAREGIVERS_FILE, caregivers)

    if not authorized:
        del patients_db[patient_id]
    else:
        patients_db[patient_id]["authorized_users"] = authorized
    save_json(PATIENTS_FILE, patients_db)
    return {"success": True, "message": "Removed from care circle."}


# ─────────────────────────────────────────────
# 3. CARE CIRCLE — JOIN & ACTIVATE
# ─────────────────────────────────────────────
@app.post("/patients/join")
def join_care_circle(data: JoinCircleRequest):
    caregivers = load_json(CAREGIVERS_FILE)
    patients_db = load_json(PATIENTS_FILE)
    email_key = data.email.lower().strip()
    code = data.access_code.upper().strip()

    if email_key not in caregivers:
        raise HTTPException(status_code=404, detail="Caregiver account not found. Please register first.")

    target_id = next(
        (pid for pid, p in patients_db.items() if p.get("access_code") == code), None
    )
    if not target_id:
        raise HTTPException(status_code=404, detail="Invalid access code.")

    target_patient = patients_db[target_id]
    authorized = target_patient.get("authorized_users", [])
    if email_key not in authorized:
        authorized.append(email_key)
        patients_db[target_id]["authorized_users"] = authorized
        save_json(PATIENTS_FILE, patients_db)

    if target_id not in caregivers[email_key]["patient_ids"]:
        caregivers[email_key]["patient_ids"].append(target_id)
        save_json(CAREGIVERS_FILE, caregivers)

    return {"success": True, "patient_name": target_patient.get("full_name"), "patient_id": target_id}


@app.post("/patients/activate-circle/{patient_id}")
def activate_care_circle(patient_id: str):
    patients_db = load_json(PATIENTS_FILE)
    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    if not patient.get("access_code"):
        patient["access_code"] = generate_access_code()
        patients_db[patient_id] = patient
        save_json(PATIENTS_FILE, patients_db)
    return {"success": True, "access_code": patient["access_code"]}


# ─────────────────────────────────────────────
# 4. CARE CENTER — UNIFIED BUNDLE
# ─────────────────────────────────────────────
@app.get("/patients/{patient_id}/care-center")
def get_care_center(patient_id: str, email: str):
    patients_db   = load_json(PATIENTS_FILE)
    journal_db    = load_json(JOURNAL_FILE)
    logs_db       = load_json(CHAT_LOGS_FILE)
    requests_db   = load_json(HELP_REQUESTS_FILE)
    memory_db     = load_json(MEMORY_BOX_FILE)
    caregivers_db = load_json(CAREGIVERS_FILE)

    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, email)

    caregivers_info = [
        {"email": cg_email, "full_name": caregivers_db.get(cg_email, {}).get("full_name", cg_email)}
        for cg_email in patient.get("authorized_users", [])
    ]

    return {
        "patient":       patient,
        "access_code":   patient.get("access_code"),
        "journal":       sorted(journal_db.get(patient_id, []),   key=lambda x: x.get("timestamp", ""), reverse=True),
        "sessions":      sorted(logs_db.get(patient_id, {}).get("sessions", []), key=lambda x: x.get("timestamp", ""), reverse=True)[:30],
        "help_requests": sorted(requests_db.get(patient_id, []),  key=lambda x: x.get("timestamp", ""), reverse=True),
        "memory_box":    sorted(memory_db.get(patient_id, []),    key=lambda x: x.get("timestamp", ""), reverse=True),
        "caregivers":    caregivers_info,
    }


# ─────────────────────────────────────────────
# 5. CARE JOURNAL
# ─────────────────────────────────────────────
@app.get("/api/journal/{patient_id}")
def get_journal(patient_id: str, email: str):
    patients_db = load_json(PATIENTS_FILE)
    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, email)
    journal_db = load_json(JOURNAL_FILE)
    return sorted(journal_db.get(patient_id, []), key=lambda x: x.get("timestamp", ""), reverse=True)


@app.post("/api/journal")
def add_journal_entry(data: JournalEntryCreate):
    patients_db   = load_json(PATIENTS_FILE)
    caregivers_db = load_json(CAREGIVERS_FILE)
    journal_db    = load_json(JOURNAL_FILE)

    patient = patients_db.get(data.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, data.author_email)

    author = caregivers_db.get(data.author_email.lower(), {})
    entry = {
        "entry_id":    short_id("J"),
        "patient_id":  data.patient_id,
        "author_email": data.author_email.lower(),
        "author_name": author.get("full_name", data.author_email),
        "content":     data.content,
        "type":        data.type,
        "timestamp":   get_timestamp(),
    }

    if data.patient_id not in journal_db:
        journal_db[data.patient_id] = []
    journal_db[data.patient_id].append(entry)
    save_json(JOURNAL_FILE, journal_db)
    return entry


# ─────────────────────────────────────────────
# 6. HELP REQUESTS
# ─────────────────────────────────────────────
@app.get("/api/help-requests/{patient_id}")
def get_help_requests(patient_id: str, email: str):
    patients_db = load_json(PATIENTS_FILE)
    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, email)
    requests_db = load_json(HELP_REQUESTS_FILE)
    return sorted(requests_db.get(patient_id, []), key=lambda x: x.get("timestamp", ""), reverse=True)


@app.post("/api/help-requests")
def create_help_request(data: HelpRequestCreate):
    patients_db   = load_json(PATIENTS_FILE)
    caregivers_db = load_json(CAREGIVERS_FILE)
    requests_db   = load_json(HELP_REQUESTS_FILE)

    patient = patients_db.get(data.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, data.author_email)

    author = caregivers_db.get(data.author_email.lower(), {})
    request = {
        "request_id":   short_id("HR"),
        "patient_id":   data.patient_id,
        "author_email": data.author_email.lower(),
        "author_name":  author.get("full_name", data.author_email),
        "title":        data.title,
        "description":  data.description,
        "status":       "open",
        "claimed_by":   None,
        "claimed_name": None,
        "timestamp":    get_timestamp(),
    }

    if data.patient_id not in requests_db:
        requests_db[data.patient_id] = []
    requests_db[data.patient_id].append(request)
    save_json(HELP_REQUESTS_FILE, requests_db)
    return request


@app.post("/api/help-requests/{request_id}/claim")
def claim_help_request(request_id: str, data: ClaimRequest):
    patients_db   = load_json(PATIENTS_FILE)
    caregivers_db = load_json(CAREGIVERS_FILE)
    requests_db   = load_json(HELP_REQUESTS_FILE)
    email_key     = data.claimer_email.lower().strip()

    target_pid = None
    target_idx = None
    for pid, reqs in requests_db.items():
        for i, r in enumerate(reqs):
            if r.get("request_id") == request_id:
                target_pid = pid
                target_idx = i
                break
        if target_pid:
            break

    if target_pid is None:
        raise HTTPException(status_code=404, detail="Help request not found.")

    require_authorized(patients_db.get(target_pid, {}), email_key)

    req = requests_db[target_pid][target_idx]
    if req["status"] != "open":
        raise HTTPException(status_code=400, detail="Already claimed or completed.")

    author = caregivers_db.get(email_key, {})
    req["status"]       = "claimed"
    req["claimed_by"]   = email_key
    req["claimed_name"] = author.get("full_name", email_key)
    requests_db[target_pid][target_idx] = req
    save_json(HELP_REQUESTS_FILE, requests_db)
    return req


@app.post("/api/help-requests/{request_id}/complete")
def complete_help_request(request_id: str, data: ClaimRequest):
    patients_db = load_json(PATIENTS_FILE)
    requests_db = load_json(HELP_REQUESTS_FILE)
    email_key   = data.claimer_email.lower().strip()

    for pid, reqs in requests_db.items():
        for i, r in enumerate(reqs):
            if r.get("request_id") == request_id:
                require_authorized(patients_db.get(pid, {}), email_key)
                requests_db[pid][i]["status"] = "done"
                save_json(HELP_REQUESTS_FILE, requests_db)
                return requests_db[pid][i]

    raise HTTPException(status_code=404, detail="Help request not found.")


# ─────────────────────────────────────────────
# 7. MEMORY BOX (Photo Storage)
# ─────────────────────────────────────────────
@app.get("/api/memory-box/{patient_id}")
def get_memory_box(patient_id: str, email: str):
    """Returns all photos in this patient's memory box."""
    patients_db = load_json(PATIENTS_FILE)
    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, email)
    memory_db = load_json(MEMORY_BOX_FILE)
    return sorted(memory_db.get(patient_id, []), key=lambda x: x.get("timestamp", ""), reverse=True)


@app.post("/api/memory-box/upload")
async def upload_photo(
    patient_id: str  = Form(...),
    author_email: str = Form(...),
    description: str  = Form(""),
    file: UploadFile  = File(...)
):
    """
    Accepts a multipart form upload. Saves the image to disk under uploads/,
    then records the metadata in db_memory_box.json so all caregivers can see it.

    The frontend reads the photo back from: GET /uploads/{filename}
    """
    patients_db   = load_json(PATIENTS_FILE)
    caregivers_db = load_json(CAREGIVERS_FILE)
    memory_db     = load_json(MEMORY_BOX_FILE)

    patient = patients_db.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    require_authorized(patient, author_email)

    # Validate extension
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Build a unique filename so nothing ever gets overwritten
    photo_id = short_id("IMG")
    safe_filename = f"{photo_id}{ext}"
    file_path = os.path.join(UPLOADS_DIR, safe_filename)

    # Write the file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Record metadata
    author = caregivers_db.get(author_email.lower(), {})
    photo = {
        "photo_id":           photo_id,
        "patient_id":         patient_id,
        "filename":           safe_filename,
        # URL the frontend uses to display the image
        "url":                f"http://127.0.0.1:8000/uploads/{safe_filename}",
        "description":        description.strip(),
        "uploaded_by_email":  author_email.lower(),
        "uploaded_by_name":   author.get("full_name", author_email),
        "timestamp":          get_timestamp(),
    }

    if patient_id not in memory_db:
        memory_db[patient_id] = []
    memory_db[patient_id].append(photo)
    save_json(MEMORY_BOX_FILE, memory_db)

    return photo


@app.delete("/api/memory-box/{photo_id}")
def delete_photo(photo_id: str, email: str):
    """
    Deletes the image file from disk and removes the metadata record.
    Only an authorized caregiver can delete.
    """
    patients_db = load_json(PATIENTS_FILE)
    memory_db   = load_json(MEMORY_BOX_FILE)

    # Find the photo across all patient buckets
    target_pid = None
    target_idx = None
    target_photo = None
    for pid, photos in memory_db.items():
        for i, p in enumerate(photos):
            if p.get("photo_id") == photo_id:
                target_pid   = pid
                target_idx   = i
                target_photo = p
                break
        if target_pid:
            break

    if not target_photo:
        raise HTTPException(status_code=404, detail="Photo not found.")

    require_authorized(patients_db.get(target_pid, {}), email)

    # Delete the actual file from disk
    file_path = os.path.join(UPLOADS_DIR, target_photo["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    # Remove metadata record
    memory_db[target_pid].pop(target_idx)
    if not memory_db[target_pid]:
        del memory_db[target_pid]
    save_json(MEMORY_BOX_FILE, memory_db)

    return {"success": True, "message": "Photo deleted."}


# ─────────────────────────────────────────────
# 8. SESSION LOGGING
# ─────────────────────────────────────────────

# ── LLM Chat Response ──────────────────────────────────────────────────────────
@app.post("/chat/respond")
async def chat_respond(data: ChatRequest):
    """
    Receives a patient message + conversation history and returns an LLM-generated
    companion response via Qwen2.5-3B-Instruct (llm_chat.py).

    Response shape:
    {
        "response_text": str,          # AI's spoken reply
        "ui_signal":     str,          # "NONE" | "REDIRECT" | "ALERT"
        "log_entry":     str           # Clinical tag for caregiver logs
    }

    ui_signal == "ALERT" means a Tier-3 emergency was detected — the frontend
    should surface a prominent caregiver notification immediately.
    """
    patients_db = load_json(PATIENTS_FILE)
    patient     = patients_db.get(data.patient_id, {})

    # Build the patient_info dict that llm_chat.py expects
    patient_info = {
        "name":             patient.get("full_name", ""),
        "companion_figure": "your AI companion Nura",
        "patient_story":    patient.get("patient_story", ""),
        "safe_topics":      patient.get("approved_topics", []),
        "triggers":         patient.get("known_triggers", []),
        "key_people":       patient.get("key_people", []),
    }

    payload = {
        "patient_id":   data.patient_id,
        "user_input":   data.user_input,
        "patient_info": patient_info,
        "chat_history": data.chat_history,
        # tier is auto-detected inside llm_chat when not supplied
    }

    try:
        from llm_chat import generate_response
        result = generate_response(payload)
        return result
    except Exception as exc:
        # Never crash the session — use the smart template fallback
        try:
            from llm_chat import _template_fallback, detect_tier
            tier = detect_tier(data.user_input, data.chat_history)
            return _template_fallback(data.user_input, patient_info, tier)
        except Exception:
            return {
                "response_text": "I'm right here with you. Take your time.",
                "ui_signal":     "NONE",
                "log_entry":     f"Backend LLM error: {type(exc).__name__}: {exc}",
            }


@app.post("/chat/save-session")
def save_session(data: SessionSave):
    caregivers  = load_json(CAREGIVERS_FILE)
    logs_db     = load_json(CHAT_LOGS_FILE)
    patients_db = load_json(PATIENTS_FILE)
    email_key   = data.email.lower().strip()

    caregiver = caregivers.get(email_key)
    if not caregiver or caregiver["password"] != data.password:
        raise HTTPException(status_code=401, detail="Verification failed.")

    patient_name = patients_db.get(data.patient_id, {}).get("full_name", data.full_name)

    if data.patient_id not in logs_db:
        logs_db[data.patient_id] = {"full_name": patient_name, "sessions": []}

    logs_db[data.patient_id]["sessions"].append({
        "timestamp":  get_timestamp(),
        "logged_by":  email_key,
        "end_reason": data.end_reason,   # "completed" or "early"
        "transcript": [msg.model_dump() for msg in data.messages],
    })
    save_json(CHAT_LOGS_FILE, logs_db)
    return {"success": True}


@app.get("/chat/logs")
def get_all_chat_logs():
    return load_json(CHAT_LOGS_FILE)


# ─────────────────────────────────────────────
# 9. ACCOUNT MANAGEMENT
# ─────────────────────────────────────────────
@app.post("/caregiver/delete-account")
def delete_caregiver_account(data: dict):
    email       = data.get("email", "").lower().strip()
    password    = data.get("password", "")
    caregivers  = load_json(CAREGIVERS_FILE)
    patients_db = load_json(PATIENTS_FILE)

    if email not in caregivers or caregivers[email]["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    patient_ids = caregivers[email].get("patient_ids", [])
    del caregivers[email]
    save_json(CAREGIVERS_FILE, caregivers)

    for pid in patient_ids:
        if pid in patients_db:
            authorized = [u for u in patients_db[pid].get("authorized_users", []) if u != email]
            if not authorized:
                del patients_db[pid]
            else:
                patients_db[pid]["authorized_users"] = authorized
    save_json(PATIENTS_FILE, patients_db)
    return {"success": True}

@app.get("/llm/warmup")
def llm_warmup():
    """
    Triggers background model loading without blocking.
    Call this when the user enters the chat screen.
    Returns immediately — poll /llm/status to check progress.
    """
    if _llm_load_error:
        return {"status": "error", "detail": _llm_load_error}
    try:
        import llm_chat
        if llm_chat._pipeline is not None:
            return {"status": "ready"}
    except Exception:
        pass
    threading.Thread(target=_load_llm_background, daemon=True).start()
    return {"status": "loading"}


@app.get("/llm/status")
def llm_status():
    """
    Returns the current state of the Qwen model pipeline.
      loading  – model is not yet loaded (warmup not called, or still in progress)
      ready    – model is loaded and ready
      error    – model failed to load (check server logs)
    """
    if _llm_load_error:
        return {"status": "error", "detail": _llm_load_error}
    try:
        import llm_chat
        return {"status": "ready" if llm_chat._pipeline is not None else "loading"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
    