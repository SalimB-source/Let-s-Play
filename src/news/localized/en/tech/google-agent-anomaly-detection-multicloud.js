const fields = {
  "accent": "MONITOR BEYOND ONE CLOUD.",
  "category": "TECH · AI SECURITY",
  "dek": "On 20 November, Google explains how Agent Anomaly Detection analyses agents hosted on AWS, Azure or on-premises. The service remains in Private Preview and depends on telemetry sent to a Google Cloud project.",
  "lead": "After pre-execution action checks, our 21 November selection examines another mechanism: spotting problematic behaviour across entire sessions. Google’s 20 November post describes extending this analysis to agents outside its cloud.",
  "intro": "The two announcements are not interchangeable. Semantic policies check an action inline; Agent Anomaly Detection examines traces separately. An analysis alert does not prove that an action was blocked before execution.",
  "h2": "TRACES RATHER THAN THE RUNTIME",
  "p1": "Models and tools continue running where the agent is hosted. Traces and logs, including prompts and responses required for analysis, are sent to the Google Cloud project through the Telemetry API following OpenTelemetry conventions.",
  "p2": "The article cites ADK for Python 2.12.0 or later for producing this telemetry through Google Cloud exporters. It also describes Workload Identity Federation for obtaining temporary credentials without a service account key.",
  "h2b": "A PREVIEW, NOT A UNIVERSAL AUDIT",
  "p3": "Google illustrates the system with an inventory agent on AWS Lambda and a customer-service agent on Microsoft Foundry. The detections shown are supplier examples, not an accuracy rate established across all agents or an editorial test.",
  "p4": "Access must be requested through the Private Preview. Check permissions, log handling and sensitive data before sending conversations. Analysis depends on the data actually collected; the official diagram is not a screenshot of our infrastructure.",
  "takeText": "Multicloud session analysis using traces transferred to Google Cloud. The service is in Private Preview, requires configuration and privacy review, and detection must not be confused with preventive blocking.",
  "title": "AGENT ANOMALY DETECTION",
  "cover": "AGENT ANOMALY DETECTION",
  "credit": "Official Agent Anomaly Detection illustration published by Google Developers on 20 November 2026. © Google. Supplier explanatory visual, not an audit of our infrastructure.",
  "imageCredit": "Official Agent Anomaly Detection illustration published by Google Developers on 20 November 2026. © Google. Supplier explanatory visual, not an audit of our infrastructure.",
  "imageAlt": "Official Agent Anomaly Detection illustration published by Google Developers on 20 November 2026. © Google. Supplier explanatory visual, not an audit of our infrastructure.",
  "readTime": "3 MIN READ",
  "take": "KEY TAKEAWAY",
  "sourceDetail": "Read the official source",
  "source": "Official source: GOOGLE DEVELOPERS, document dated 2026-11-20."
};
export default fields;
