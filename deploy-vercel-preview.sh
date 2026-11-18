#!/usr/bin/env bash
# Déploiement d'une **preview** Vercel de Vice City Rush, sans passer par GitHub.
#
# Le projet Vercel n'est relié qu'à `main` : pousser une branche n'y produit pas
# de prévisualisation. Ce script construit le site localement et l'envoie à
# Vercel en preview — la production n'est jamais touchée.
#
#   bash deploy-vercel-preview.sh [chemin-du-repo]
#
# Prérequis :
#   • Node 22 et les dépendances installées (`npm ci`) ;
#   • le CLI Vercel authentifié une fois : `npx vercel login` ;
#   • un projet Vercel lié : `npx vercel link` (ou `VERCEL_PROJECT_ID`).
#
# Variables utiles :
#   VERCEL_TOKEN      jeton d'API (CI, machine sans login)
#   VERCEL_ORG_ID     organisation du projet
#   VERCEL_PROJECT_ID projet (il suffit d'un des deux avec le jeton)
#   SKIP_BUILD=1      réutiliser le `dist/` déjà présent
#
# Ce que le script NE fait PAS : promouvoir en production. Pour cela :
#   npx vercel promote <url-de-la-preview>
set -euo pipefail

REPO="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$REPO"

if [ ! -f package.json ]; then
  echo "✗ $REPO ne ressemble pas au dépôt Let's Play (pas de package.json)." >&2
  exit 1
fi

VERSION="$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'local')"
echo "→ Vice City Rush : preview de la branche « $BRANCH » ($VERSION)"
echo "  dépôt : $REPO"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "→ Installation des dépendances (si nécessaire)…"
  [ -d node_modules ] || npm ci --no-audit --no-fund
  echo "→ Construction du site…"
  # Le build envoie `version.json` avec le jeton du commit : la preview dit sa
  # version, comme la production.
  VERCEL_GIT_COMMIT_SHA="${VERCEL_GIT_COMMIT_SHA:-$VERSION}" npm run build
else
  echo "→ Réutilisation de dist/ (SKIP_BUILD=1)"
fi

if [ ! -d dist ]; then
  echo "✗ dist/ est absent : la construction a échoué." >&2
  exit 1
fi

echo "→ Envoi de dist/ à Vercel (preview, jamais production)…"

TOKEN_ARGS=()
if [ -n "${VERCEL_TOKEN:-}" ]; then
  TOKEN_ARGS+=(--token "$VERCEL_TOKEN")
  [ -n "${VERCEL_ORG_ID:-}" ] && TOKEN_ARGS+=(--scope "$VERCEL_ORG_ID")
fi

PROJECT_ARGS=()
if [ -n "${VERCEL_PROJECT_ID:-}" ]; then
  PROJECT_ARGS+=(--project "$VERCEL_PROJECT_ID")
fi

# `--prebuilt` : on envoie la sortie déjà construite, sans rebuild côté Vercel
# (les variables VITE_* sont donc celles du poste, comme en production locale).
# `-y` : accepter la liaison du projet sans question interactive.
set +e
OUTPUT="$(npx --yes vercel@latest deploy --prebuilt --yes \
  "${TOKEN_ARGS[@]}" "${PROJECT_ARGS[@]}" 2>&1)"
STATUS=$?
set -e

echo "$OUTPUT"

if [ $STATUS -ne 0 ]; then
  cat >&2 <<'MSG'

✗ Le déploiement a échoué.

Les causes les plus fréquentes :
  • « not logged in » : lancer `npx vercel login` une fois sur ce poste ;
  • « project not linked » : lancer `npx vercel link` à la racine du dépôt ;
  • un jeton absent en CI : exporter VERCEL_TOKEN, VERCEL_ORG_ID et
    VERCEL_PROJECT_ID avant de relancer le script.
MSG
  exit $STATUS
fi

URL="$(printf '%s' "$OUTPUT" | grep -Eo 'https://[a-zA-Z0-9._-]+\.vercel\.app' | tail -n 1)"
echo
if [ -n "$URL" ]; then
  echo "✓ Preview prête : $URL"
  echo "  Vice City Rush : $URL/jeu/vice-city-rush → Conduite libre"
  echo
  echo "  À vérifier : portrait (390×844) et paysage (844×390). Ce qui doit se"
  echo "  lire : champ 88° / recul 7,00 m en portrait, 66° / 5,00 m en paysage."
else
  echo "✓ Déploiement lancé — l'URL est dans la sortie ci-dessus."
fi
echo "  Promotion en production (si validé) : npx vercel promote <url>"
