# Visuel Kojima Productions → Xbox

Le script `make_kojima_xbox_visual.py` génère deux déclinaisons éditoriales :

- `public/kojima-xbox-news.jpg` — 1920 × 1080, format 16:9 ;
- `public/kojima-xbox-news-square.jpg` — 1080 × 1080, format carré/social.

Les deux rendus utilisent la vraie photo de Hideo Kojima et Asha Sharma prise
chez Kojima Productions le 14 septembre 2026. La provenance détaillée est
consignée dans `public/news-sources/CREDITS.txt`.

## Régénérer

```bash
python3 -m pip install -r scripts/visuels/requirements.txt
python3 scripts/visuels/make_kojima_xbox_visual.py
```

Les fontes sont embarquées localement afin que le rendu reste déterministe.
