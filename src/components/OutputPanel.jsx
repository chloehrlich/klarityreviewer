import { useState } from "react";

// Renders the two output modes (review / ask), plus loading, error, and empty
// states. Review mode includes a "Copy as Markdown" button.
export default function OutputPanel({ status, result, error, personName }) {
  const [copied, setCopied] = useState(false);

  if (status === "idle") {
    return (
      <div className="card output">
        <h2>Review</h2>
        <div className="placeholder">
          Pick a person and generate a review to see it here.
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="card output">
        <h2>Review</h2>
        <div className="loading">
          <div className="spinner" />
          Drafting from signals…
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card output">
        <h2>Review</h2>
        <div className="error">
          <div className="error-title">Couldn't generate a review</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const isAsk = result.mode === "ask";

  function handleCopy() {
    navigator.clipboard.writeText(toMarkdown(result, personName)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="card output">
      <div className="output-head">
        <span className={"mode-tag " + (isAsk ? "ask" : "review")}>
          {isAsk ? "Ask mode" : "Review"}
        </span>
        {!isAsk && (
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "Copied ✓" : "Copy as Markdown"}
          </button>
        )}
      </div>

      {isAsk ? <AskView result={result} /> : <ReviewView result={result} />}
    </div>
  );
}

function ReviewView({ result }) {
  return (
    <>
      <div className="section-title">Summary</div>
      <div className="summary">{result.summary}</div>

      {result.strengths?.length > 0 && (
        <>
          <div className="section-title">Strengths</div>
          {result.strengths.map((s, i) => (
            <div className="point" key={i}>
              <div className="point-text">{s.point}</div>
              <div className="evidence">
                Signal: <strong>{s.evidence}</strong>
              </div>
            </div>
          ))}
        </>
      )}

      {result.growth_areas?.length > 0 && (
        <>
          <div className="section-title">Growth areas</div>
          {result.growth_areas.map((g, i) => (
            <div className="point" key={i}>
              <div className="point-text">{g.point}</div>
              {g.evidence && (
                <div className="evidence">
                  Signal: <strong>{g.evidence}</strong>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {result.goals?.length > 0 && (
        <>
          <div className="section-title">Suggested goals</div>
          <ul className="goals">
            {result.goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function AskView({ result }) {
  return (
    <>
      <div className="section-title">Why we didn't draft a review</div>
      <div className="summary">{result.reason}</div>

      {result.observed?.length > 0 && (
        <>
          <div className="section-title">What the signals do show</div>
          <ul className="goals">
            {result.observed.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </>
      )}

      {result.questions?.length > 0 && (
        <>
          <div className="section-title">Questions for the manager</div>
          <ul className="questions">
            {result.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// "Copy as Markdown" — clean, sendable markdown for review mode.
export function toMarkdown(result, personName) {
  const lines = [`# Performance Review — ${personName}`, ""];

  if (result.summary) {
    lines.push("## Summary", "", result.summary, "");
  }
  if (result.strengths?.length) {
    lines.push("## Strengths", "");
    for (const s of result.strengths) {
      lines.push(`- ${s.point}`, `  - _Signal: ${s.evidence}_`);
    }
    lines.push("");
  }
  if (result.growth_areas?.length) {
    lines.push("## Growth Areas", "");
    for (const g of result.growth_areas) {
      lines.push(`- ${g.point}`);
      if (g.evidence) lines.push(`  - _Signal: ${g.evidence}_`);
    }
    lines.push("");
  }
  if (result.goals?.length) {
    lines.push("## Suggested Goals", "");
    for (const g of result.goals) lines.push(`- ${g}`);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}
