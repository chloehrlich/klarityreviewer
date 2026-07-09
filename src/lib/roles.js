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

// A signal reads as "enablement-flavored" when it isn't just personal process
// work but is aimed at bringing peers along — captured either by an
// enablement/adoption Category or by adoption/peer language in the description.
// This is the distinction the spec draws between a Champion and a strong
// performer who happens to have some scaling/knowledge signals (e.g. Rob).
const ENABLEMENT_CATEGORY = /enablement|adoption/i;
const ENABLEMENT_DESC =
  /\b(peer|peers|junior|juniors|onboard|onboarding|mentor|coach|taught|teaching|reused|reuse|rollout|share-?outs?|go-to|adoption|onto|team engaged|kept the broader team)\b/i;

function isEnablementFlavored(signal) {
  return (
    CHAMPION_TYPES.includes(signal.Type) &&
    (ENABLEMENT_CATEGORY.test(signal.Category || "") ||
      ENABLEMENT_DESC.test(signal.Description || ""))
  );
}

/**
 * Champion if >= 40% of signals are one of the enablement-flavored champion
 * types AND actually enablement-flavored (peer-driven, not just personal
 * process improvement) — else Process Performer. Simple heuristic per the spec;
 * a manual override exists in the UI for the borderline cases.
 */
export function detectRole(signals) {
  if (!signals || signals.length === 0) return ROLE_PROCESS;
  const enablementCount = signals.filter(isEnablementFlavored).length;
  const ratio = enablementCount / signals.length;
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
