"""
Core AI logic for the Meeting Summarizer.

Responsibilities:
- Take a raw transcript (any length) and turn it into a structured summary
  (key points, decisions, action items with owners, participants).
- Transcribe audio recordings to text before summarizing.
"""

import json
import os
import tempfile
from typing import List, Optional

import google.generativeai as genai
from pydantic import BaseModel, Field

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = os.getenv("SUMMARY_MODEL", "gemini-2.5-flash")


# --------------------------------------------------------------------------
# Data models
# --------------------------------------------------------------------------

class ActionItem(BaseModel):
    task: str
    owner: str = "Unassigned"
    due_date: Optional[str] = None


class MeetingSummary(BaseModel):
    title: str
    executive_summary: str
    key_points: List[str] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    action_items: List[ActionItem] = Field(default_factory=list)
    participants: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Prompts
# --------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a meticulous executive assistant who turns raw meeting \
transcripts into structured, accurate meeting minutes.

Return ONLY a single valid JSON object with exactly these keys:
{
  "title": "short descriptive meeting title, inferred from context if not stated",
  "executive_summary": "3-5 sentence plain-language overview of what the meeting covered and why it mattered",
  "key_points": ["5-10 concise bullet points capturing the main discussion topics, in the order raised"],
  "decisions": ["explicit decisions or agreements the group actually reached - not topics merely discussed"],
  "action_items": [{"task": "what needs to be done", "owner": "person's name, or Unassigned if no owner was stated", "due_date": "date or timeframe if mentioned, else null"}],
  "participants": ["names of people who appear to have spoken or been addressed in the transcript"]
}

Rules:
- Base everything strictly on the transcript text. Never invent names, decisions, or deadlines that are not there.
- A "decision" requires explicit agreement ("let's go with...", "we've decided...", "agreed:"), not just an idea someone floated.
- An action item's owner must be a name mentioned in the transcript; use "Unassigned" only if truly no one was named.
- Keep key_points factual and specific enough to be useful without re-reading the transcript.
"""

# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------

def summarize_transcript(transcript: str, meeting_title: Optional[str] = None) -> MeetingSummary:
    """Turn a transcript into a MeetingSummary."""
    transcript = transcript.strip()

    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SYSTEM_PROMPT,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.2,
        }
    )

    user_prompt = (
        f"Meeting title (if known): {meeting_title or 'unknown - infer one'}\n\n"
        f"Transcript:\n{transcript}"
    )

    response = model.generate_content(user_prompt)
    data = json.loads(response.text)
    return MeetingSummary(**data)


def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Transcribe an audio recording to plain text using Gemini."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_audio:
        temp_audio.write(audio_bytes)
        temp_path = temp_audio.name

    audio_file = None
    try:
        audio_file = genai.upload_file(temp_path)
        
        model = genai.GenerativeModel(model_name=MODEL_NAME)
        prompt = "Please provide a highly accurate transcript of this audio recording. Output ONLY the raw transcript text, no other commentary."
        
        response = model.generate_content([audio_file, prompt])
        return response.text
    finally:
        os.remove(temp_path)
        if audio_file:
            try:
                genai.delete_file(audio_file.name)
            except Exception:
                pass
