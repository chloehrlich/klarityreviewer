import { useState } from "react";

// Renders the two output modes (review / ask), plus loading, error, and empty
// states. Review mode keeps the curated review as the skimmable surface and
// tucks the underlying signal rows behind per-citation expanders, with a
// collapsed "not referenced" section so curation is transparent.
export default function OutputPanel({ status, result, error, personName, signals }) {
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

      {isAsk ? (
        <AskView result={result} />
      ) : (
        <ReviewView result={result} signals={signals || []} />
      )}
    </div>
  );
}

// --- Review mode ------------------------------------------------------------

function ReviewView({ result, signals }) {
  const index = buildIndex(signals);

  // Which signals the curated review actually cited (matched by title).
  const referenced = new Set();
  for (const item of [...(result.strengths || []), ...(result.growth_areas || [])]) {
    const key = norm(item.evidence);
    if (index.has(key)) referenced.add(key);
  }
  const unreferenced = signals.filter((s) => !referenced.has(norm(s.Title)));

  return (
    <>
      <div className="section-title">Summary</div>
      <div className="summary">{result.summary}</div>

      {result.strengths?.length > 0 && (
        <>
          <div className="section-title">
            Strengths <span className="count">({result.strengths.length})</span>
          </div>
          {result.strengths.map((s, i) => (
            <PointRow key={i} item={s} signal={index.get(norm(s.evidence))} />
          ))}
        </>
      )}

      {result.growth_areas?.length > 0 && (
        <>
          <div className="section-title">
            Growth areas{" "}
            <span className="count">({result.growth_areas.length})</span>
          </div>
          {result.growth_areas.map((g, i) => (
            <PointRow
              key={i}
              item={g}
              signal={index.get(norm(g.evidence))}
              growth
            />
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

      {unreferenced.length > 0 && (
        <details className="unreferenced">
          <summary>
            <span className="cite-caret">▸</span>
            Signals not referenced in this review ({unreferenced.length})
          </summary>
          <div className="unref-list">
            {unreferenced.map((s, i) => (
              <SignalDetail key={i} s={s} withTitle />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

// One strength / growth area: a scannable headline on the surface, with the
// one-sentence detail and the full underlying signal tucked behind a single
// expander. Skim the headlines; expand only what you want to dig into.
function PointRow({ item, signal, growth }) {
  const hasMore = Boolean(item.detail || signal || item.evidence);
  return (
    <div className={"point" + (growth ? " growth" : "")}>
      <div className="point-text">{item.point}</div>
      {hasMore && (
        <details className="citation">
          <summary>
            <span className="cite-caret">▸</span>
            <span className="cite-more">Why &amp; signal</span>
          </summary>
          {item.detail && <p className="point-detail">{item.detail}</p>}
          {signal ? (
            <SignalDetail s={signal} />
          ) : (
            item.evidence && (
              <div className="evidence">
                Signal: <strong>{item.evidence}</strong>
              </div>
            )
          )}
        </details>
      )}
    </div>
  );
}

// The full underlying signal row: type, date, duration, description, tools.
function SignalDetail({ s, withTitle }) {
  return (
    <div className="signal-detail">
      {withTitle && <div className="signal-detail-title">{s.Title}</div>}
      <div className="signal-detail-head">
        <span className="badge">{s.Type}</span>
        <span className="signal-meta">
          {s["Session Date"]}
          {s.Duration ? ` · ${s.Duration}` : ""}
        </span>
      </div>
      {s.Description && <p className="signal-desc">{s.Description}</p>}
      {s.Tools && <div className="signal-tools">Tools: {s.Tools}</div>}
    </div>
  );
}

function buildIndex(signals) {
  const map = new Map();
  for (const s of signals || []) map.set(norm(s.Title), s);
  return map;
}

function norm(title) {
  return (title || "").trim().toLowerCase();
}

// --- Ask mode ---------------------------------------------------------------

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
      lines.push(`- **${s.point}**`);
      if (s.detail) lines.push(`  ${s.detail}`);
      if (s.evidence) lines.push(`  - _Signal: ${s.evidence}_`);
    }
    lines.push("");
  }
  if (result.growth_areas?.length) {
    lines.push("## Growth Areas", "");
    for (const g of result.growth_areas) {
      lines.push(`- **${g.point}**`);
      if (g.detail) lines.push(`  ${g.detail}`);
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
