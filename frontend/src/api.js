// In dev, Vite proxies /api to the local FastAPI server (see vite.config.js).
// In production, the backend serves the built frontend itself, so relative
// /api paths hit the same origin automatically. Set VITE_API_BASE only if
// you deploy frontend and backend as two separate services.
const API_BASE = import.meta.env.VITE_API_BASE || "";

async function parseJsonOrThrow(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // response wasn't JSON (e.g. a proxy error page) - fall through
  }
  if (!res.ok) {
    const message = body?.detail || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export async function summarizeTranscript(transcript, meetingTitle) {
  const res = await fetch(`${API_BASE}/api/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, meeting_title: meetingTitle || null }),
  });
  return parseJsonOrThrow(res);
}

export async function transcribeAudio(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: formData,
  });
  return parseJsonOrThrow(res);
}
