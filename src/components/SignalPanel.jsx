import { CHAMPION_TYPES } from "../lib/roles.js";

// Compact list of the selected person's signals so the audience sees the raw
// input the review is grounded in. Enablement-flavored types get the accent
// badge; everything else is neutral.
export default function SignalPanel({ signals }) {
  return (
    <div className="card">
      <h2>
        Signals
        <span className="count-chip">{signals.length} captured</span>
      </h2>
      <div className="signal-list">
        {signals.map((s, i) => (
          <div className="signal-item" key={i}>
            <span
              className={
                "badge" + (CHAMPION_TYPES.includes(s.Type) ? "" : " neutral")
              }
            >
              {s.Type}
            </span>
            <span className="signal-title">{s.Title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
