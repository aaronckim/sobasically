export const meta = {
  name: 'sobasically-weekly-terms',
  description: 'Mine trending confusing terms from last30days dumps + web, rank, draft "so basically" cards for punch-up',
  whenToUse: 'Weekly content run for the sobasically daily feed. Pass args: {weekLabel, dumps: [paths], existingTerms: [names], voiceSamples, pickCount}',
  phases: [
    { title: 'Mine', detail: 'parallel: raw dumps + fresh web sweeps' },
    { title: 'Rank', detail: 'dedup vs live site, score, pick top candidates' },
    { title: 'Draft', detail: 'card copy + feed hook per term' },
    { title: 'Series', detail: '"Teaching AI" episodes: semantic vs pragmatic gap' },
  ],
}

// args may arrive as a JSON string depending on the caller — normalize before use
const input = typeof args === 'string' ? JSON.parse(args) : (args || {})
const weekLabel = input.weekLabel
const dumps = input.dumps || []
const existing = (input.existingTerms || []).map(t => t.toLowerCase())
const voice = input.voiceSamples || ''
const pickCount = input.pickCount || 14
const seriesCount = input.seriesCount === undefined ? 2 : input.seriesCount
const usedSeriesTerms = (input.usedSeriesTerms || []).map(t => t.toLowerCase())
if (!weekLabel || !existing.length) log('WARNING: weekLabel or existingTerms missing — dedup/date context degraded')

const CAND_SCHEMA = {
  type: 'object',
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['term', 'cat', 'why_now'],
        properties: {
          term: { type: 'string' },
          cat: { type: 'string', description: 'ai | finance | science | culture | medicine' },
          why_now: { type: 'string', description: 'one line: the news hook / confusion evidence this week' },
          best_phrasings: {
            type: 'array',
            items: {
              type: 'object',
              required: ['text'],
              properties: {
                text: { type: 'string', description: 'the funniest/vividest real explanation found, verbatim or near' },
                source: { type: 'string', description: 'where it was said, e.g. r/explainlikeimfive, @handle' },
                url: { type: 'string' },
              },
            },
          },
          engagement_signal: { type: 'string', description: 'upvotes/views/likes if known' },
        },
      },
    },
  },
}

const RANK_SCHEMA = {
  type: 'object',
  required: ['ranked'],
  properties: {
    ranked: {
      type: 'array',
      items: {
        type: 'object',
        required: ['term', 'score', 'why'],
        properties: {
          term: { type: 'string' },
          score: { type: 'number', description: '0-10 composite' },
          why: { type: 'string', description: 'one line justifying the score' },
        },
      },
    },
  },
}

const DRAFT_SCHEMA = {
  type: 'object',
  required: ['term', 'cat', 'formal', 'basically_options', 'hook'],
  properties: {
    term: { type: 'string' },
    cat: { type: 'string' },
    formal: { type: 'string', description: 'the deliberately stuffy accurate version, one sentence' },
    basically_options: { type: 'array', items: { type: 'string' }, description: 'exactly 3 candidate one-liners, best first' },
    hot: { type: 'string', description: 'one line: why this term has traction right now' },
    hook: { type: 'string', description: 'first line of the TikTok/X post — the scroll-stopper, may differ from the definition' },
    best_found: {
      type: 'object',
      properties: { text: { type: 'string' }, source: { type: 'string' }, url: { type: 'string' } },
    },
  },
}

const EPISODE_SCHEMA = {
  type: 'object',
  required: ['episodes'],
  properties: {
    episodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['term', 'gap', 'beat2_prompt', 'beat2_expected_failure', 'beat3_options'],
        properties: {
          term: { type: 'string' },
          gap: { type: 'string', description: 'one line: the usage rule (license/register/act) the definition does not capture' },
          beat2_prompt: { type: 'string', description: 'the EXACT prompt Aaron pastes into a real chatbot to produce the faceplant' },
          beat2_expected_failure: { type: 'string', description: 'one line: how the AI is likely to fumble it' },
          beat3_options: { type: 'array', items: { type: 'string' }, description: 'exactly 3 deadpan rule-lines in house voice, best first' },
          safety_note: { type: 'string', description: 'only if the term needs care; omit otherwise' },
        },
      },
    },
  },
}

// ---- Phase 1: Mine (barrier is correct: Rank needs ALL candidates for cross-source dedup) ----
phase('Mine')

const minerPrompts = []

for (const dumpPath of dumps) {
  minerPrompts.push({
    label: `mine:dump:${dumpPath.split('/').pop().slice(0, 30)}`,
    prompt: `Read the file at "${dumpPath}". It is a raw social-listening dump (Reddit, X, YouTube, TikTok, HN posts with engagement numbers) from the last30days research engine.

Extract 10-20 CANDIDATE TERMS for "sobasically" — a feed that dumbs down complicated terms to one vivid line (like Urban Dictionary for complicated things, e.g. "mastectomy = no more boobs").

A good candidate is a complicated term or concept that real people in the dump are confused by, asking about, or explaining to each other: jargon, medical/finance/science terms, AI terminology, new internet-culture coinages. For each, capture the funniest or most vivid REAL explanation that appears in the dump (verbatim quote preferred) with its source and engagement numbers.

Skip terms that are already trivially understood. Prefer terms with a live news hook or high-engagement confusion evidence. Today is ${weekLabel}.`,
  })
}

minerPrompts.push({
  label: 'mine:web:ai-jargon',
  prompt: `Use WebSearch to find the AI jargon terms people are newly confused by THIS WEEK (the week ending ${weekLabel}). Look for: new coinages in AI discourse on X and tech press, terms mainstream press glossaries just added, terms spiking in "what does X mean" queries, terms from this week's AI news cycle (model launches, drama, policy). For each candidate capture the wittiest real one-line explanation you can find in the wild (quote + source + url). Return 8-15 candidates. Category "ai".`,
})

minerPrompts.push({
  label: 'mine:web:news-spikes',
  prompt: `Use WebSearch to find complicated terms spiking in public confusion THIS WEEK (week ending ${weekLabel}) OUTSIDE of AI: finance/economics terms in the news cycle, dictionary lookup spikes (Merriam-Webster trending, Dictionary.com trending), science terms from current events, policy/legal jargon from headlines. The test: a normal person hit this word in a headline this week and didn't know it. For each, capture the news hook and the best plain-English explanation found in the wild (quote + source + url). Return 8-15 candidates.`,
})

minerPrompts.push({
  label: 'mine:web:creator-gaps',
  prompt: `Use WebSearch to find which complicated terms short-form creators (TikTok/Reels/Shorts explainer accounts, X thread accounts) are explaining RIGHT NOW (week ending ${weekLabel}) and which explanations are winning (views/likes). Angles: "explained in 30 seconds", "what does X actually mean", etymology/linguistics creators, finance-explainer creators, medical-explainer creators. Goal: terms with proven short-form demand plus the phrasings that performed. Return 8-15 candidates with source + engagement numbers where visible.`,
})

const mined = (await parallel(
  minerPrompts.map(m => () => agent(m.prompt, { label: m.label, phase: 'Mine', schema: CAND_SCHEMA }))
)).filter(Boolean).flatMap(r => r.candidates)

log(`${mined.length} raw candidates mined`)

// ---- Dedup: vs the 83 live terms and across miners (plain code) ----
const seen = new Set(existing)
const fresh = []
for (const c of mined) {
  const key = c.term.toLowerCase().trim()
  if (seen.has(key)) continue
  seen.add(key)
  fresh.push(c)
}
log(`${fresh.length} after dedup vs live site + cross-source`)

// ---- Phase 2: Rank ----
phase('Rank')

const rank = await agent(
  `You are ranking candidate terms for "sobasically" — a daily feed that dumbs down one complicated term per day to a vivid one-liner. Audience: TikTok + X scrollers. The product is the joke-that-teaches.

Score each candidate 0-10 as a composite of:
- CONFUSION DEMAND (are many people actually confused by it this week?)
- COMEDY POTENTIAL (can it be compressed to one vivid, funny, shareable line?)
- TIMELINESS (live news hook beats evergreen)
- SAFETY (punchy but not cruel; medical terms get humor, never mockery of patients; skip anything where the joke lands on a victim)

Candidates (JSON): ${JSON.stringify(fresh)}

Rank ALL of them, best first.`,
  { label: 'rank:judge', phase: 'Rank', schema: RANK_SCHEMA }
)

const byName = new Map(fresh.map(c => [c.term.toLowerCase().trim(), c]))
const top = rank.ranked
  .map(r => ({ ...r, cand: byName.get(r.term.toLowerCase().trim()) }))
  .filter(r => r.cand)
  .slice(0, pickCount)
log(`Top ${top.length} selected for drafting`)

// ---- Phase 3: Draft (independent per term → pipeline, no barrier) ----
const drafts = (await parallel(
  top.map((t, i) => () =>
    agent(
      `Write the "sobasically" card for the term "${t.cand.term}" (category: ${t.cand.cat}).

Context from research — why it's hot now: ${t.cand.why_now}
Best real-world phrasings found: ${JSON.stringify(t.cand.best_phrasings || [])}

HOUSE VOICE — hard rules for every "basically" option (violating any = rewrite before returning):
1. Blunt literal truth first; metaphors rare and tiny (one image max, never an extended analogy).
2. One beat under ~12 words, or statement + punch tag of ≤6 words. The tag is the joke.
3. Second person and concrete ("your feed", "your money") wherever it fits.
4. NO numbers, stats, dates, or news in the line — that context belongs in "hot".
5. Never re-name or teach the term in the line (no "— that's disinflation"); contrast pairs use the semicolon parallel ("Training is school; inference is the job.").
6. Sentence case, ends with a period, NO em-dashes — punch with a period.
7. Deadpan, not clever. Say the scary thing like it's obvious. If it reads like a witty newsletter, cut it.
LITMUS: each line must survive sitting next to "No more boobs." on a highlighter strip.
Live examples of the register:
${voice}

CONTENT RULES:
- "basically" is the product: a few words or one sentence; a vivid image beats accuracy.
- "formal" must sound deliberately stuffy (that's the joke) but stay factually correct.
- Punchy but not cruel. Medical terms get humor, never mockery of patients.
- If a found phrasing is genuinely better than what you can write, adapt it (transformative rewrite, not verbatim repost) and keep the source credit in best_found.
- "hook" is the scroll-stopping first line for a TikTok/X post about this term — a question, a wrong-sounding claim, or the setup half of the joke.

Give exactly 3 "basically" options, best first. Verify the formal definition is factually correct before returning.`,
      { label: `draft:${t.cand.term.slice(0, 24)}`, phase: 'Draft', schema: DRAFT_SCHEMA }
    ).then(d => ({ ...d, rank_score: t.score, rank_why: t.why, why_now: t.cand.why_now, evidence: t.cand.best_phrasings || [], engagement: t.cand.engagement_signal || '' }))
  )
)).filter(Boolean)

log(`${drafts.length} cards drafted`)

// ---- Phase 4: Series ("Teaching AI" episodes) ----
let episodes = []
if (seriesCount > 0) {
  phase('Series')
  const cultureCands = fresh.filter(c => (c.cat || '').toLowerCase() === 'culture').map(c => c.term)
  const seriesResult = await agent(
    `Draft ${seriesCount} episodes of "Teaching AI" — a recurring segment for the sobasically feed.

THE PREMISE: the gap between semantic knowledge (what a word means) and pragmatic knowledge (what saying it DOES). The AI has the dictionary; it lacks the license (who may say it), register (how it's said), or act (what saying it does — e.g. an insult is a weapon, not a description). The comedy is the AI's earnest social incompetence.

EPISODE FORMAT (three beats):
1. Definition test — the AI defines the term correctly. "Definition: 10/10."
2. Application test — the AI is asked to USE it and faceplants. "Vibes: 0." (Aaron will paste your beat2_prompt into a real chatbot and screenshot the actual output — so write a prompt genuinely likely to produce a funny-but-real fumble.)
3. The rule it broke — ONE deadpan line naming the usage law it violated.

PICK TERMS with the biggest semantic-pragmatic gap. Slang/internet-culture terms work best. Candidates from this week's mining: ${JSON.stringify(cultureCands)}. Evergreen slang is also fair game. Do NOT use these already-used terms: ${JSON.stringify(usedSeriesTerms)}.

SAFETY (non-negotiable): the joke lands on the AI, never on the group a term targets. Skip slur-adjacent or group-derogatory terms unless the episode is entirely about the AI's incompetence — when in doubt, pick different slang.

BEAT-3 HOUSE VOICE — hard rules: blunt and deadpan; under ~12 words or statement + ≤6-word tag; second person where it fits; no numbers/stats/news; sentence case, ends with a period, no em-dashes; never re-explain the term. Litmus: the line must survive next to "No more boobs." Live register examples:
${voice}`,
    { label: 'series:episodes', phase: 'Series', schema: EPISODE_SCHEMA }
  )
  episodes = (seriesResult && seriesResult.episodes) || []
  log(`${episodes.length} series episodes drafted`)
}

return { weekLabel, minedCount: mined.length, freshCount: fresh.length, drafts, episodes }
