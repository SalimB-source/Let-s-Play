#!/bin/sh
# Reconstruit le bundle de la démo (JSX automatique — c'est le runtime du jeu).
set -e
/tmp/node_modules/.bin/esbuild /home/user/Let-s-Play/demo-coffret/src/entree.jsx \
  --bundle --format=iife --jsx=automatic \
  --outfile=/home/user/Let-s-Play/demo-coffret/bundle.js \
  --loader:.jsx=jsx --loader:.jpg=dataurl --loader:.png=dataurl --loader:.webp=dataurl --loader:.css=css \
  --alias:react=/tmp/node_modules/react \
  --alias:react/jsx-runtime=/tmp/node_modules/react/jsx-runtime.js \
  --alias:react-dom/client=/tmp/node_modules/react-dom/client.js \
  --define:process.env.NODE_ENV='"production"' \
  --define:import.meta.env='{"BASE_URL":"/public/"}' \
  --log-level=error

# Version des assets dans la page : un bundle reconstruit change d'URL, donc
# aucun cache ne peut resservir l'ancien.
VERSION=$(date +%s)
sed -i -E "s#\\./(bundle\\.(js|css))(\\?v=[0-9]+)?#./\\1?v=$VERSION#g" /home/user/Let-s-Play/demo-coffret/index.html
echo "assets versionnés : v=$VERSION"
