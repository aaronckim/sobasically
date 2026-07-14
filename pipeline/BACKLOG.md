# sobasically backlog — phase-gated

Rule: nothing here starts before its gate. The critical path is the two-week test.
The site gets zero systematic investment until the feed earns it.

## Active (inside the two-week test, zero build cost)

- **Comment crowdsourcing loop** — every post ends with "drop your version in the
  comments." Feature the winning community version as the next-day post with credit
  ("your version beat mine"). Winners graduate to `data/terms.js` with credit.
  Platform moderation handles profanity; nothing renders on our site unreviewed.
- **Contemplative Claude B-side** — one episode during the test: real screenshots of
  the AI genuinely musing on culture (why 6-7 is funny, what parasocial says about
  us). Same three-beat infra as Teaching AI, inverted tone. Never script fake
  consciousness; real outputs only.

## Gate: two-week test PASSES (see README thresholds)

- **Submission → editorial queue (the earpass pattern, ported)** — site gets a
  "submit your version" form + failed searches get logged. NOT live generation:
  Netlify Forms/function appends to a queue; a daily local Claude Code session
  (Aaron's subscription, no public API key) drafts in-voice entries from the queue;
  Aaron approves; redeploy. Voice control preserved, zero abuse surface, near-zero
  cost. Earpass itself (localhost server + jsonl + watcher) does NOT port —
  it's single-user on Aaron's machine; only the queue pattern does.
- **Search-miss logging** — instrument site search to log misses into the same
  queue. (Live Claude-API search fallback stays parked indefinitely: public LLM
  endpoint = API key + rate limiting + abuse surface + off-voice output. The async
  queue gives 90% of the value at 1% of the risk.)

## Gate: ~10K followers or a repeatable hit format (season 2)

- **Campus man-on-the-street** — 5-question term quiz, sobasically as the lifeline;
  boomers-with-slang / students-on-finance variants. Production-heavy (filming
  days, stranger releases, editing) — breaks the 5 hr/wk cap, so it waits until
  the account has proven legs. Decide then: Aaron on camera vs. hire a student
  creator (rev-share).

## Gate: day ~60 with compounding followers

- **Newsletter spin-off** — "one complicated thing, dumbed down, daily" email
  capture on the site; the owned-audience asset (1440/Morning Brew endgame).
