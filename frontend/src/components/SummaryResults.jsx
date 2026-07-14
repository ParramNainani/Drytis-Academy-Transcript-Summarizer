import { useState } from "react";
import { Copy, Check, Download, Users, ClipboardList } from "lucide-react";

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function summaryToMarkdown(summary) {
  const lines = [`# ${summary.title}`, "", summary.executive_summary, ""];
  lines.push("## Key points");
  summary.key_points.forEach((p) => lines.push(`- ${p}`));
  lines.push("", "## Decisions");
  summary.decisions.forEach((d) => lines.push(`- ${d}`));
  lines.push("", "## Action items");
  summary.action_items.forEach((a) => {
    lines.push(`- [ ] ${a.task} — **${a.owner}**${a.due_date ? ` (due ${a.due_date})` : ""}`);
  });
  lines.push("", "## Participants");
  lines.push(summary.participants.join(", "));
  return lines.join("\n");
}

export default function SummaryResults({ summary }) {
  const [copied, setCopied] = useState(false);

  if (!summary) {
    return (
      <section className="panel results-panel results-empty">
        <div className="stamp-mark" aria-hidden="true">
          <svg viewBox="0 0 80 80" width="64" height="64">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M24 42 L34 52 L56 28" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Nothing on the record yet</h3>
        <p>Add a transcript on the left and generate a summary — the structured minutes will appear here, ready to share.</p>
      </section>
    );
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(summaryToMarkdown(summary));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleDownload() {
    const blob = new Blob([summaryToMarkdown(summary)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel results-panel">
      <div className="panel-header results-header">
        <div>
          <span className="kicker">02 — MINUTES ON RECORD</span>
          <h2>{summary.title}</h2>
        </div>
        <div className="export-actions">
          <button type="button" className="chip-button" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="chip-button" onClick={handleDownload}>
            <Download size={14} /> Download
          </button>
        </div>
      </div>

      <p className="executive-summary">{summary.executive_summary}</p>

      <div className="results-grid">
        <div className="result-block">
          <h3 className="block-title">Key points</h3>
          <ul className="key-points-list">
            {summary.key_points.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="result-block">
          <h3 className="block-title">Decisions</h3>
          {summary.decisions.length === 0 ? (
            <p className="empty-note">No explicit decisions were recorded.</p>
          ) : (
            <ul className="decisions-list">
              {summary.decisions.map((d, i) => (
                <li key={i}>
                  <span className="stamp-tag stamp-decided">Decided</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="result-block">
        <h3 className="block-title">
          <ClipboardList size={16} /> Action items
        </h3>
        {summary.action_items.length === 0 ? (
          <p className="empty-note">No action items were identified.</p>
        ) : (
          <table className="action-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Owner</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {summary.action_items.map((item, i) => (
                <tr key={i}>
                  <td>{item.task}</td>
                  <td>
                    <span className="owner-cell">
                      <span className="owner-badge" title={item.owner}>
                        {item.owner === "Unassigned" ? "?" : initials(item.owner)}
                      </span>
                      {item.owner}
                    </span>
                  </td>
                  <td className="due-cell">{item.due_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="result-block">
        <h3 className="block-title">
          <Users size={16} /> Participants
        </h3>
        <div className="participants-row">
          {summary.participants.map((p, i) => (
            <span className="participant-chip" key={i}>
              <span className="owner-badge owner-badge-sm">{initials(p)}</span>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
