import { useMemo, useRef, useState } from "react";
import demoData from "./data/signals.json";
import {
  detectRole,
  isThinSignal,
  ROLE_PROCESS,
  ROLE_CHAMPION,
} from "./lib/roles.js";
import { parseCsvToPeople } from "./lib/csv.js";
import SignalPanel from "./components/SignalPanel.jsx";
import OutputPanel from "./components/OutputPanel.jsx";

export default function App() {
  // People come from the bundled demo data, extended by any CSV upload.
  const [people, setPeople] = useState(demoData);
  const names = useMemo(() => Object.keys(people), [people]);

  const [selected, setSelected] = useState(names[0]);
  const [roleOverride, setRoleOverride] = useState(null); // null = use auto-detect
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadNote, setUploadNote] = useState(null);
  const fileInput = useRef(null);

  const signals = people[selected] || [];
  const autoRole = useMemo(() => detectRole(signals), [signals]);
  const role = roleOverride || autoRole;
  const thin = useMemo(() => isThinSignal(signals), [signals]);

  function onSelectPerson(name) {
    setSelected(name);
    setRoleOverride(null);
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseCsvToPeople(file);
      const merged = { ...people, ...parsed };
      setPeople(merged);
      const firstNew = Object.keys(parsed)[0];
      onSelectPerson(firstNew);
      setUploadNote(
        `Loaded ${Object.keys(parsed).length} person(s) from ${file.name}.`
      );
    } catch (err) {
      setUploadNote(err.message);
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function onGenerate() {
    setStatus("loading");
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selected, role, signals, thin }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setResult(data);
      setStatus("done");
    } catch (err) {
      // Graceful fallback: clear error state, never a hard crash.
      setError(err.message || "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <span className="brandmark">
          <span className="brand-dot" />
        </span>
        <h1>Throughline</h1>
        <p>
          The throughline from a person's Klarity signals to a manager-ready
          review — every claim grounded in evidence.
        </p>
      </header>

      <div className="grid">
        {/* Left: controls + raw signals */}
        <div>
          <div className="card">
            <h2>Input</h2>

            <div className="field">
              <label htmlFor="person">Person</label>
              <select
                id="person"
                value={selected}
                onChange={(e) => onSelectPerson(e.target.value)}
              >
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n} · {people[n].length} signals
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Upload CSV (optional)</label>
              <button
                className="upload-btn"
                onClick={() => fileInput.current?.click()}
              >
                Choose a CSV export…
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv"
                onChange={onUpload}
                style={{ display: "none" }}
              />
              <div className="hint">
                {uploadNote || 'Rows grouped by the "Pinned By" column.'}
              </div>
            </div>

            <div className="field">
              <label>Role</label>
              <div className="role-row">
                <button
                  className={
                    "role-pill" + (role === ROLE_PROCESS ? " active" : "")
                  }
                  onClick={() => setRoleOverride(ROLE_PROCESS)}
                >
                  Process Performer
                </button>
                <button
                  className={
                    "role-pill" + (role === ROLE_CHAMPION ? " active" : "")
                  }
                  onClick={() => setRoleOverride(ROLE_CHAMPION)}
                >
                  Champion
                </button>
              </div>
              <div className="role-auto">
                Auto-detected: <strong>{autoRole}</strong>
                {roleOverride ? " · manually overridden" : ""}
                {thin ? " · thin signals → Ask mode" : ""}
              </div>
            </div>

            <button
              className="generate"
              onClick={onGenerate}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Generating…" : "Generate review"}
            </button>
          </div>

          <SignalPanel signals={signals} />
        </div>

        {/* Right: output */}
        <OutputPanel
          status={status}
          result={result}
          error={error}
          personName={selected}
          signals={signals}
        />
      </div>
    </div>
  );
}
