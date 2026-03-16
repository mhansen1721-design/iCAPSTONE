"""
llm_chat.py  –  Nura AI companion response engine
===================================================
Architecture: Template-first, LLM-as-enhancement.

The smart template handles every message correctly and immediately.
The LLM is attempted as an upgrade — its output only replaces the
template if it passes strict quality validation.

Photo / memory-box logic has been removed entirely from this module.
The ChatView detects photo-related keywords client-side and surfaces
the Scrapbook feature independently.

Three-tier model:
  Tier 1  –  Normal / mild confusion      ->  direct, warm engagement
  Tier 2  –  Emotional distress           ->  validation-first empathy
  Tier 3  –  Emergency / safety risk      ->  immediate ALERT, no LLM
"""

from __future__ import annotations

import json
import re
import logging
import datetime
import random
from typing import Any

logger = logging.getLogger("nura.llm")

# ── Singleton pipeline ────────────────────────────────────────────────────────
_pipeline: Any = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        import platform
        import torch
        from transformers import pipeline

        on_mac = platform.system() == "Darwin"
        if on_mac:
            device_kwargs = {"device": "cpu", "torch_dtype": torch.float32}
            logger.info("[LLM] macOS — CPU + float32")
        else:
            device_kwargs = {"device_map": "auto", "torch_dtype": torch.float16}
            logger.info("[LLM] Non-Mac — device_map=auto + float16")

        _pipeline = pipeline(
            "text-generation",
            model="Qwen/Qwen2.5-0.5B-Instruct",
            **device_kwargs,
        )
        logger.info("[LLM] Model ready.")
    return _pipeline


# ── Tier detection ────────────────────────────────────────────────────────────
_TIER3 = {
    "i fell", "i've fallen", "i can't move", "cannot move", "chest hurts", "chest pain",
    "can't breathe", "cannot breathe", "there's a fire", "i smell smoke", "something's burning",
    "kill myself", "want to die", "end my life", "suicide",
    "too many pills", "overdose", "took too many pills",
    "i'm bleeding", "not breathing", "i'm unconscious", "call 911", "call an ambulance",
}
_TIER2 = {
    "scared", "afraid", "anxious", "panic", "panicked", "frustrated", "angry", "furious",
    "upset", "lonely", "alone", "nobody cares", "no one cares", "burden",
    "better off without me", "crying", "can't stop crying", "lost my mind",
    "losing my mind", "miserable", "worried",
}


def detect_tier(user_input: str, chat_history: list[dict]) -> int:
    recent   = " ".join(m.get("content", "") for m in chat_history[-3:])
    combined = (user_input + " " + recent).lower()
    for kw in _TIER3:
        if kw in combined:
            logger.warning("[LLM] Tier 3 keyword: '%s'", kw)
            return 3
    for kw in _TIER2:
        if kw in combined:
            return 2
    return 1


# ── LLM output validation ─────────────────────────────────────────────────────
_BAD_PATTERNS = [
    # Third-person / caregiver voice
    r"\bthe patient\b",
    r"\bthe user\b",
    r"\bpatient (mentioned|said|stated|expressed|asked|is|has)\b",
    r"\buser (mentioned|said|asked|wants|is)\b",
    r"\bthey (went|said|mentioned|asked|told|was|were|did|has|have)\b",
    r"\bwho did they\b",
    # Greeting loops
    r"^hey \w+[!,]",
    r"\bhowdy\b",
    r"\bhello there\b",
    # Generic assistant openers that never answer anything
    r"^sure thing[!,]",
    r"^of course[!,]",
    r"^absolutely[!,]",
    r"^great question[!,]",
    r"^certainly[!,]",
    r"^happy to help",
    r"^glad you asked",
    # Pure question responses with no preceding statement
    r"^who\b.{0,60}\?$",
    r"^what kind\b.{0,60}\?$",
    r"^what type\b.{0,60}\?$",
    r"^what would\b.{0,60}\?$",
    r"^where\b.{0,60}\?$",
    r"^when\b.{0,60}\?$",
    r"^how\b.{0,60}\?$",
    # Response that is ONLY a question — must have a statement first
    r"^[A-Z][^.!]{5,60}\?$",
    # Irrelevant analyst questions
    r"what.?s the (current )?weather\b",
    r"\bwas this someone specific\b",
    r"\bis there anything else you.?d like to know\b",
    r"\bwhat kind of advice do you need\b",
    r"\bwhat aspect (of|would)\b",
    r"\bcan you (please )?provide more\b",
    r"\bcould you (please )?clarify\b",
    # Generic AI filler
    r"\bi.?m here to help\b",
    r"\bi am here to help\b",
    r"\bhow can i (help|assist) you\b",
    r"\bas an ai\b",
    r"\bi am an ai\b",
    # Repetition
    r"(.{20,})\1",
]


def _is_good_llm_response(text: str) -> bool:
    stripped = text.strip()
    if len(stripped) < 10:
        return False
    lower = stripped.lower()
    for pat in _BAD_PATTERNS:
        if re.search(pat, lower):
            logger.info("[LLM] Rejected — pattern '%s': %r", pat, stripped[:80])
            return False
    if not re.search(r"[a-zA-Z]{3,}", stripped):
        return False
    return True


# ── Factual knowledge base ────────────────────────────────────────────────────
# Keyed by topic keyword. Each entry is (direct_answer, follow_up_question).
# The template uses these to give real answers before inviting conversation.
_FACTS: dict[str, list[tuple[str, str]]] = {
    # Gardening
    "tomato": [
        ("Tomatoes love full sun and warm soil — plant them deep with just the top leaves showing and water regularly at the base.", "Do you have a favourite spot in the garden for them?"),
        ("Tomatoes do best in a sunny spot. Pinch off the side shoots as they grow and they'll put all their energy into the fruit.", "Have you grown them before?"),
    ],
    "rose": [
        ("Roses love a sunny spot and well-drained soil. Prune them back in early spring and feed them in summer for the best blooms.", "Did you have roses in your garden?"),
        ("The key with roses is deadheading — snip off the spent blooms and they keep flowering all summer.", "What colour roses do you like best?"),
    ],
    "garden": [
        ("Gardening is so rewarding. Spring is the best time to plant most things — the soil warms up and everything wants to grow.", "What did you like growing most?"),
        ("A good garden needs sun, water, and a little patience. Even a small patch can give you so much joy.", "What's your favourite thing about being in the garden?"),
    ],
    "plant": [
        ("Most plants are happiest with good light and regular watering — not too much, not too little. The soil should feel just slightly damp.", "Do you have a favourite plant?"),
    ],
    "flower": [
        ("Flowers make any space feel alive. Marigolds, pansies, and sweet peas are all easy to grow and very cheerful.", "What flowers have you always loved?"),
    ],
    "vegetable": [
        ("Vegetables like beans, courgettes and salad leaves are wonderfully easy to grow from seed. They taste so much better from the garden.", "What vegetables did you used to grow?"),
    ],
    # Cooking / food
    "cook": [
        ("Cooking is such a lovely skill. The secret to most dishes is good ingredients and taking your time — nothing beats a home-cooked meal.", "What's your favourite thing to cook?"),
    ],
    "bake": [
        ("Baking is so satisfying. The trick is to measure carefully and not open the oven too soon.", "Did you have a favourite thing to bake?"),
    ],
    "recipe": [
        ("The best recipes are often the simplest ones — a few good ingredients done well.", "Is there a dish you remember making that you particularly loved?"),
    ],
    "bread": [
        ("Homemade bread is one of life's great pleasures. Kneading the dough and then that smell when it comes out of the oven is wonderful.", "Have you ever made bread from scratch?"),
    ],
    # Nature / seasons
    "bird": [
        ("Birds are wonderful to watch. Robins, blue tits, and sparrows are some of the most common garden visitors — they love sunflower seeds.", "Did you used to watch the birds?"),
    ],
    "tree": [
        ("Trees are remarkable — some of them have been standing for hundreds of years. Oak trees can live for over a thousand years.", "Do you have a favourite tree?"),
    ],
    "season": [
        ("Each season has its own beauty. Spring with the blossoms, summer warmth, autumn colours, and the quiet of winter.", "Which season do you like best?"),
    ],
    "spring": [
        ("Spring is such a hopeful time of year — everything coming back to life, the days getting longer, and the first flowers appearing.", "What do you love most about spring?"),
    ],
    "summer": [
        ("Summer days are the best for being outdoors — long evenings, warm air, and everything in full bloom.", "What do you remember doing on summer days?"),
    ],
    "autumn": [
        ("Autumn is beautiful — the leaves turn the most wonderful shades of red and gold before they fall.", "Do you enjoy the autumn colours?"),
    ],
    "winter": [
        ("Winter has its own quiet magic — cosy evenings by the fire, the crispness in the air, and sometimes a little snow.", "What do you like about wintertime?"),
    ],
    # Animals
    "dog": [
        ("Dogs are such loyal companions. They always seem to know when you need cheering up.", "Have you ever had a dog?"),
    ],
    "cat": [
        ("Cats are wonderful — independent but affectionate on their own terms. A purring cat is one of the most comforting sounds.", "Have you ever had a cat?"),
    ],
    # Music
    "music": [
        ("Music has such a powerful way of bringing memories back. A song can take you right back to a moment in time.", "What kind of music have you always loved?"),
    ],
    "song": [
        ("Songs are like little time machines — they take you straight back to when you first heard them.", "Is there a song that always makes you smile?"),
    ],
    # Travel / places
    "travel": [
        ("Travelling opens your eyes to so much. Even somewhere not too far from home can feel like a completely different world.", "What's the most memorable place you've ever been to?"),
    ],
    "holiday": [
        ("Holidays are such precious times — a chance to relax, explore, and make memories with people you love.", "What's your favourite holiday memory?"),
    ],
    "beach": [
        ("There's something so restorative about the beach — the sound of the waves, the fresh air, the feeling of sand underfoot.", "What do you love most about being at the beach?"),
    ],
}


def _get_factual_response(lower_input: str, name: str) -> tuple[str, str] | None:
    """
    Check user input against the factual knowledge base.
    Returns (response_text, log_tag) or None if no match.
    """
    for keyword, entries in _FACTS.items():
        if keyword in lower_input:
            answer, follow_up = random.choice(entries)
            return f"{answer} {follow_up}", f"Facts — {keyword}"
    return None


# ── Smart template (primary / guaranteed-good response) ───────────────────────
def _template_response(user_input: str, patient_info: dict, tier: int) -> dict:
    """
    Rule-based responses that are always contextually correct.
    Checks the factual knowledge base first so questions get real answers.
    """
    name       = patient_info.get("name") or "friend"
    safe_raw   = patient_info.get("safe_topics") or []
    safe       = [s.lower() for s in safe_raw]
    people_raw = patient_info.get("key_people") or []
    lower      = user_input.lower()

    def _r(text: str, signal: str = "NONE", log: str = "Template") -> dict:
        return {"response_text": text, "ui_signal": signal, "log_entry": log}

    # ── Tier 3 ──────────────────────────────────────────────────────────────
    if tier == 3:
        return _r(
            "Please stay still and stay calm — I'm alerting someone to help you right now. You are not alone.",
            "ALERT", "TIER-3 emergency"
        )

    # ── Tier 2 ──────────────────────────────────────────────────────────────
    if tier == 2:
        pool = [
            f"I hear you, {name}, and your feelings are completely valid. You're safe with me.",
            f"That sounds really hard. I'm right here with you, {name} — take a slow breath.",
            f"It makes sense to feel that way. You're not alone in this, {name}.",
            f"I'm so glad you told me. Let's just take a moment together, {name}.",
        ]
        if safe:
            pool.append(f"You're doing wonderfully, {name}. Would it help to think about {random.choice(safe)}?")
        return {"response_text": random.choice(pool), "ui_signal": "REDIRECT", "log_entry": "Template Tier 2"}

    # ── Tier 1: contextual routing ────────────────────────────────────────

    # Date / time
    if re.search(r"\b(what year|what date|what time|what day|what month|what.?s today)\b", lower):
        today = datetime.date.today()
        return _r(f"It's {today.strftime('%B %d, %Y')}, {name}. You're doing great.", log="Template — date")

    # Disorientation
    if re.search(r"\b(where am i|who are you|what is this|what.?s going on|i.?m confused|i don.?t know where)\b", lower):
        return _r(
            f"You're safe at home, {name}, and I'm Nura — your friendly companion. Everything is okay.",
            "REDIRECT", "Template — disorientation"
        )

    # "Who" questions — try to answer from key_people
    if re.search(r"\bwho\b", lower):
        for p in people_raw:
            pname    = p.get("name", "") if isinstance(p, dict) else str(p)
            relation = p.get("relation", "") if isinstance(p, dict) else ""
            if pname and pname.lower() in lower:
                resp = f"{pname} is your {relation}." if relation else f"That's {pname}, someone special in your life."
                return _r(resp, log=f"Template — who:{pname}")
        pool = [
            f"What a lovely thing to think about, {name}. Tell me more about who you're thinking of.",
            f"I love that you're remembering people. Who's on your mind?",
        ]
        return _r(random.choice(pool), log="Template — who (generic)")

    # ── Factual knowledge base — try this BEFORE generic fallbacks ───────────
    fact = _get_factual_response(lower, name)
    if fact:
        text, log = fact
        return _r(text, log=log)

    # Positive statements ("I like...", "I love...", "I enjoy...", "I remember...")
    if re.search(r"\b(i like|i love|i enjoy|i used to|my favour|i remember|i miss|i cherish)\b", lower):
        # Try factual match on the subject of their statement
        pool = [
            f"That sounds really lovely, {name}. Tell me more about that.",
            f"I love hearing that, {name}. Those are the best kinds of memories.",
            f"How wonderful, {name} — that clearly means a lot to you.",
            f"What a beautiful thing to share. What's your favourite memory of it?",
        ]
        return _r(random.choice(pool), log="Template — positive statement")

    # "Let's talk about X" — extract the topic and engage with it
    topic_match = re.search(r"let.?s talk about (.+)", lower)
    if topic_match:
        topic = topic_match.group(1).strip().rstrip(".")
        # Try factual knowledge first
        fact2 = _get_factual_response(topic, name)
        if fact2:
            text, log = fact2
            return _r(text, log=log)
        pool = [
            f"{topic.capitalize()} is a wonderful subject, {name}. What do you enjoy most about it?",
            f"I'd love to hear your thoughts on {topic}, {name}. What comes to mind?",
            f"Tell me about your experience with {topic}, {name}.",
        ]
        return _r(random.choice(pool), log=f"Template — talk about:{topic}")

    # Place / event mentions
    place_match = re.search(
        r"\b(beach|park|garden|trip|holiday|vacation|party|wedding|birthday|lake|mountain|forest|church|school|home|house)\b",
        lower
    )
    if place_match:
        word = place_match.group(1)
        pool = [
            f"What a wonderful thing to remember, {name}. What do you recall most about that {word}?",
            f"Those {word} memories are so special. What was it like?",
            f"I love that you're thinking about that {word}, {name}. What stands out?",
        ]
        return _r(random.choice(pool), log=f"Template — place:{word}")

    # Generic — lean on safe topics or just be present
    topic_nudge = (
        f"Would you like to talk about {random.choice(safe)}?"
        if safe else "What else is on your mind?"
    )
    pool = [
        f"Tell me more about that, {name}. {topic_nudge}",
        f"That's really interesting, {name}. {topic_nudge}",
        f"I love our conversations, {name}. {topic_nudge}",
    ]
    return _r(random.choice(pool), log="Template — generic")


# ── LLM prompt ────────────────────────────────────────────────────────────────
def _build_prompt(patient_info: dict, tier: int, user_input: str, history_block: str) -> list[dict]:
    name       = patient_info.get("name") or "friend"
    companion  = patient_info.get("companion_figure") or "Nura"
    story      = patient_info.get("patient_story") or "Not provided."
    safe_raw   = patient_info.get("safe_topics") or []
    safe       = ", ".join(safe_raw) or "their personal memories"
    people_raw = patient_info.get("key_people") or []
    people     = ", ".join(
        f"{p['name']} ({p['relation']})" if isinstance(p, dict) else str(p)
        for p in people_raw
    ) or "family and friends"
    trig_raw   = patient_info.get("triggers") or []
    triggers   = ", ".join(trig_raw) or "none"
    year       = datetime.date.today().year

    tier_note = {
        1: f"Normal conversation. Answer {name} directly. ui_signal: NONE.",
        2: f"{name} is distressed. Validate briefly then offer warm grounding. ui_signal: REDIRECT.",
        3: f"EMERGENCY. Tell {name} to stay still, help is coming. ui_signal: ALERT.",
    }.get(tier, "")

    system = f"""You are {companion}, speaking directly with {name} who has dementia.

RULES (every response must follow all):
1. Speak TO {name}. NEVER say "the patient" or "the user".
2. ANSWER their message in your first sentence. Do not lead up to it.
3. 1-2 sentences maximum. Stop after 2.
4. NEVER open with "Hey {name}!" — you are already mid-conversation.
5. NEVER ask "what's the weather" — you have no weather data.
6. Do not ask clarifying analyst questions. Just respond warmly.
7. At most one question per response. Often zero.
8. Do not echo back what they said. Just respond.
9. If they ask the year, it is {year}.

Background: {story}
Key people: {people}
Safe topics: {safe}
Avoid: {triggers}

SITUATION: {tier_note}

OUTPUT: valid JSON only — no markdown, no extra text.
{{"response_text": "...", "ui_signal": "NONE|REDIRECT|ALERT", "log_entry": "..."}}"""

    user_msg = (
        f"{history_block}\n\n{name}: \"{user_input}\"\n\nNura (JSON only):"
        if history_block else
        f"{name}: \"{user_input}\"\n\nNura (JSON only):"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user",   "content": user_msg},
    ]


# ── Response parser ───────────────────────────────────────────────────────────
def _parse(raw: str) -> dict | None:
    text = raw.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    def _field(f):
        match = re.search(rf'"{f}"\s*:\s*"([^"]+)"', text)
        return match.group(1) if match else None
    rt = _field("response_text")
    if rt:
        return {"response_text": rt, "ui_signal": _field("ui_signal") or "NONE", "log_entry": _field("log_entry") or "partial parse"}
    return None


# ── Main entry point ──────────────────────────────────────────────────────────
def generate_response(payload: dict) -> dict:
    """
    1. Always generate a guaranteed-good template response first.
    2. Attempt LLM upgrade.
    3. If LLM passes strict validation, use it. Otherwise keep template.
    4. Return final result — no photo logic here (handled client-side).
    """
    user_input   = payload.get("user_input", "").strip()
    patient_info = payload.get("patient_info", {})
    chat_history = payload.get("chat_history", [])

    tier = int(payload.get("detected_tier") or detect_tier(user_input, chat_history))
    tier = max(1, min(3, tier))
    logger.info("[LLM] Tier %d | %r", tier, user_input[:80])

    # Tier 3 — skip model entirely
    if tier == 3:
        return {
            "response_text": "Please stay still and stay calm — I'm alerting someone to help you right now. You are not alone and help is on the way.",
            "ui_signal": "ALERT",
            "log_entry": "TIER-3: Emergency",
        }

    # Step 1: guaranteed template response
    result = _template_response(user_input, patient_info, tier)

    # Step 2: attempt LLM upgrade
    try:
        name = patient_info.get("name") or "friend"
        history_lines = []
        for msg in chat_history[-4:]:
            role    = name if msg.get("role") == "user" else "Nura"
            content = msg.get("content", "").strip()
            if content:
                history_lines.append(f"{role}: {content}")
        history_block = "\n".join(history_lines)

        messages   = _build_prompt(patient_info, tier, user_input, history_block)
        generator  = get_pipeline()

        from transformers import GenerationConfig
        gen_config = GenerationConfig(
            max_new_tokens=80,
            do_sample=True,
            temperature=0.3,
            repetition_penalty=1.3,
        )

        output = generator(messages, generation_config=gen_config, return_full_text=False)
        raw = output[0]["generated_text"]
        if isinstance(raw, list):
            raw = raw[-1].get("content", "") if raw else ""

        parsed = _parse(raw)
        if parsed:
            llm_text = parsed.get("response_text", "")
            if _is_good_llm_response(llm_text):
                # LLM passed — use it
                logger.info("[LLM] Using LLM response: %r", llm_text[:80])
                return {
                    "response_text": llm_text,
                    "ui_signal":     parsed.get("ui_signal", "NONE"),
                    "log_entry":     parsed.get("log_entry", "LLM response"),
                }
            else:
                logger.info("[LLM] LLM output rejected — keeping template.")

    except Exception as exc:
        logger.warning("[LLM] Generation failed (%s) — keeping template.", exc)

    # Step 3: return template
    return result


# ── Template fallback alias (called directly by main.py on hard errors) ───────
def _template_fallback(user_input: str, patient_info: dict, tier: int) -> dict:
    return _template_response(user_input, patient_info, tier)
