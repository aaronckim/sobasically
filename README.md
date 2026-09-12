# so basically.

**sobasically.com** — Urban Dictionary for complicated things. Complex terms, dumbed down
to a few words or a sentence. `Mastectomy = no more boobs.`

For researchers, patients, students, and anyone who nodded along in a meeting without
knowing the word. ELI5 energy, dictionary looks.

## Features

- **Today's so basically** — deterministic daily featured term
- **The feed** — shuffled stream of entries, "more, please" pagination
- **Search** (`/` to focus) across terms, definitions, and traction notes
- **Browse** by category: AI & tech, medicine, science, finance, internet culture
- Copy + permalink per entry (`#term-slug` deep links)

## Stack

Static HTML/CSS/JS. No build step, no dependencies. Content lives in `data/terms.js`.

## Run

```
python3 -m http.server 8642
```

## Add a term

Add a row to the content sheet, then regenerate:

```
node pipeline/sync-terms.js <sheet-export.csv>
```

`data/terms.js` is **generated** — don't hand-edit it. The sheet is the source of
truth, so the person with the best ear doesn't need a terminal to use it. Only
rows a human marked `approved` or `live` ship.

See `pipeline/COLLABORATION.md` for the two-editor loop and
`pipeline/VOICE-BRIEF.md` for the voice doc to paste into an AI assistant.
