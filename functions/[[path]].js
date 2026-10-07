// Cloudflare Pages Function — secours pour les liens du site (SPA fallback).
//
// Équivalent du rewrite de vercel.json : quand un visiteur ouvre une route
// côté client (/auth, /news/…, lien profond partagé), aucun fichier statique
// ne correspond, et cette fonction sert index.html à la place. Les vrais
// fichiers (images, JS, CSS…) sont servis par Cloudflare AVANT cette
// fonction, donc ils ne sont pas concernés.
//
// Pourquoi une fonction et pas public/_redirects ? La règle
// `/* /index.html 200` est rejetée par le validateur de Cloudflare comme une
// « boucle infinie » — cette fonction est plus fiable.

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const index = await context.env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
  if (index.ok) {
    return index;
  }
  return new Response('Not found', { status: 404 });
}
