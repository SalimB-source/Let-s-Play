// Traduction en de l’article /news/tech/claude-api-rust-anthropic-25-novembre — vérifiée à la publication (aucun repli français).
const fields = {
  "accent": "REWRITTEN IN RUST.",
  "category": "TECH · AI ENGINEERING",
  "dek": "Anthropic publishes the technical story of moving its Messages API from Python to Rust: about 70% less CPU per request and 20% faster median time to first token, with no service outage.",
  "lead": "The post appeared on 25 November on Anthropic’s site, written by six engineers from the API team. It describes a migration carried out between March and September 2026 on the service that carries customer traffic, but also Claude Code and Cowork: in two and a half years, request volume grew roughly 1,800 times.",
  "intro": "This is an experience report published by the company itself. The performance figures come from its own production charts; we report them as such, without presenting them as an independent measurement. The code is not open.",
  "h2": "THE CODE WAS NOT THE PROBLEM",
  "p1": "Written in Python in 2023, the service started as little more than a request forwarder. Two years later, every call had to be validated, turned into a prompt, tokenized, screened by safety classifiers, then sorted between text, reasoning and tool calls. Claude produced a first version of the Rust request path in about a week; trusting the result took months.",
  "p2": "First attempt: rewrite only the parsing of model replies. It saved 8% to 10% of CPU, but every token crossed the Python–Rust boundary three times. The full migration was therefore launched, with one obstacle: the roughly 700 integration tests were coupled to the Python implementation. In the audit, more than a hundred assertions had been weakened.",
  "quote": "Verification, not generation, had become the bottleneck.",
  "quoteBy": "ANTHROPIC, ENGINEERING POST OF 25 NOVEMBER 2026",
  "h2b": "PRODUCTION AS THE VERIFIER",
  "p3": "In April, the Rust version passed 98% of its tests but matched only about a quarter of the inputs seen in production. The team therefore sent live traffic to both versions side by side, comparing every stage — validation, settings, prompt — without ever reading customer requests: only the shape and size of the differences were recorded. The model was called only once and its output replayed to Rust, to neutralise its nondeterminism.",
  "p4": "Three loops then ran together: a fast sandbox to test one hypothesis, a check on shadowed traffic after each fix, and a memory of corrections turned into rules and tests. Public traffic moved to Rust in September 2026. Reported gains: about 70% less CPU per request in the measured region, more than 80% less memory, and a median time to first token down about 20%. One caveat: these figures cover API orchestration, not inference.",
  "takeText": "Anthropic moved its Messages API from Python to Rust by comparing each stage on duplicated live traffic, without reading customer requests. Reported gains: about 70% less CPU and more than 80% less memory per request, and a median time to first token down about 20%; public traffic moved to Rust in September 2026.",
  "title": "CLAUDE API",
  "cover": "CLAUDE API · RUST MIGRATION",
  "credit": "Official share image for the note “Migrating our Messages API to Rust”, published by Anthropic on 25 November 2026. © Anthropic. Brand illustration, not a result from our newsroom.",
  "imageCredit": "Official share image for the note “Migrating our Messages API to Rust”, published by Anthropic on 25 November 2026. © Anthropic. Brand illustration, not a result from our newsroom.",
  "imageAlt": "Official share image for Anthropic’s engineering note on moving its Messages API to Rust. © Anthropic.",
  "readTime": "4 MIN READ",
  "take": "KEY TAKEAWAY",
  "sourceDetail": "Read the official source",
  "source": "Official source: ANTHROPIC, engineering post of 2026-11-25."
};
export default fields;
