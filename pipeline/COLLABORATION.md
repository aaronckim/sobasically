# Working on sobasically as two people

The problem this solves: content is the product, but content lived in
`data/terms.js` — a JavaScript file where one missing comma blanks the whole
site. That made git literacy the price of admission for editorial work, which
is backwards. The person with the better ear should not need a terminal.

So the sheet is now the source of truth, and `data/terms.js` is generated.

## The setup (one time)

1. Import `pipeline/terms-seed.csv` into a new Google Sheet
   (**File → Import → Upload → Replace spreadsheet**). Name it
   *sobasically — term sheet*. 83 rows, all `live`.
2. Share it with both editors as **Editor**.
3. Freeze row 1. Optional but worth it: add data validation on `cat`
   (`ai, medicine, science, finance, culture`), `status`
   (`draft, approved, live, cut`), and `source` (`human, ai-assisted`) so the
   dropdowns do the remembering.
4. Each editor pastes `pipeline/VOICE-BRIEF.md` into a Claude Project or
   ChatGPT Project's custom instructions, once. That's what keeps two people
   and two assistants writing in one voice.

## The columns

| column | who writes it | notes |
|---|---|---|
| `term` | either | must be unique (case-insensitive) |
| `cat` | either | `ai \| medicine \| science \| finance \| culture` |
| `formal` | either / AI | stuffy but **factually correct** — it's the fact-check on the card |
| `basically` | **a human, finally** | the product. AI drafts it; a human lands it |
| `hot` | either | optional. why it has traction now. stats live here |
| `status` | **human only** | `draft` → `approved` → `live`, or `cut` |
| `source` | either | `human` or `ai-assisted` — so you can audit which ones perform |
| `notes` | either | scratch. never ships |

**Only `approved` and `live` rows reach the site.** `draft` is the holding pen
where AI-assisted writing waits for an ear. This is the whole quality gate, and
it's deliberately the one thing a machine can't do for you.

## The loop

1. **Draft** — anyone, any time, with or without an assistant. New rows go in as
   `status: draft`. Volume here is free and fine.
2. **Punch-up** (~30 min, the part that matters) — both of you, out loud, on the
   draft rows. Pick the winner of the three `basically` options, sharpen it,
   cut the ones that are merely fine. `VOICE.md` step 3 says it: *your ear is
   the product — the pipeline only gets you to "good draft."* Survivors get
   `status: approved`.
3. **Sync** — download the sheet as CSV (**File → Download → CSV**), then:

   ```
   node pipeline/sync-terms.js ~/Downloads/sobasically\ -\ term\ sheet.csv
   ```

   It validates, regenerates `data/terms.js`, and prints any voice-rule
   warnings. Commit and push; the site updates.
4. **Graduate** — per `pipeline/README.md`, only terms that performed as posts
   should go `approved` → `live`. The site stays the archive of what worked.

## What the sync script checks

**Errors** (nothing is written until you fix them): missing `term`, `cat`,
`formal`, or `basically`; an unknown category or status; a duplicate term.

**Warnings** (it ships, but go look): a `basically` line over 14 words, an
em-dash, a missing final period, a number where a `hot` line should carry it.
These are the Scribbler's rules from `VOICE.md`, mechanized — the sheet nags,
it never blocks. A human can always overrule it, which is the correct default
for a comedy voice.

Useful in CI or before a deploy:

```
node pipeline/sync-terms.js <csv> --check   # non-zero exit if out of sync
```

## Division of labor

Tooling is not ownership. Write down who decides what, because "equal partners"
quietly erodes toward whoever can open the terminal.

- **Content, voice, ship/kill** — the editors, jointly. `VOICE.md` and
  `BACKLOG.md` are editorial documents; whoever commits them is a
  transcriptionist, not an author.
- **Site, pipeline, deploys** — whoever does the code.
- **The test thresholds** in `pipeline/README.md` are already hard numbers. Keep
  them that way. Numbers can't be won by whoever has the repo open.

## Rules of thumb for AI-assisted writing

- An assistant can write `formal` all day. It's supposed to sound generated.
- An assistant gets you to a good `basically` *draft*. It does not get you to
  the line. The gap between "fine" and "No more boobs" is the entire business.
- Never let an assistant set `status: approved`. Not a technical restriction —
  a house rule, and the one that keeps the site worth visiting.
- You have an entry for `AI slop`. Don't become a citation of it.

## Don't hand-edit `data/terms.js`

It's generated. Your changes get overwritten on the next sync. Edit the sheet.
