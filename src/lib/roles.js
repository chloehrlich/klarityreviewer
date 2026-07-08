// Role auto-detection + thin-signal rule. Shared by the UI (to preselect the
// role and mode) and mirrored in the serverless prompt so generation is grounded
// in the same categorization.

// Signal types that indicate enablement / champion behavior.
export const CHAMPION_TYPES = [
  "Knowledge Documentation",
  "Collaboration Communication",
  "Scaling Best Practice",
  "Risk Mitigation",
];

export const STRENGTH_TYPES = ["Personal Strength", "Personal Proficiency"];

export const ROLE_PROCESS = "Process Performer";
export const ROLE_CHAMPION = "Champion";

/**
 * Champion if >= 40% of signals are enablement-flavored types, else Process
 * Performer. Simple heuristic per the spec; a manual override exists in the UI.
 */
export function detectRole(signals) {
  if (!signals || signals.length === 0) return ROLE_PROCESS;
  const championCount = signals.filter((s) =>
    CHAMPION_TYPES.includes(s.Type)
  ).length;
  const ratio = championCount / signals.length;
  return ratio >= 0.4 ? ROLE_CHAMPION : ROLE_PROCESS;
}

/**
 * Thin signals: fewer than 5 signals, OR no Personal Strength/Proficiency
 * evidence. Either forces Ask mode. (Catches Alex Turner at 4 signals.)
 */
export function isThinSignal(signals) {
  const count = signals ? signals.length : 0;
  const hasStrength = (signals || []).some((s) =>
    STRENGTH_TYPES.includes(s.Type)
  );
  return count < 5 || !hasStrength;
}

/** Distinct signal types present, in first-seen order. Used to explain Ask mode. */
export function signalTypes(signals) {
  const seen = [];
  for (const s of signals || []) {
    if (!seen.includes(s.Type)) seen.push(s.Type);
  }
  return seen;
}
