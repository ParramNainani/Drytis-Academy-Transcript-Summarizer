import { useRef, useState } from "react";
import { Upload, Mic, FileText, Sparkles, Loader2 } from "lucide-react";
import { SAMPLE_TRANSCRIPT } from "../sampleData";

const AUDIO_EXTENSIONS = [".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm"];

export default function TranscriptPanel({
  transcript,
  setTranscript,
  meetingTitle,
  setMeetingTitle,
  onSummarize,
  onTranscribeAudio,
  isSummarizing,
  isTranscribing,
}) {
  const [dragActive, setDragActive] = useState(false);
  const textFileRef = useRef(null);
  const audioFileRef = useRef(null);

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (AUDIO_EXTENSIONS.includes(ext)) {
      onTranscribeAudio(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setTranscript(e.target.result);
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <section className="panel input-panel">
      <div className="panel-header">
        <span className="kicker">01 — SOURCE MATERIAL</span>
        <h2>Drop in a transcript</h2>
        <p className="panel-subtitle">Paste text, upload a .txt file, or hand it an audio recording.</p>
      </div>

      <label className="field-label" htmlFor="meeting-title">
        Meeting title <span className="optional">(optional)</span>
      </label>
      <input
        id="meeting-title"
        className="text-input"
        type="text"
        placeholder="e.g. Q3 Product Roadmap Sync"
        value={meetingTitle}
        onChange={(e) => setMeetingTitle(e.target.value)}
      />

      <div
        className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <textarea
          className="transcript-textarea"
          placeholder={"Speaker 1: Let's start with the Q3 roadmap...\nSpeaker 2: Sure, first item is...\n\n(or drag a .txt / audio file anywhere in this box)"}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className="input-toolbar">
        <div className="toolbar-actions">
          <button
            type="button"
            className="chip-button"
            onClick={() => textFileRef.current?.click()}
          >
            <FileText size={14} /> Upload .txt
          </button>
          <button
            type="button"
            className="chip-button"
            onClick={() => audioFileRef.current?.click()}
            disabled={isTranscribing}
          >
            {isTranscribing ? <Loader2 size={14} className="spin" /> : <Mic size={14} />}
            {isTranscribing ? "Transcribing…" : "Upload audio"}
          </button>
          <button
            type="button"
            className="chip-button chip-button-ghost"
            onClick={() => {
              setTranscript(SAMPLE_TRANSCRIPT);
              setMeetingTitle("Q3 Product Roadmap Sync");
            }}
          >
            Try a sample
          </button>
        </div>
        <span className="word-count">{wordCount.toLocaleString()} words</span>
      </div>

      <input
        ref={textFileRef}
        type="file"
        accept=".txt"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={audioFileRef}
        type="file"
        accept={AUDIO_EXTENSIONS.join(",")}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        type="button"
        className="primary-button"
        onClick={onSummarize}
        disabled={isSummarizing || transcript.trim().length < 20}
      >
        {isSummarizing ? (
          <>
            <Loader2 size={16} className="spin" /> Reading the room…
          </>
        ) : (
          <>
            <Sparkles size={16} /> Generate summary
          </>
        )}
      </button>
    </section>
  );
}
