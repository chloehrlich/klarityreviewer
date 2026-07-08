// Runs the spec's acceptance tests locally against the real serverless core.
// Requires ANTHROPIC_API_KEY in the environment.
//
//   node scripts/acceptance.mjs
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateReview } from "../api/generate.js";
import {
  detectRole,
  isThinSignal,
  signalTypes,
} from "../src/lib/roles.js";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  readFileSync(join(here, "..", "src", "data", "signals.json"), "utf8")
);

function line(s = "") {
  console.log(s);
}

async function run(name) {
  const signals = data[name];
  const role = detectRole(signals);
  const thin = isThinSignal(signals);
  const result = await generateReview({ name, role, signals, thin });
  return { role, thin, result };
}

let passed = 0;
let failed = 0;
function check(label, ok) {
  line(`   ${ok ? "PASS" : "FAIL"} — ${label}`);
  ok ? passed++ : failed++;
}

async function main() {
  // --- Rob: full signal-cited review ---
  line("● Rob Callahan — expect a review, every strength cites a signal");
  const rob = await run("Rob Callahan");
  const robTitles = new Set(data["Rob Callahan"].map((s) => s.Title));
  line(`   detected role: ${rob.role}`);
  check("mode === 'review'", rob.result.mode === "review");
  check(
    "has strengths",
    Array.isArray(rob.result.strengths) && rob.result.strengths.length > 0
  );
  check(
    "every strength cites a real signal title",
    (rob.result.strengths || []).every(
      (s) => s.evidence && robTitles.has(s.evidence)
    )
  );
  line(`   summary: ${rob.result.summary}`);
  for (const s of rob.result.strengths || []) {
    line(`     + ${s.point}  [Signal: ${s.evidence}]`);
  }
  line();

  // --- Marcus vs Rob: champion framing, visibly different ---
  line("● Marcus Lin — expect Champion framing, distinct from Rob");
  const marcus = await run("Marcus Lin");
  line(`   detected role: ${marcus.role}`);
  check("Marcus auto-detects as Champion", marcus.role === "Champion");
  check("Rob auto-detects as Process Performer", rob.role === "Process Performer");
  check("Marcus is in review mode", marcus.result.mode === "review");
  const marcusBlob = JSON.stringify(marcus.result).toLowerCase();
  const enablementWords = [
    "enable",
    "peer",
    "adoption",
    "mentor",
    "knowledge",
    "document",
    "risk",
    "onboard",
    "influence",
  ];
  check(
    "Marcus review uses enablement/champion language",
    enablementWords.some((w) => marcusBlob.includes(w))
  );
  line(`   Marcus summary: ${marcus.result.summary}`);
  line();

  // --- Alex: Ask mode, questions reference actual signal types ---
  line("● Alex Turner — expect Ask mode grounded in his actual signal types");
  const alex = await run("Alex Turner");
  const alexTypes = signalTypes(data["Alex Turner"]);
  line(`   signal count: ${data["Alex Turner"].length}, types: ${alexTypes.join(", ")}`);
  check("thin-signal rule flags Alex", alex.thin === true);
  check("mode === 'ask'", alex.result.mode === "ask");
  check(
    "has questions",
    Array.isArray(alex.result.questions) && alex.result.questions.length >= 3
  );
  line(`   reason: ${alex.result.reason}`);
  for (const q of alex.result.questions || []) line(`     ? ${q}`);
  line();

  line("──────────────────────────────────────────");
  line(`RESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Acceptance run failed:", err.message);
  process.exit(1);
});
