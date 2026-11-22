const fields = {
  "accent": "CHECK BEFORE ACTING.",
  "category": "TECH · AI AGENTS",
  "dek": "On 20 November, Google presents Semantic governance policies in Preview in Gemini platform. They evaluate an agent’s proposed tool calls before execution.",
  "lead": "An agent allowed to send email should not necessarily send any file to anyone. That distinction is central to Google’s Semantic governance policies: check the specific action, not just the general permission.",
  "intro": "The system is announced in Preview. It is a control layer for enterprise deployments, not a switch that automatically makes every consumer assistant infallible.",
  "h2": "TWO CHECKS PER ACTION",
  "p1": "A proposed call must respect the organisation’s plain-language rules and the user’s intent. Google says the second check is on by default, helping detect actions suggested by a document rather than requested by the person.",
  "p2": "The supported enforcement point is Agent Gateway. Egress traffic must be configured to pass through it; a judge model then examines the call with context, tool descriptions and policies. Merely adding a sentence to the agent’s prompt is not enough.",
  "h2b": "DENIALS AND AUDIT TRAILS",
  "p3": "When a call is denied, its content is replaced with a configurable message instead of executing. The verdict and rationale go to Cloud Logging. Responses containing only text are not evaluated by this action mechanism.",
  "p4": "The check complements permissions and other protections; it does not replace them. These are Google’s examples, not an audit by our team. The official diagram illustrates the article and no dedicated video has been verified.",
  "takeText": "Plain-language policies and an intent check before tool calls: Google’s Preview requires Agent Gateway integration and is not a universal security guarantee.",
  "title": "SEMANTIC GOVERNANCE",
  "cover": "SEMANTIC GOVERNANCE",
  "credit": "Official Google diagram illustrating allowed or denied agent actions, published on 20 November 2026. © Google. Supplier example, not an editorial test result.",
  "imageCredit": "Official Google diagram illustrating allowed or denied agent actions, published on 20 November 2026. © Google. Supplier example, not an editorial test result.",
  "imageAlt": "Official Google diagram illustrating allowed or denied agent actions, published on 20 November 2026. © Google. Supplier example, not an editorial test result.",
  "readTime": "3 MIN READ",
  "take": "KEY TAKEAWAY",
  "sourceDetail": "Read the official source",
  "source": "Official source: GOOGLE DEVELOPERS, document dated 2026-11-20."
};
export default fields;
