# Nura Care

An AI-powered companion and care management platform for dementia patients and their caregivers. Nura Care provides a warm, personalised chat interface for patients alongside a full caregiver dashboard for monitoring wellbeing, managing care circles, and reviewing session analytics.

---

## What It Does

### For Patients
- A conversational AI companion tailored to the patient's personality, memories, and safe topics
- Voice-first interaction with automatic speech recognition (ASR)
- Customisable avatar companions (Seal, Jellyfish, Bee, Turtle)
- A Memory Box photo viewer that patients can browse by voice during chat
- Tiered safety monitoring — mild confusion through critical distress — with caregiver alerts

### For Caregivers
- Secure login and multi-patient management dashboard
- Patient profile configuration: dementia stage, key people, approved topics, known triggers, and listening preferences
- **Care Circle** — invite family members and co-caregivers to share updates, help requests, and memory photos
- **Analytics Dashboard** — weekly emotion scores, confusion/distress event tracking, keyword clouds, engagement metrics, and AI-generated care summaries powered by Google Gemini
- Exportable weekly care reports (PDF-ready HTML)
- Full session log review with transcript search

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Dev server and bundler |
| Tailwind CSS | Styling |
| Lucide React | Icons |
| Recharts | Analytics charts |
| Web Speech API | Browser-native ASR for chat |
| Google Gemini API (`@google/genai`) | AI caregiver insights in analytics |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.11 | Runtime |
| FastAPI | REST API framework |
| Uvicorn | ASGI server |
| Conda | Environment management |
| Qwen / Gemini LLM | AI chat responses |
| Transformers + PyTorch | Local LLM inference (Qwen) |

### Project Structure
```
iCAPSTONE/
├── Frontend/
│   └── nura-care/          # Vite + React app
│       ├── views/           # Page-level components
│       ├── components/      # Shared components (Avatar, etc.)
│       └── types/           # TypeScript type definitions
└── Backend/
    └── main.py              # FastAPI app entry point
```

---

## Prerequisites

- **Node.js** — download from https://nodejs.org/en/download
- **Conda** — for managing the Python backend environment
- A **Google Gemini API key** for AI insights (set as `VITE_GEMINI_API_KEY` in your `.env`)

---

## Running the Project

You need **two terminals running simultaneously** — one for the backend, one for the frontend.

---

### Terminal 1 — Backend

#### First-time setup
```bash
cd Backend
conda create -n backend python=3.11 -y
conda activate backend
pip install fastapi uvicorn
pip install python-multipart aiofiles
pip install torch transformers accelerate sentencepiece
uvicorn main:app --reload
```

#### Every time after
```bash
cd Backend
conda activate backend
uvicorn main:app --reload --log-level info
```

The backend API will be available at **http://127.0.0.1:8000**

To test that it's running, open **http://127.0.0.1:8000/docs** in your browser — you should see the interactive API documentation. A `200` response code means everything is working.

To stop the server: `Ctrl + C`  
To exit the environment: `conda deactivate`

---

### Terminal 2 — Frontend

#### First-time setup
```bash
cd Frontend/nura-care
npm install
npm run dev
```

#### Every time after
```bash
cd Frontend/nura-care
npm run dev
```

The frontend will be available at **http://localhost:5173**

---

### Environment Variables

Create a `.env` file inside `Frontend/nura-care/` with:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

This key powers the AI Caregiver Insights section of the Analytics Dashboard.

---

## Key Features Overview

| Feature | Location |
|---|---|
| Caregiver login & patient management | `views/Dashboard.tsx` |
| Patient profile configuration | `views/ConfigFlow.tsx` |
| AI chat session with voice | `views/ChatView.tsx` |
| Care Circle (shared updates, tasks, photos) | `views/CareCircleContent.tsx` |
| Weekly analytics & AI summaries | `views/AnalyticsDashboard.tsx` |
| Session log review | `views/SessionLog.tsx` |
| Avatar companions | `components/Avatar.tsx` |

---

## Safety System

The chat uses a three-tier keyword detection system mirrored between the frontend and backend:

| Tier | Trigger | Response |
|---|---|---|
| **Tier 1** | Confusion / disorientation | Comforting redirect to a safe topic |
| **Tier 2** | Emotional distress (scared, lonely, crying) | Grounding prompt, calm mode |
| **Tier 3** | Critical / emergency (self-harm, medical emergency) | Immediate caregiver alert — "Break Glass Mode" |

---

## Git Workflow

Always pull before making changes to avoid merge conflicts:

```bash
cd iCAPSTONE
git pull                     # get latest changes first
# ... make your changes ...
git add --all
git commit -m "your message"
git push origin main
```
