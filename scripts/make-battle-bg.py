"""Génère public/sablier-battle-bg.svg : le ciel de Bab El derrière l'arène."""
import random

random.seed(7)
W, H = 1600, 900

stars = []
for i in range(90):
    x = random.uniform(0, W)
    y = random.uniform(0, 430)
    r = random.uniform(0.6, 1.8)
    o = random.uniform(0.35, 0.95)
    stars.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="#cdd8ff" opacity="{o:.2f}"/>')

parts = []
towers = [(180, 120, 520), (320, 90, 430), (470, 140, 610), (640, 110, 470),
          (800, 170, 560), (1000, 120, 520), (1150, 95, 440), (1290, 140, 590), (1440, 100, 470)]
for (x, w, h) in towers:
    y = 640 - h
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#161330"/>')
    for k in range(3):
        wx = x + random.uniform(8, w - 14)
        wy = y + random.uniform(10, h - 16)
        parts.append(f'<rect x="{wx:.0f}" y="{wy:.0f}" width="7" height="10" fill="#ffb45e" opacity="{random.uniform(0.5, 0.95):.2f}"/>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#070a22"/><stop offset=".55" stop-color="#141238"/><stop offset="1" stop-color="#241a3e"/>
</linearGradient>
<linearGradient id="dune" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#6a4a24"/><stop offset="1" stop-color="#2a1c10"/>
</linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5">
<stop offset="0" stop-color="#ffd619" stop-opacity=".5"/><stop offset="1" stop-color="#ffd619" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
{''.join(stars)}
<circle cx="800" cy="170" r="240" fill="url(#glow)"/>
<g stroke="#d8a531" fill="none" opacity=".9">
<circle cx="800" cy="170" r="150" stroke-width="5"/>
<circle cx="800" cy="170" r="108" stroke-width="3" transform="rotate(18 800 170)"/>
<circle cx="800" cy="170" r="66" stroke-width="2"/>
<path d="M800 20 L800 60 M800 280 L800 320 M650 170 L610 170 M990 170 L950 170" stroke-width="4"/>
</g>
<circle cx="800" cy="170" r="10" fill="#ffd619"/>
{''.join(parts)}
<g fill="#d8a531"><circle cx="545" cy="16" r="16"/><circle cx="885" cy="66" r="18"/></g>
<ellipse cx="300" cy="905" rx="700" ry="260" fill="url(#dune)"/>
<ellipse cx="1300" cy="930" rx="800" ry="280" fill="#3a2a18"/>
<ellipse cx="800" cy="960" rx="900" ry="260" fill="#241a10"/>
</svg>'''

with open('public/sablier-battle-bg.svg', 'w') as f:
    f.write(svg)
print('bg svg écrit :', len(svg), 'octets')
