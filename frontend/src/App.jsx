import { useState } from "react";
import { AlertCircle } from "lucide-react";
import TranscriptPanel from "./components/TranscriptPanel";
import SummaryResults from "./components/SummaryResults";
import { summarizeTranscript, transcribeAudio } from "./api";
import "./App.css";

export default function App() {
  const [transcript, setTranscript] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [summary, setSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState(null);

  async function handleSummarize() {
    setError(null);
    setIsSummarizing(true);
    try {
      const result = await summarizeTranscript(transcript, meetingTitle);
      setSummary(result);
    } catch (err) {
      setError(err.message || "Something went wrong while summarizing.");
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handleTranscribeAudio(file) {
    setError(null);
    setIsTranscribing(true);
    try {
      const { transcript: text } = await transcribeAudio(file);
      setTranscript((prev) => (prev ? prev + "\n\n" + text : text));
    } catch (err) {
      setError(err.message || "Something went wrong while transcribing audio.");
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="letterhead">
          <span className="kicker">MEETING SUMMARY // AI-GENERATED</span>
          <h1>AI Meeting Summarizer</h1>
          <p>Turn a raw transcript into key points, decisions, and action items — ready to send to the whole room.</p>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <main className="main-grid">
        <TranscriptPanel
          transcript={transcript}
          setTranscript={setTranscript}
          meetingTitle={meetingTitle}
          setMeetingTitle={setMeetingTitle}
          onSummarize={handleSummarize}
          onTranscribeAudio={handleTranscribeAudio}
          isSummarizing={isSummarizing}
          isTranscribing={isTranscribing}
        />
        <SummaryResults summary={summary} />
      </main>

      <footer className="app-footer">
        <span>Built with FastAPI + React · powered by the OpenAI API</span>
      </footer>
    </div>
  );
}
