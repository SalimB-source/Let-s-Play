// Traduction en de l’article /news/tech/openai-gpt-6-conception-proteines — vérifiée à la publication (aucun repli français).
const fields = {
  "accent": "TAILOR-MADE PROTEINS.",
  "category": "TECH · AI RESEARCH",
  "dek": "OpenAI publishes a preprint in which its GPT-6 family designs proteins through reasoning and code, with binding tests run in the lab of its partner Onava.",
  "lead": "The post appeared on OpenAI’s site on 24 November, alongside a preprint with an explicit title: “GPT-6 as a Universal Foundation Model for Protein Biology: Beyond Specialized Models”. The idea fits in one sentence: a general-purpose model can propose protein shapes and the amino-acid sequences that go with them, without calling the specialised biology models that usually do this work.",
  "intro": "This is company research, not peer-reviewed at this stage. The figures come from OpenAI and its partner Onava; we report them with the limits the authors themselves acknowledge, without presenting them as an independent result.",
  "h2": "WHAT THE TESTS MEASURE",
  "p1": "First experiment: researchers give the model the three-dimensional structures of five target proteins and mark where a minibinder — a small protein meant to attach to them — should bind. The model then writes code to produce its own designs, without calling a specialised structure generator. Of 322 minibinders made and tested in the lab, 35, or 10.9%, showed evidence of binding to their target: 5 for PD-L1, 3 for IL-7Rα, 1 for TrkA, 8 for VEGF-A and 18 for IL-17A.",
  "p2": "Second experiment: the amino-acid sequence is withheld and the model has to reinvent it for a given shape. Screens showed binding for 75 of 88 designs aimed at MDM2, 26 of 42 for VEGF-A and 8 of 59 for PD-1. For one minibinder shape against PD-L1, two proposed sequences differed from the original at 52 and 58 positions out of 90, and from each other at 44 positions — an argument the authors make against simple memorisation.",
  "h2b": "WHAT THE MODEL STILL CANNOT DO",
  "p3": "Antibody work completes the picture: of 182 rewritten binding-loop fragments for six small antibodies against IL-4Rα, 128 showed binding, and 179 of the 272 fragments derived from five therapeutic antibodies still bound to PD-1 or PD-L1. But predicting a complete structure from a sequence remains the weak spot: the mean TM-score reaches 0.38 with the latest internal model, against 0.93 for ESMFold2, a specialised model.",
  "p4": "OpenAI notes that specialised models supplied sequences and helped select the candidates tested in the lab, so the pipeline is not fully replaced. The authors also flag the dual-use risk of such capabilities and point to their biosecurity framework. The open question is independent reproduction: these hit rates depend heavily on the filters applied before testing and on how binding is defined.",
  "takeText": "OpenAI says its GPT-6 models design proteins through reasoning and code, with 35 binders out of 322 minibinders tested in the lab. This is a company preprint, not peer reviewed: whole-structure prediction remains weak and specialised models keep a role.",
  "title": "GPT-6",
  "cover": "GPT-6 · PROTEINS ON DEMAND",
  "credit": "Official share image for the note “GPT-6 models demonstrate intrinsic protein-design capabilities”, published by OpenAI on 24 November 2026. © OpenAI. Brand illustration, not a result from our newsroom.",
  "imageCredit": "Official share image for the note “GPT-6 models demonstrate intrinsic protein-design capabilities”, published by OpenAI on 24 November 2026. © OpenAI. Brand illustration, not a result from our newsroom.",
  "imageAlt": "Official share image for the note “GPT-6 models demonstrate intrinsic protein-design capabilities”, published by OpenAI on 24 November 2026. © OpenAI. Brand illustration, not a result from our newsroom.",
  "readTime": "4 MIN READ",
  "take": "KEY TAKEAWAY",
  "sourceDetail": "Read the official source",
  "source": "Official source: OPENAI, note and preprint dated 2026-11-24."
};
export default fields;
