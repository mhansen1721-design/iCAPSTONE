import json
import logging
from google import genai
from google.genai import types
from pydantic import BaseModel

logger = logging.getLogger("nura.analytics")

# 1. Define the EXACT JSON shape you want. Gemini guarantees it will follow this.
class WeeklyInsights(BaseModel):
    generalSummary: str
    notableConversations: list[str]
    caregiverRecommendations: list[str]

# 2. Initialize the Gemini Client
# Replace this string with the VITE_GEMINI_API_KEY you removed from React!
GEMINI_API_KEY = "api_key"
client = genai.Client(api_key=GEMINI_API_KEY)

def generate_weekly_insights(
    patient_name: str,
    week_range: str,
    session_count: int,
    total_messages: int,
    avg_score: int,
    confusion_count: int,
    distress_count: int,
    alert_count: int,
    top_keywords: list[str]
) -> dict:
    
    if session_count == 0:
        return {
            "generalSummary": "No sessions recorded this week.",
            "notableConversations": [],
            "caregiverRecommendations": []
        }

    # 3. Package the input data
    analytics_data = {
        "patientName": patient_name,
        "weekRange": week_range,
        "sessionCount": session_count,
        "totalMessages": total_messages,
        "avgScore": avg_score,
        "confusionCount": confusion_count,
        "distressCount": distress_count,
        "alertCount": alert_count,
        "topKeywords": top_keywords
    }
    
    prompt = f"Analyze this weekly session data and return the insights:\n{json.dumps(analytics_data, indent=2)}"

    try:
        # 4. Call Gemini with STRICTER formatting rules
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="""You are a clinical diagnostic assistant helping caregivers understand a dementia patient's wellbeing.
                
STRICT RULES:
1. generalSummary: Focus EXCLUSIVELY on conversational themes and the patient's emotional state. DO NOT mention numerical metrics. CRITICAL: If 'alertTriggers' contains ANY items, you MUST explicitly quote the exact trigger phrase (e.g., "want to die") in the summary. Do not be vague; name the exact trigger. NEVER claim there is "no distress" if alerts exist.
2. notableConversations: Provide a list of short topics or keywords only (2-4 words max per item). If there are alert triggers, you MUST include the EXACT trigger phrase (e.g., "want to die") as one of the tags. Do NOT use generic umbrella terms like "Emergency alert".
3. caregiverRecommendations: Provide clear, actionable advice. If there are alerts, your first recommendation MUST be to investigate that specific trigger phrase.""",
                response_mime_type="application/json",
                response_schema=WeeklyInsights, 
                temperature=0.2,
            ),
        )
        
        # Gemini returns a perfect JSON string, so we just parse it directly
        return json.loads(response.text)

    except Exception as e:
        logger.error(f"[Analytics] Gemini Generation failed: {e}")
        # Smart Fallback
        rec = "Review session transcripts and discuss with the care team immediately." if alert_count > 0 else "Continue current care plan."
        return {
            "generalSummary": "Patient completed their weekly sessions. Review transcripts for specific conversation details and emotional context.",
            "notableConversations": top_keywords[:3] if top_keywords else ["No specific topics"],
            "caregiverRecommendations": [rec]
        }