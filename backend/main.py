"""
AI Meeting Summarizer - FastAPI backend.

Exposes:
  POST /api/summarize   - transcript text in, structured MeetingSummary out
  POST /api/transcribe   - audio file in, plain transcript text out
  GET  /api/health       - liveness check

In production this also serves the built React frontend (frontend/dist)
as static files, so the whole app is a single deployable service.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from summarizer import summarize_transcript, transcribe_audio

app = FastAPI(
    title="AI Meeting Summarizer",
    description="Turns meeting transcripts and recordings into structured, shareable summaries.",
    version="1.0.0",
)

# Wide-open CORS for local dev / demo purposes. If you split frontend and
# backend into separate deployments, set this to your frontend's exact origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_AUDIO_MB = 25  # Whisper's hard limit per file
ALLOWED_AUDIO_EXT = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"}


class SummarizeRequest(BaseModel):
    transcript: str
    meeting_title: Optional[str] = None


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/summarize")
async def summarize(req: SummarizeRequest):
    if not req.transcript or len(req.transcript.strip()) < 20:
        raise HTTPException(status_code=400, detail="Transcript is too short to summarize.")
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="Server is missing GEMINI_API_KEY.")

    try:
        result = summarize_transcript(req.transcript, req.meeting_title)
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the client
        raise HTTPException(status_code=502, detail=f"Summarization failed: {exc}") from exc

    return result.model_dump()


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_AUDIO_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXT))}",
        )

    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_AUDIO_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Audio file exceeds {MAX_AUDIO_MB}MB limit.")
    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(status_code=500, detail="Server is missing GEMINI_API_KEY.")

    try:
        text = transcribe_audio(audio_bytes, file.filename)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}") from exc

    return {"transcript": text}


# --------------------------------------------------------------------------
# Serve the built React app (frontend/dist copied to backend/static at
# build/deploy time) so the whole app ships as a single web service.
# --------------------------------------------------------------------------
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
