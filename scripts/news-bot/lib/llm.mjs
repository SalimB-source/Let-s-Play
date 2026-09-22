// Rédaction assistée : si une clé d’API de modèle de langage est disponible
// (secrets GitHub ou .env.local), l’article est écrit par le modèle avec le
// style Let’s Play. Sans clé — ou en cas d’échec — le bot retombe tout seul
// sur le gabarit extractif de lib/story.mjs.

import { STYLE_GUIDE, STORY_SCHEMA_DOC, BOT } from '../config.mjs';
import { fetchText } from './net.mjs';

const PROVIDERS = {
  anthropic: {
    env: ['ANTHROPIC_API_KEY'],
    defaultModel: 'claude-sonnet-4-5',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
  openai: {
    env: ['OPENAI_API_KEY'],
    defaultModel: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  mistral: {
    env: ['MISTRAL_API_KEY'],
    defaultModel: 'mistral-small-latest',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
  },
  gemini: {
    env: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    defaultModel: 'gemini-2.0-flash',
  },
};

// Détecte le fournisseur : NEWS_LLM_PROVIDER sinon la première clé présente.
export function detectLlm(env = process.env) {
  const requested = env.NEWS_LLM_PROVIDER?.trim().toLowerCase();
  const candidates = requested && PROVIDERS[requested] ? [requested] : Object.keys(PROVIDERS);
  for (const name of candidates) {
    const provider = PROVIDERS[name];
    const keyEnv = provider.env.find((variable) => env[variable]?.trim());
    if (keyEnv) {
      return {
        provider: name,
        key: env[keyEnv].trim(),
        model: env.NEWS_LLM_MODEL?.trim() || provider.defaultModel,
      };
    }
  }
  return null;
}

function buildUserPrompt(item, extracted) {
  const body = extracted.paragraphs.join('\n\n').slice(0, BOT.bodyMaxChars);
  const description = (extracted.description || item.summary || '').slice(0, BOT.descriptionMaxChars);
  return `Rédige l’article du jour à partir de la matière première ci-dessous.

MÉTIÈRE PREMIÈRE (ne rien utiliser d’autre) :
- Titre original : ${item.title}
- Source d’origine : ${item.source?.name} (${item.url})
- Publié le : ${item.dateIso || 'date récente'}
- Résumé : ${description || '(non fourni)'}
- Texte de l’article source :
${body || '(non fourni)'}

${STORY_SCHEMA_DOC}

Rappels : tout en français, faits uniquement issus de la matière première, majuscules pour les titres, apostrophes typographiques (’), pas d’emoji, pas de markdown.`;
}

function extractJson(text) {
  const cleaned = String(text).replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('pas de JSON dans la réponse');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callProvider(llm, userPrompt) {
  const { provider, key, model } = llm;
  let url;
  let headers;
  let body;
  if (provider === 'anthropic') {
    url = PROVIDERS.anthropic.endpoint;
    headers = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
    body = { model, max_tokens: 4096, temperature: 0.6, system: STYLE_GUIDE, messages: [{ role: 'user', content: userPrompt }] };
  } else if (provider === 'openai' || provider === 'mistral') {
    url = PROVIDERS[provider].endpoint;
    headers = { 'content-type': 'application/json', authorization: `Bearer ${key}` };
    body = {
      model, temperature: 0.6, max_tokens: 4096, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: STYLE_GUIDE }, { role: 'user', content: userPrompt }],
    };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    headers = { 'content-type': 'application/json' };
    body = {
      systemInstruction: { parts: [{ text: STYLE_GUIDE }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096, responseMimeType: 'application/json' },
    };
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`${provider} HTTP ${response.status} : ${(await response.text()).slice(0, 300)}`);
  const payload = await response.json();
  if (provider === 'anthropic') {
    return (payload.content || []).map((part) => part.text || '').join('');
  }
  if (provider === 'gemini') {
    return (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('');
  }
  return payload.choices?.[0]?.message?.content || '';
}

// Renvoie les champs rédigés par le modèle, ou null en cas d’absence/échec
// (l’appelant retombe alors sur le gabarit — jamais d’article bloqué).
export async function writeWithLlm(item, extracted, llm) {
  if (!llm) return null;
  try {
    const raw = await callProvider(llm, buildUserPrompt(item, extracted));
    const fields = extractJson(raw);
    if (typeof fields !== 'object' || !fields) return null;
    for (const value of Object.values(fields)) {
      if (value !== null && typeof value !== 'string') return null;
    }
    return fields;
  } catch (error) {
    console.warn(`  ⚠️ LLM (${llm.provider}) indisponible pour « ${item.title} » : ${error.message} → gabarit.`);
    return null;
  }
}
