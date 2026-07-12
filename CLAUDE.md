# sobasically.com

Urban Dictionary for complicated things: complex terms dumbed down to a sentence
("mastectomy = no more boobs"). Audience: researchers, patients, students — the ELI5 crowd.

## Stack

Static site, **no build step**. `index.html` + `styles.css` + `app.js` + `data/terms.js`.
Same pattern as dentwerks-site. Deploy target: Netlify (drag or CLI), not yet deployed.

## Structure

- `data/terms.js` — the entire content repository (`window.TERMS`), one object per term:
  `{ term, cat, formal, basically, hot? }`. Categories: `ai | medicine | science | finance | culture`.
- `app.js` — feed (daily deterministic hero pick + shuffled feed), substring search, category
  filter, a–z sort, copy/permalink per card. No dependencies.
- `styles.css` — "defaced dictionary" look: Fraunces serif on warm paper, highlighter-yellow
  marker for every "so basically" line. Category badge colors defined in `:root`.

## Content rules

- `basically` is the product: a few words or one sentence, vivid image beats accuracy.
- `formal` should sound deliberately stuffy (that's the joke) but stay factually correct.
- `hot` is optional: one line on why the term has traction right now (lookup spike, viral thread).
- Punchy but not cruel — medical entries get humor, not mockery of patients.
- Seed content came from a 2026-07-12 /last30days run
  (`~/Documents/Last30Days/complex-terms-and-concepts-people-ask-to-have-explained-simply-eli5-raw-v3.md`).

## Dev

Preview: `python3 -m http.server` from repo root (see `.claude/launch.json`).
Verify UI changes at mobile viewport (375px) with a screenshot — Aaron's standing convention.
