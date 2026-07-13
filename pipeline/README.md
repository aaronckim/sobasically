# sobasically weekly content pipeline

Turns social-listening data into a punch-up sheet of ready-to-post daily terms.
The feed is the product; the site is the archive. See `docs/STRATEGY-PROMPT.md`.

## The weekly loop (~1 hr of Aaron-time)

1. **Refresh listening data** (optional but better): run `/last30days` on
   "complex terms people ask to have explained simply" and/or the week's hot
   category. Raw dumps land in `~/Documents/Last30Days/*-raw-v3.md`.
   ⚠️ Python 3.14 needs `export SSL_CERT_FILE=$(python3 -m certifi)` first,
   else Reddit/HN/GitHub/TikTok silently return 0 results.
2. **Run the workflow** (from Claude Code):
   `Workflow({scriptPath: "pipeline/weekly-terms.workflow.js", args: {...}})`
   with args:
   - `weekLabel`: e.g. `"2026-07-20"`
   - `dumps`: paths of fresh raw dumps to mine
   - `existingTerms`: current term names from `data/terms.js`
     (`grep -o 'term: "[^"]*"' data/terms.js`) — dedup guard
   - `voiceSamples`: a handful of live `term → basically` lines
   - `pickCount`: 14 (two weeks of dailies) or 7
3. **Punch-up pass (the human part, ~30 min):** open the generated
   `CANDIDATES-<date>.md`, pick the winner of each card's 3 options, sharpen.
   Your ear is the product — the pipeline only gets you to "good draft".
4. **Produce + schedule:** one text card (X/IG) + one 15–30s short (TikTok)
   per term, batched. Post 1/day.
5. **Winners graduate to the site:** only terms that performed as posts get
   added to `data/terms.js`. The site never gets unproven terms.

## What the workflow does

- **Mine** (parallel): one agent per raw dump + 3 web sweeps
  (AI jargon this week / non-AI news-spike terms / what short-form
  explainer creators are covering and which phrasings won).
- **Rank**: dedups against the live site + across sources, then one judge
  scores on confusion demand, comedy potential, timeliness, safety.
- **Draft**: per top term — stuffy `formal`, 3 `basically` options,
  `hot` line, and a scroll-stopper `hook` for the post, in house voice.

Output: `pipeline/CANDIDATES-<weekLabel>.md`.

## Test thresholds (from the 2026-07 pre-mortem)

14 daily posts on TikTok + X.
- **Pass:** ≥1 post >10K views, or ≥300 net new followers, or median
  save+share ≥1.5%.
- **Kill:** best post <2K views AND <100 followers → freeze to Tier 0,
  fold terms into the UGC swipe file.
- Time cap 5 hrs/week is a kill criterion, not a guideline.
