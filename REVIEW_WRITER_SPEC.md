# Signal → Review (working name) — Build Spec

A web app that turns a Klarity signal digest into a manager-ready performance review. For the Klarity onsite AI Build (30% of evaluation). Demo is Thursday — prioritize working + polished over feature-complete.

## Stack
- React + Vite (same as Pacer)
- Vercel deploy, one serverless function: `/api/generate` that calls the Anthropic API (key in env var `ANTHROPIC_API_KEY`, never in client)
- Model: claude-sonnet-4-6, JSON output

## Data
- `src/data/signals.json` (provided) — 6 people keyed by name, each an array of signal rows:
  `Title, Type, Description, Session Date, Time, Duration, Tools, Category`
- People: Rob Callahan (14 signals), Marcus Lin (11), Sam Rios (10), Nina Alvarez (10), Dana Osei (7), Alex Turner (4 — thin-signal edge case)
- Signal Types: Personal Strength, Scaling Best Practice, Knowledge Documentation, Process Friction, Personal Proficiency, Collaboration Communication, Risk Mitigation

## UI (single page)
1. Header: app name + one-line tagline
2. Person dropdown (the 6 names) + optional CSV upload (parse with papaparse; group rows by `Pinned By`)
3. Role selector: auto-detected (Process Performer / Champion) with manual override toggle
4. Signal panel: compact list of the selected person's signals (Type badge + Title), so the audience sees the raw input
5. "Generate review" button → loading state → output
6. Output panel, two modes:
   - **Review mode**: Summary / Strengths (each with a "Signal:" evidence line) / Growth Areas / Suggested Goals — plus "Copy as Markdown" button
   - **Ask mode** (thin signals): explanation of why a review wasn't drafted + 3–5 specific questions for the manager

## Role auto-detection
Champion if ≥40% of signals are Knowledge Documentation / Collaboration Communication / Scaling Best Practice / Risk Mitigation AND enablement-flavored — else Process Performer. Simple heuristic is fine; the override exists for a reason.

## Thin-signal rule
If a person has <5 signals OR no Personal Strength/Proficiency signals → force Ask mode. (Catches Alex Turner at 4.)

## Design
Klarity brand feel: white/cream background (#FFF8F2-ish), Klarity orange (#FF5C00-range) accents, dark charcoal text, rounded cards, generous whitespace. Clean and executive, not playful. No purple gradients.

## The generation prompt (core of the app — serverless function sends this)

System prompt:

```
You draft performance reviews for a manager, grounded ONLY in a provided signal digest from Klarity (a work-capture platform). Rules:

1. SIGNAL-GROUNDED: Every claim must trace to a specific signal. Never invent projects, metrics, or behaviors. Each strength cites its signal title.
2. BALANCED: Real strengths AND honest growth areas. Process Friction signals are growth material — frame constructively (e.g., a friction the person surfaced is partly a contribution). No hype doc.
3. ROLE-AWARE: role = {{ROLE}}.
   - Process Performer: emphasize execution quality, throughput, accuracy, process discipline, tool adoption.
   - Champion: emphasize enablement, peer influence, adoption driven, knowledge codified, risk surfaced. Do not judge champions on personal process volume.
4. MANAGER-READY: first person plural or neutral manager voice, specific, sendable with light edits. No corporate filler.
5. THIN SIGNALS: if the digest is sparse (<5 signals) or lacks strength evidence, DO NOT draft a review. Return ask mode with specific questions the manager should answer to fill the gaps.

Return ONLY valid JSON:
{"mode":"review","summary":"...","strengths":[{"point":"...","evidence":"signal title"}],"growth_areas":[{"point":"...","evidence":"signal title"}],"goals":["..."]}
or
{"mode":"ask","reason":"...","observed":["what the few signals DO show"],"questions":["..."]}
```

User message: person name, role, and the signal rows as JSON.

## Acceptance tests
- Rob → solid performer review, every strength cites a signal
- Marcus vs Rob → visibly different framing (enablement vs execution)
- Alex → Ask mode, questions reference his actual 2 signal types
- Uploaded CSV with a new person → works
- Copy button produces clean markdown

## Explicitly out of scope
PDF export, auth, saving history, multi-person batch.
