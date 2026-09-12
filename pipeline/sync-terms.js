#!/usr/bin/env node
// Regenerates data/terms.js from the content sheet.
//
//   node pipeline/sync-terms.js terms.csv          # write data/terms.js
//   node pipeline/sync-terms.js terms.csv --check  # verify only, no write
//   node pipeline/sync-terms.js --url <csv-url>    # pull a published sheet
//
// The sheet is the source of truth. data/terms.js is generated output —
// don't hand-edit it, your changes get overwritten on the next sync.
//
// Only rows with status `approved` or `live` ship. A human sets those;
// `draft` is where AI-assisted writing waits for an ear. See VOICE-BRIEF.md.

const fs = require('fs');
const path = require('path');

const CATS = ['medicine', 'ai', 'finance', 'science', 'culture'];
const BANNERS = {
  medicine: 'MEDICINE',
  ai: 'AI & TECH',
  finance: 'FINANCE',
  science: 'SCIENCE',
  culture: 'INTERNET CULTURE',
};
const SHIPPABLE = ['approved', 'live'];
const STATUSES = ['draft', 'approved', 'live', 'cut'];
const OUT = path.join(__dirname, '..', 'data', 'terms.js');

// ————— CSV —————

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift().map(h => h.trim().toLowerCase());
  return rows
    .filter(r => r.some(cell => cell.trim() !== ''))
    .map((r, n) => {
      const obj = { __line: n + 2 };
      header.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
      return obj;
    });
}

// ————— validation —————

const errors = [], warnings = [];
const err = (row, msg) => errors.push(`  row ${row.__line} (${row.term || '?'}): ${msg}`);
const warn = (row, msg) => warnings.push(`  row ${row.__line} (${row.term || '?'}): ${msg}`);

function validate(rows) {
  const seen = new Map();

  for (const row of rows) {
    for (const f of ['term', 'cat', 'formal', 'basically']) {
      if (!row[f]) err(row, `missing required field "${f}"`);
    }
    if (row.cat && !CATS.includes(row.cat)) {
      err(row, `unknown category "${row.cat}" (expected: ${CATS.join(', ')})`);
    }
    const status = row.status || 'draft';
    if (!STATUSES.includes(status)) {
      err(row, `unknown status "${status}" (expected: ${STATUSES.join(', ')})`);
    }
    if (row.term) {
      const key = row.term.toLowerCase();
      if (seen.has(key)) err(row, `duplicate of row ${seen.get(key)}`);
      else seen.set(key, row.__line);
    }

    // Voice lint — warnings only. The sheet nags; it never blocks.
    // Rules from pipeline/VOICE.md, the Scribbler's seven.
    if (SHIPPABLE.includes(status) && row.basically) {
      const b = row.basically;
      if (b.split(/\s+/).length > 14) warn(row, `"basically" is ${b.split(/\s+/).length} words — the Scribbler lands under ~12`);
      if (/—/.test(b)) warn(row, `"basically" has an em-dash — punch with a period instead`);
      if (!/[.!?"']$/.test(b)) warn(row, `"basically" doesn't end with a period`);
      if (/\d/.test(b)) warn(row, `"basically" contains a number — stats belong in "hot"`);
    }
  }
}

// ————— render —————

const js = s => JSON.stringify(s);

function render(rows) {
  const shipped = rows.filter(r => SHIPPABLE.includes(r.status || 'draft'));
  const out = [
    '// sobasically.com term repository',
    '// Each entry: term, cat (science|medicine|ai|finance|culture), formal (the complicated version),',
    '// basically (the dumbed-down version), hot (optional: why it has traction right now)',
    '//',
    '// GENERATED FILE — do not edit by hand.',
    '// Source of truth is the content sheet; regenerate with pipeline/sync-terms.js.',
    'window.TERMS = [',
  ];

  const chunks = [];
  for (const cat of CATS) {
    const inCat = shipped.filter(r => r.cat === cat);
    if (!inCat.length) continue;
    const lines = [`  // ————— ${BANNERS[cat]} —————`];
    for (const r of inCat) {
      const entry = [
        `  { term: ${js(r.term)}, cat: ${js(r.cat)},`,
        `    formal: ${js(r.formal)},`,
        r.hot ? `    basically: ${js(r.basically)},` : `    basically: ${js(r.basically)} },`,
      ];
      if (r.hot) entry.push(`    hot: ${js(r.hot)} },`);
      lines.push(entry.join('\n'));
    }
    chunks.push(lines.join('\n'));
  }

  let body = chunks.join('\n\n');
  body = body.replace(/,$/, ''); // last entry takes no trailing comma
  out.push(body, '];', '');
  return { text: out.join('\n'), count: shipped.length };
}

// ————— main —————

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const urlIdx = args.indexOf('--url');
  let csv;

  if (urlIdx !== -1) {
    const url = args[urlIdx + 1];
    if (!url) { console.error('--url needs a URL'); process.exit(2); }
    const res = await fetch(url);
    if (!res.ok) { console.error(`fetch failed: ${res.status} ${res.statusText}`); process.exit(2); }
    csv = await res.text();
  } else {
    const file = args.find(a => !a.startsWith('--'));
    if (!file) { console.error('usage: node pipeline/sync-terms.js <csv> [--check]'); process.exit(2); }
    csv = fs.readFileSync(file, 'utf8');
  }

  const rows = parseCSV(csv);
  validate(rows);

  if (errors.length) {
    console.error(`\n${errors.length} error(s) — nothing written:\n${errors.join('\n')}\n`);
    process.exit(1);
  }

  const { text, count } = render(rows);
  const byStatus = rows.reduce((acc, r) => {
    const s = r.status || 'draft';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  if (check) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== text) {
      console.error('data/terms.js is out of sync with the sheet. Run without --check to update.');
      process.exit(1);
    }
    console.log('data/terms.js is in sync.');
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`Wrote ${count} terms to data/terms.js`);
  }

  console.log(`Sheet: ${rows.length} rows — ` +
    Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(', '));

  if (warnings.length) {
    console.log(`\n${warnings.length} voice warning(s) — shipped anyway, but give them an ear:\n${warnings.join('\n')}`);
  }
}

main().catch(e => { console.error(e); process.exit(2); });
