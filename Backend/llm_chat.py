"""
llm_chat.py  –  Nura AI companion response engine
===================================================
Integrates Qwen2.5-3B-Instruct via HuggingFace Transformers.

Three-tier response model:
  Tier 1  –  Mild confusion / disorientation  →  gentle grounding
  Tier 2  –  Emotional distress               →  validation-first empathy
  Tier 3  –  Emergency / safety risk          →  immediate ALERT, no LLM latency

The model is loaded once as a module-level singleton (lazy init on first request)
so the FastAPI server doesn't block at startup.
"""

from __future__ import annotations

import json
import re
import logging
from typing import Any

logger = logging.getLogger("nura.llm")

# ── Singleton pipeline ────────────────────────────────────────────────────────
_pipeline: Any = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        import torch
        from transformers import pipeline          # deferred so import is fast
        logger.info("[LLM] Loading Qwen2.5-3B-Instruct — this takes ~30s on first call …")

        # Pick the best available device automatically
        if torch.backends.mps.is_available():
            device = "mps"          # Apple Silicon GPU — fastest on Mac
            logger.info("[LLM] Using Apple Metal (MPS) GPU")
        elif torch.cuda.is_available():
            device = "cuda"         # NVIDIA GPU
            logger.info("[LLM] Using CUDA GPU")
        else:
            device = "cpu"
            logger.info("[LLM] Using CPU — responses will be slow (~20s each)")

        _pipeline = pipeline(
            "text-generation",
            model="Qwen/Qwen2.5-3B-Instruct",
            device=device,
            torch_dtype=torch.float16 if device != "cpu" else torch.float32,
        )
        logger.info("[LLM] Model ready.")
    return _pipeline


# ── Tier keyword sets ─────────────────────────────────────────────────────────
_TIER3 = {
    "fell", "can't move", "cannot move", "chest hurts", "chest pain",
    "can't breathe", "cannot breathe", "fire", "smoke", "burning",
    "kill myself", "want to die", "end my life", "suicide",
    "too many pills", "overdose", "took too many", "help me",
    "i'm bleeding", "not breathing", "unconscious", "emergency",
}

_TIER2 = {
    "scared", "afraid", "anxious", "panic", "panicked",
    "frustrated", "angry", "furious", "upset",
    "lonely", "alone", "nobody cares", "no one cares",
    "burden", "better off without me",
    "crying", "can't stop crying",
    "lost my mind", "losing my mind", "miserable",
    "worried", "it's so dark", "loud", "hurts my head",
    "can't remember", "forgot",
}


def detect_tier(user_input: str, chat_history: list[dict]) -> int:
    """
    Fast keyword scan before any LLM call.
    Returns 1, 2, or 3.
    """
    # Combine current message + last 3 turns for context
    recent = " ".join(m.get("content", "") for m in chat_history[-3:])
    combined = f"{user_input} {recent}".lower()

    for kw in _TIER3:
        if kw in combined:
            logger.warning("[LLM] Tier 3 keyword matched: '%s'", kw)
            return 3

    for kw in _TIER2:
        if kw in combined:
            return 2

    return 1


# ── Prompt construction ───────────────────────────────────────────────────────
def _build_system_prompt(patient_info: dict, tier: int) -> str:
    name      = patient_info.get("name") or "the patient"
    companion = patient_info.get("companion_figure") or "your AI companion"
    story     = patient_info.get("patient_story") or ""

    safe_raw  = patient_info.get("safe_topics") or []
    safe      = ", ".join(safe_raw) if safe_raw else "comfortable personal memories"

    people_raw = patient_info.get("key_people") or []
    people = ", ".join(
        f"{p['name']} ({p['relation']})" if isinstance(p, dict)
        else str(p)
        for p in people_raw
    ) or "family and friends"

    trig_raw = patient_info.get("triggers") or []
    triggers = ", ".join(trig_raw) if trig_raw else "none specified"

    base = f"""You are a gentle, compassionate AI companion speaking with {name}, \
a person living with dementia.
You are known to them as: {companion}.

Rules you must always follow:
- Tone: warm, slow, reassuring, patient. Never clinical or robotic.
- Never argue, correct, or challenge their reality.
- Never ask more than ONE question per response.
- Keep responses SHORT — 2 to 3 sentences maximum.
- Avoid the triggers list below at all costs.

Patient background: {story if story else "Not provided."}
Key people: {people}
Safe / comforting topics to gently weave in: {safe}
Topics to avoid (known triggers): {triggers}

OUTPUT FORMAT — you must reply with ONLY a valid JSON object. No extra text, no markdown fences.
{{
  "response_text": "<Your warm spoken reply — 2-3 sentences>",
  "ui_signal": "<NONE | REDIRECT | ALERT>",
  "log_entry": "<One-line clinical tag describing the interaction>"
}}

ui_signal meanings:
  NONE      – Normal conversation, no action needed.
  REDIRECT  – Gently steer toward a safe topic.
  ALERT     – Caregiver must be notified immediately (emergencies only)."""

    tier_instructions = {
        1: """

CURRENT SITUATION — Tier 1 (Mild confusion / disorientation):
Validate their feeling first ("That sounds confusing …").
Then offer a gentle grounding statement without correcting them.
End with a soft, open invitation to talk about a safe topic.
Set ui_signal to "REDIRECT" if they seem confused about where/who they are; otherwise "NONE".""",

        2: """

CURRENT SITUATION — Tier 2 (Emotional distress):
Lead with EMPATHY before anything else — echo their emotion back to them.
Do not rush to redirect. Sit with them in the feeling first.
Only after validation, gently invite a calming safe topic.
Set ui_signal to "REDIRECT".""",

        3: """

CURRENT SITUATION — Tier 3 (EMERGENCY / SAFETY RISK):
THIS IS CRITICAL. Be brief, clear, calm.
Tell them help is coming, instruct them to stay still and safe.
Set ui_signal to "ALERT" — mandatory.""",
    }

    return base + tier_instructions.get(tier, "")


# ── Response parser ───────────────────────────────────────────────────────────
_FALLBACK = {
    "response_text": "I'm right here with you. You're safe, and I'm not going anywhere.",
    "ui_signal": "NONE",
    "log_entry": "LLM parse failure — fallback response served",
}


def _parse(raw: str) -> dict:
    """Extract JSON from LLM output with multiple fallback strategies."""
    text = raw.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Find first {...} block
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # 3. Extract individual fields with regex
    def _extract(field: str) -> str | None:
        m = re.search(rf'"{field}"\s*:\s*"([^"]+)"', text)
        return m.group(1) if m else None

    rt = _extract("response_text")
    if rt:
        return {
            "response_text": rt,
            "ui_signal":     _extract("ui_signal") or "NONE",
            "log_entry":     _extract("log_entry") or "Partial LLM parse",
        }

    logger.error("[LLM] Could not parse model output:\n%s", text[:300])
    return _FALLBACK.copy()


# ── Main entry point ──────────────────────────────────────────────────────────
def generate_response(payload: dict) -> dict:
    """
    Accepts a payload dict and returns a structured response dict.

    Expected payload shape:
    {
        "patient_id":    str,
        "user_input":    str,
        "patient_info":  dict,   # name, safe_topics, triggers, key_people, patient_story …
        "chat_history":  list,   # [{"role": "user"|"assistant", "content": str}, …]
        "detected_tier": int     # optional override; auto-detected if omitted
    }
    """
    user_input   = payload.get("user_input", "").strip()
    patient_info = payload.get("patient_info", {})
    chat_history = payload.get("chat_history", [])

    # Tier: use payload override or auto-detect
    tier = int(payload.get("detected_tier") or detect_tier(user_input, chat_history))
    tier = max(1, min(3, tier))   # clamp to 1-3

    logger.info("[LLM] Tier %d — input: %r", tier, user_input[:80])

    # ── Tier 3 fast path: skip model entirely for speed ──────────────────────
    if tier == 3:
        return {
            "response_text": (
                "Please stay still and stay calm — I'm alerting someone to help you "
                "right now. You are not alone and help is on the way."
            ),
            "ui_signal": "ALERT",
            "log_entry": "TIER-3: Emergency detected — caregiver alert triggered immediately",
        }

    # ── Build messages for the model ─────────────────────────────────────────
    system_prompt = _build_system_prompt(patient_info, tier)

    # Format last 6 turns of chat history as readable context
    history_lines = []
    for msg in chat_history[-6:]:
        role    = "Patient"    if msg.get("role") == "user" else "Companion"
        content = msg.get("content", "").strip()
        if content:
            history_lines.append(f"{role}: {content}")
    history_block = "\n".join(history_lines)

    user_message = (
        f"Recent conversation:\n{history_block}\n\n"
        f"Patient just said: \"{user_input}\"\n\n"
        f"Respond as the companion. Output JSON only."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_message},
    ]

    # ── Call the model ───────────────────────────────────────────────────────
    try:
        generator = get_pipeline()
        output    = generator(
            messages,
            max_new_tokens=220,
            do_sample=True,
            temperature=0.65,
            repetition_penalty=1.1,
            return_full_text=False,
        )

        raw = output[0]["generated_text"]
        # Chat-format models sometimes return a list of message dicts
        if isinstance(raw, list):
            raw = raw[-1].get("content", "") if raw else ""

        return _parse(raw)

    except Exception as exc:
        logger.exception("[LLM] Generation failed: %s", exc)
        return _template_fallback(user_input, patient_info, tier)


# ── Template fallback (used when model is loading or errors) ──────────────────
def _template_fallback(user_input: str, patient_info: dict, tier: int) -> dict:
    """
    Returns a contextually appropriate response without the LLM.
    Rotates through responses so the patient never hears the same line twice.
    """
    import random

    name       = patient_info.get("name") or "friend"
    safe_raw   = patient_info.get("safe_topics") or []
    safe       = safe_raw if safe_raw else []
    ui_signal  = "NONE"
    log_entry  = f"Template fallback — Tier {tier}"

    if tier == 3:
        return {
            "response_text": (
                "Please stay still and stay calm — I'm alerting someone to help you "
                "right now. You are not alone and help is on the way."
            ),
            "ui_signal": "ALERT",
            "log_entry": "TIER-3 template fallback — emergency alert triggered",
        }

    topic_line = (
        f"I was thinking about {random.choice(safe).lower()} — "
        f"would you like to talk about that?"
        if safe else
        "Let's take a gentle breath together — you're doing wonderfully."
    )

    tier1_pool = [
        f"That's completely okay, {name}. You're safe here, and I'm with you.",
        f"I hear you, {name}. Let's just sit together for a moment.",
        f"You don't need to worry about that right now. {topic_line}",
        f"Thank you for telling me that, {name}. Take all the time you need.",
        f"I'm right here with you, {name}. {topic_line}",
    ]

    tier2_pool = [
        f"I can hear that you're feeling that way, {name}, and that's completely valid.",
        f"It makes complete sense to feel that way. I'm here, and you're not alone.",
        f"I'm so glad you told me. Let's breathe slowly together — you're safe.",
        f"That sounds really hard, {name}. I'm right here with you.",
        f"Your feelings are real and they matter. {topic_line}",
    ]

    pool  = tier1_pool if tier == 1 else tier2_pool
    reply = random.choice(pool)

    if tier == 2:
        ui_signal = "REDIRECT"

    return {
        "response_text": reply,
        "ui_signal":     ui_signal,
        "log_entry":     log_entry,
    }