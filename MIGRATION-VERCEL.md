# Quitter Vercel — guide simple (Cloudflare Pages, gratuit)

Ton site fonctionnera exactement pareil sans Vercel. **Tout le code est déjà
prêt dans ce dépôt** — il te reste juste à brancher ton compte Cloudflare.

- ✅ Gratuit (comme Vercel)
- ✅ Déploiement automatique à chaque `git push` (comme Vercel)
- ✅ Ton site garde la même adresse de type `https://….pages.dev`
- ✅ Tes données (Supabase) continuent de fonctionner

---

## ✅ Check-list

- [ ] **Étape 1** — Créer un compte Cloudflare (2 min)
- [ ] **Étape 2** — Connecter le dépôt GitHub (3 min)
- [ ] **Étape 3** — Copier les 3 clés depuis Vercel (2 min)
- [ ] **Étape 4** — Vérifier que le site marche (2 min)
- [ ] **Étape 5** — Autoriser la nouvelle adresse dans Supabase (1 min)
- [ ] **Étape 6** — Supprimer le projet Vercel (1 min)

---

## Étape 1 — Compte Cloudflare (gratuit)

1. Va sur **dash.cloudflare.com**
2. Clique sur **« Sign up »** (en haut à droite)
3. Crée un compte avec ton email
4. Valide l'email qu'on t'envoie

> Pas besoin de carte bancaire. Pas besoin de nom de domaine.

## Étape 2 — Connecter ton site

1. Dans le menu de gauche : **Workers & Pages**
2. Bouton **« Create application »** → onglet **« Pages »** → **« Connect to Git »**
3. Autorise Cloudflare à voir ton GitHub, choisis le dépôt **`Let-s-Play`**
4. Écran « Set up builds and deployments » — remplis exactement comme ça :

   | Champ | Valeur |
   | --- | --- |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. Clique **« Save and Deploy »**
6. Attends 1–2 minutes. Ton site sera en ligne sur une adresse du type :
   **`https://let-s-play-xxx.pages.dev`** (note-la, tu en auras besoin)

## Étape 3 — Copier les clés (important)

Ton site a besoin de 3 valeurs secrètes/publiques. **Copie-les depuis
Vercel** (elles y sont déjà) vers Cloudflare.

**Pour les trouver sur Vercel :** va sur vercel.com → ton projet
« let-s-play » → **Settings** → **Environment Variables**.

**Pour les mettre sur Cloudflare :** ton projet Pages → **Settings** →
**Environment variables** → **Add variable**.

| Nom de la variable | Où la trouver | Type sur Cloudflare |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Vercel (ou dashboard Supabase → Settings → API → Project URL) | **Production + Preview**, texte normal |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel (ou Supabase → Settings → API → anon/public key) | **Production + Preview**, texte normal |
| `YOUTUBE_API_KEY` | Vercel (clé API YouTube, commence par `AIza`) | **Production + Preview**, coche **« Encrypt »** (secret) |

> Ne recopie pas `VITE_TURNSTILE_SITE_KEY` si tu ne t'en sers pas
> (c'est la protection anti-bot à l'inscription — si tu l'as sur Vercel,
> copie-la aussi, c'est une 4ᵉ variable).

Clique **Save** après chaque variable.

## Étape 4 — Vérifier que tout marche

Ouvre `https://ton-site.pages.dev` et teste :

1. **La page d'accueil s'affiche** ✅
2. **Ouvre directement** `https://ton-site.pages.dev/auth` — la page de
   connexion doit s'afficher (pas une erreur 404) ✅
3. **Connecte-toi** avec ton compte ✅
4. **Le micro/caméra** dans un appel vocal/vidéo te demande la permission
   normalement ✅

## Étape 5 — Dire à Supabase la nouvelle adresse

Supabase ne sait pas encore que ton site a déménagé.

1. Va sur **supabase.com** → ton projet → **Authentication** (menu gauche)
2. **URL Configuration**
3. Dans **Redirect URLs**, ajoute :
   ```
   https://ton-site.pages.dev/**
   ```
   (remplace par ta vraie adresse `pages.dev`)
4. **Save**

> Si tu as un nom de domaine perso, ajoute-le ici aussi plus tard.

## Étape 6 — Supprimer Vercel

Quand les étapes 1–5 sont validées :

1. Va sur **vercel.com** → ton projet « let-s-play »
2. **Settings** → **General** → tout en bas : **« Delete this project »**
3. Confirme.

**C'est fini.** Vercel est débranché, ton site tourne sur Cloudflare.

---

## Et après ?

- **Chaque modification** que tu pousses sur GitHub (`git push`) déploie
  automatiquement le site, comme avant avec Vercel.
- **Chaque pull request** aura son propre lien de test (aperçu).
- **GitHub Pages** (`salimb-source.github.io/Let-s-Play/`) continue de
  tourner en parallèle — c'est un miroir de secours, tu peux l'ignorer.

## Si quelque chose ne marche pas

| Symptôme | Cause | Solution |
| --- | --- | --- |
| Page blanche / « démo » partout | Les clés Supabase ne sont pas copiées | Refais l'étape 3 |
| La connexion ne marche pas | L'adresse n'est pas autorisée dans Supabase | Refais l'étape 5 |
| Le badge « live » YouTube ne s'affiche pas | `YOUTUBE_API_KEY` manquante | Étape 3, coche bien « Encrypt » |
| Le micro ne marche pas dans les appels | Ne touche **rien** | Ne modifie jamais le fichier `public/_headers` sans demander |

## Tester sur ton ordinateur avant (optionnel)

```bash
npm install
npm run build
npx wrangler pages dev dist
```

Puis ouvre **http://localhost:8788** dans ton navigateur.

## Fichiers ajoutés dans ce dépôt (pour info)

| Fichier | À quoi il sert |
| --- | --- |
| `functions/api/youtube-live.js` | Le badge « live » YouTube (avant : `api/youtube-live.js` sur Vercel) |
| `functions/[[path]].js` | Sert l'appli sur les liens profonds (`/auth`, `/news/…`) |
| `public/_headers` | Les mêmes protections de sécurité que `vercel.json` |
| `public/_routes.json` | Dit à Cloudflare quelles routes passent par les fonctions |
| `vite.config.js` | Adapté automatiquement (rien à faire) |

`vercel.json` et `api/` restent en place tant que Vercel tourne — ils seront
inutiles après la migration, tu pourras les supprimer.
