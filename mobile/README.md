# Let's Play — Application Mobile (React Native / Expo)

Application mobile légère **iOS & Android** construite avec **React Native (Expo)**, conçue en architecture hybride :

- **100 % natif & fluide** pour l’espace Média (**Actus FR / EN / AR**, recherche, mode hors-ligne), l’espace Social (**Let’s Talk** : discussions temps réel, amis, blocage/signalement), le **Profil** et les **Notifications Push**.
- **Moteurs de jeu intacts** : *Le Sablier de Bab El*, *Vice City Rush* et *Mirage Rush* s’ouvrent dans une coque `WebView` plein écran immersive qui injecte automatiquement la session Supabase du joueur (aucune double connexion), synchronise la langue et le thème, gère le bouton Retour Android et relaie les vibrations natives (`expo-haptics`).

---

## Tester immédiatement sur téléphone avec Expo Go

1. Installez **Expo Go** sur votre téléphone (App Store iOS ou Google Play Android).
2. Copiez `mobile/.env.example` vers `mobile/.env.local` et renseignez l’URL et la clé publique (`publishable` / `anon`) de votre projet Supabase.
3. Lancez le serveur de développement depuis la racine du dépôt :

```bash
cd mobile
npm install
npx expo start
```

4. Scannez le QR code affiché dans le terminal (avec l’appareil photo sur iPhone, ou depuis l’app Expo Go sur Android).

> Astuce si votre téléphone et votre ordinateur ne sont pas sur le même réseau Wi-Fi : lancez `npx expo start --tunnel`.

---

## Flux d'actualités en direct (`mobile-feed`)

Lors de chaque `npm run build` sur Vercel, le script `scripts/generate-mobile-feed.mjs` génère automatiquement :
- `public/mobile-feed/feed-fr.json`
- `public/mobile-feed/feed-en.json`
- `public/mobile-feed/feed-ar.json`

L’application mobile récupère ces flux légers en direct à l’ouverture (et au tirer-pour-rafraîchir), met les articles en cache localement pour une lecture instantanée même hors-ligne, et embarque un instantané de secours dans `mobile/src/data/bundledFeed.json`. Conformément aux règles éditoriales (`AGENTS.md`), seules les sources officielles vérifiées par `src/lib/articleSources.js` sont exposées.

---

## Notifications Push (Supabase + Expo Push)

1. **Table SQL & RPC** : `supabase/mobile-push.sql` crée `public.push_tokens` ainsi que les fonctions `upsert_push_token` et `delete_push_token` (protégées par RLS).
2. **Edge Function** : `supabase/functions/mobile-push/index.ts` envoie les notifications via l’API Expo Push dans la langue choisie par chaque joueur (`fr`, `en`, `ar`).
3. **Branchement des Webhooks Supabase** :
   - Définissez un secret `MOBILE_PUSH_SECRET` dans *Supabase Dashboard → Edge Functions → Secrets*.
   - Dans *Database → Webhooks*, créez deux webhooks pointant vers l’Edge Function `mobile-push` avec l’en-tête `x-webhook-secret: <votre MOBILE_PUSH_SECRET>` :
     - Table `direct_messages` → événement `INSERT`
     - Table `friendships` → événements `INSERT` et `UPDATE`
