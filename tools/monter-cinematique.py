#!/usr/bin/env python3
"""Montage de la cinematique d'intro EN du Sablier (V4).

Assemble : 30 tableaux 4K + 15 prises VO + nappe musicale + 3 cloches
+ carton titre -> MP4 1080p + sous-titres EN recales.

V4 : gros plans d'expressions (Salem, regard de Mahieddine), inserts
(cloche, rue vivante, affichage de la Liste, mains de Yamina, rue
vide, sceau du portail), sequences avant/apres (T3, T8), micro-
respiration sur les visages, et decoupage etendu (T2/T3/T4/T6/T11,
T8d et T10 en 3 plans).

Entrees : public/sablier-cinematic/4k/*.jpg, audio/en/T*.mp3,
          public/Desert Solitude with Percussion.mp3
          audio/amb/*.wav (optionnel, voir AMB + README du dossier)
Sorties : public/sablier-cinematic/montage/cine-intro-en-1080p.mp4
          public/sablier-cinematic/montage/sous-titres-en.vtt
Usage : python3 tools/monter-cinematique.py
       --audio-only : ne refait que le mix + mux (vidéo réutilisée)
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont
import tempfile

import imageio_ffmpeg
import numpy as np
from mutagen.mp3 import MP3

FF = imageio_ffmpeg.get_ffmpeg_exe()
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CINE = os.path.join(RACINE, "public", "sablier-cinematic")
K4 = os.path.join(CINE, "4k")
VO = os.path.join(CINE, "audio", "en")
AMB_DIR = os.path.join(CINE, "audio", "amb")
MONTAGE = os.path.join(CINE, "montage")
MUSIQUE = os.path.join(RACINE, "public", "Desert Solitude with Percussion.mp3")
FPS = 24
W, H = 1920, 1080
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def duree_mp3(chemin):
    return float(MP3(chemin).info.length)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(f"ECHEC (code {r.returncode}):", " ".join(cmd[:8]), "...", file=sys.stderr)
        print(r.stderr[-3000:], file=sys.stderr)
        raise SystemExit(1)
    return r


# (bloc, image, mouvement, tête, queue, fade_in, fade_out, [(vo, gap_avant)])
BLOCS = [
    ("T01", "cine-t01-bab-el-4k.jpg", "panR", 2.2, 0.9, 0.8, 0.35, [("T01.mp3", 0)]),
    ("T02", "cine-t02-astrolabe-4k.jpg", "zin_slow", 0.6, 0.5, 0.35, 0.0, [("T02.mp3", 0)]),
    ("T03", "cine-t03-reprise-4k.jpg", "panD", 0.6, 0.9, 0.0, 0.35, [("T03.mp3", 0)]),
    ("T04", "cine-t04-liste-4k.jpg", "panL", 0.6, 0.9, 0.35, 0.35, [("T04.mp3", 0)]),
    ("T05", "cine-t05-creux-4k.jpg", "zout", 0.6, 0.9, 0.35, 0.35, [("T05.mp3", 0)]),
    ("T06", "cine-t06-sondeur-4k.jpg", "panD", 0.6, 0.9, 0.35, 0.35, [("T06.mp3", 0)]),
    ("T07", "cine-t07-cinq-4k.jpg", "panR", 0.6, 0.9, 0.35, 0.35, [("T07.mp3", 0)]),
    ("T08", "cine-t08-greffe-4k.jpg", "zin_slow", 0.6, 0.9, 0.35, 0.35,
     [("T08a.mp3", 0), ("T08b.mp3", 0.5), ("T08c.mp3", 0.6), ("T08d.mp3", 2.0)]),
    ("T09", "cine-t09-duel-4k.jpg", "drift_DR", 0.6, 0.9, 0.35, 0.35, [("T09.mp3", 0)]),
    ("T10", "cine-t10-the-4k.jpg", "settle", 0.6, 1.5, 0.35, 0.35, [("T10.mp3", 0)]),
    ("T11", "cine-t11-portail-4k.jpg", "rise", 0.6, 1.0, 0.35, 0.35, [("T11.mp3", 0)]),
    ("T12", "cine-t12-titre-4k.jpg", "static", 2.0, 3.0, 0.35, 1.5, [("T12.mp3", 0)]),
]

# Sous-titres EN par fichier VO : [(ligne1, ligne2|None)]
CUES = {
    "T01.mp3": [("There are cities built on stone.", "Bab El is built on time."),
                ("Nine tiers of copper and limestone,", "raised around a portal that never opened."),
                ("And beneath it…", "a desert that rises.")],
    "T02.mp3": [("Above the ninth tier turns the Astrolabe.", None),
                ("It does not count the hours.", "It counts the cycles we have left."),
                ("And when it tolls…", None)],
    "T03.mp3": [("The first tier is already lost.", "Then the second. Then the third."),
                ("Today, we live on the fourth.", "Everyone knows. And everyone keeps living.")],
    "T04.mp3": [("What holds the city together is no king, no god.", None),
                ("It is an administration: the Chamber of Hours.", None),
                ("Every cycle, it publishes the List —", "those evacuated first… and the others."),
                ("Its agents carry no weapons.", "They carry ledgers.")],
    "T05.mp3": [("Here, sand does not fall from the sky —", "it rises from the ground."),
                ("And it keeps the trace.", "Where someone has fallen,"),
                ("the sand keeps their weight as a hollow.", None),
                ("The poor sell sand heavy with memories.", "The rich pay to have it sifted."),
                ("Nothing that falls is lost… to everyone.", None)],
    "T06.mp3": [("Salem goes down into the condemned tiers", "before the taking, to make sure no one is left."),
                ("Hooked pole, rope, notebook.", None),
                ("He always brings someone back.", "And it is never enough.")],
    "T07.mp3": [("At his side: Yamina, the clockmaker,", "who signed a List at nineteen —"),
                ("and has been trying to repair", "the irreparable ever since."),
                ("Fériel, the glassblower,", "who turns sand into shields."),
                ("Boualem, the well-digger, who found something", "beneath the city… and does not speak of it."),
                ("And Tarek, the porter, who carries", "the Chamber's crates — and its secrets.")],
    "T08a.mp3": [("This time, Salem came back up with twelve people", "from a condemned district. Twelve living souls.")],
    "T08b.mp3": [("— They're standing right behind me.", None)],
    "T08c.mp3": [("— I'm not asking where they are.", "I'm asking where they are written.")],
    "T08d.mp3": [("The district has been officially empty since yesterday.", None),
                 ("With no registration, no shelter in the upper tiers.", None),
                 ("Twelve living souls… who exist nowhere.", None)],
    "T09.mp3": [("One recourse remains. An old right,", "one even the Chamber honours: trial by duel."),
                ("The cards are fragments of memory, and pacts.", None),
                ("A keeper who loses must open their archives…", "or grant passage."),
                ("So we will fight. Not to kill.", "To be written.")],
    "T10.mp3": [("At the top of the Tower of Lists", "waits the Grand Horologist Mahieddine."),
                ("A gentle man, polite, who offers you tea…", "and has been signing the List for forty years."),
                ("He never lies.", None),
                ("He omits.", None)],
    "T11.mp3": [("And behind it all, the sealed portal.", None),
                ("No one knows who built it.", "No one knows what it holds back."),
                ("But the Astrolabe will toll again.", "And this time…")],
    "T12.mp3": [("…you hold the cards.", None)],
}

# Langage caméra : nom -> (z0, z1, x0, x1, y0, y1[, respiration]).
# z = facteur de zoom ; x/y = position relative (0..1) de la fenêtre de crop.
# respiration = amplitude d'une oscillation (période 4 s) qui donne vie aux visages.
MOVES = {
    "zin": (1.00, 1.08, .5, .5, .5, .5),
    "zin_slow": (1.00, 1.045, .5, .5, .5, .5),
    "zin_fort": (1.00, 1.14, .5, .5, .5, .5),
    "zin_resp": (1.00, 1.06, .5, .5, .5, .5, 0.004),
    "push": (1.02, 1.10, .5, .5, .52, .48),
    "push_resp": (1.02, 1.08, .5, .5, .52, .48, 0.004),
    "push_L": (1.04, 1.12, .58, .42, .5, .5),
    "push_R": (1.04, 1.12, .42, .58, .5, .5),
    "zout": (1.08, 1.00, .5, .5, .5, .5),
    "settle": (1.09, 1.05, .5, .5, .45, .52),
    "panR": (1.10, 1.10, 0., 1., .5, .5),
    "panL": (1.10, 1.10, 1., 0., .5, .5),
    "panD": (1.10, 1.10, .5, .5, 0., 1.),
    "panU": (1.10, 1.10, .5, .5, 1., 0.),
    "rise": (1.05, 1.12, .5, .5, .62, .38),
    "drift_DR": (1.08, 1.12, .35, .65, .35, .65),
    "drift_UL": (1.08, 1.12, .65, .35, .65, .35),
    "static": (1.00, 1.015, .5, .5, .5, .5),
}


def filtre_zoompan(mouvement, n):
    params = MOVES[mouvement]
    z0, z1, x0, x1, y0, y1 = params[:6]
    resp = params[6] if len(params) > 6 else 0.0
    z = f"{z0}+({z1}-{z0})*on/{n}"
    if resp:
        z += f"+{resp}*sin(2*PI*on/{4 * FPS})"
    return (f"zoompan=z='{z}':"
            f"x='(iw-iw/zoom)*({x0}+({x1}-{x0})*on/{n})':"
            f"y='(ih-ih/zoom)*({y0}+({y1}-{y0})*on/{n})':"
            f"d={n}:s={W}x{H}:fps={FPS}")


def composer_titre_4k(src, dst):
    """Variante 4K de T12 avec le carton titre (le fondu est fait en xfade)."""
    img = Image.open(src).convert("RGB")
    l, h = img.size
    calque = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    f_titre = ImageFont.truetype(FONT_SERIF, 190)
    f_ligne = ImageFont.truetype(FONT_SANS, 64)
    titre, ligne = "LE SABLIER", "May your name be written."
    for texte, fonte, yc, couleur in ((titre, f_titre, int(h * 0.40), (255, 255, 255, 255)),
                                      (ligne, f_ligne, int(h * 0.40) + 300, (216, 198, 144, 255))):
        bb = d.textbbox((0, 0), texte, font=fonte)
        x = (l - (bb[2] - bb[0])) // 2
        d.text((x, yc + 5), texte, font=fonte, fill=(0, 0, 0, 200))
        d.text((x, yc), texte, font=fonte, fill=couleur)
    img = Image.alpha_composite(img.convert("RGBA"), calque).convert("RGB")
    img.save(dst)
    return dst


def rendre_t12(src, tmp, seg, n, duree, fi, fo, timeline):
    """T12 : même travelling sur image nette puis titrée, fondu entre les deux."""
    titre = composer_titre_4k(src, os.path.join(tmp, "t12-titre.png"))
    d_vo = next(d for v, p, d in timeline if v == "T12.mp3")
    f = round(1.2 * FPS)  # fondu d'apparition du carton
    na = round((2.0 + d_vo - 0.4) * FPS) + f  # fin de A (recouvrement compris)
    off = na - f  # première frame absolue de B
    nb = n - off
    seg_a = os.path.join(tmp, "seg11a.mp4")
    seg_b = os.path.join(tmp, "seg11b.mp4")
    base_a = (f"zoompan=z='1+0.015*on/{n}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':"
              f"d={na}:s={W}x{H}:fps={FPS},fps={FPS},format=yuv420p")
    base_b = (f"zoompan=z='1+0.015*(on+{off})/{n}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':"
              f"d={nb}:s={W}x{H}:fps={FPS},fps={FPS},format=yuv420p")
    if fi:
        base_a += f",fade=t=in:st=0:d={fi}"
    run([FF, "-y", "-v", "error", "-i", src, "-vf", base_a,
         "-frames:v", str(na), "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "17", seg_a])
    run([FF, "-y", "-v", "error", "-i", titre, "-vf", base_b,
         "-frames:v", str(nb), "-c:v", "libx264", "-preset", "veryfast",
         "-crf", "17", seg_b])
    vf = (f"[0][1]xfade=transition=fade:duration={f / FPS:.3f}:offset={off / FPS:.3f},"
          f"format=yuv420p")
    if fo:
        vf += f",fade=t=out:st={duree - fo:.3f}:d={fo}"
    run([FF, "-y", "-v", "error", "-i", seg_a, "-i", seg_b,
         "-filter_complex", vf, "-frames:v", str(n),
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", seg])


# Découpage multi-plans : quand la narration nomme un personnage ou un objet,
# on le montre. Blocs découpés au prorata du texte dit : [(image, mouv, texte)].
SPLITS_TEXTE = {
    "T01": [
        ("cine-t01-bab-el-4k.jpg", "panR",
         "There are cities built on stone. Bab El is built on time. "
         "Nine tiers of copper and limestone, raised around a portal that never opened. "),
        ("cine-t01-bab-el-4k.jpg", "rise", "And beneath it… a desert that rises."),
    ],
    "T02": [
        ("cine-t02-astrolabe-4k.jpg", "zin_slow",
         "Above the ninth tier turns the Astrolabe. "
         "It does not count the hours. It counts the cycles we have left. "),
        ("cine-t02b-cloche-4k.jpg", "push", "And when it tolls…"),
    ],
    "T03": [
        ("cine-t03b-rue-4k.jpg", "panR",
         "The first tier is already lost. Then the second. Then the third. "),
        ("cine-t03-reprise-4k.jpg", "panD",
         "Today, we live on the fourth. Everyone knows. And everyone keeps living."),
    ],
    "T04": [
        ("cine-t04-liste-4k.jpg", "panL",
         "What holds the city together is no king, no god. "
         "It is an administration: the Chamber of Hours. "),
        ("cine-t04b-liste-4k.jpg", "push",
         "Every cycle, it publishes the List — those evacuated first… and the others. "
         "Its agents carry no weapons. They carry ledgers."),
    ],
    "T05": [
        ("cine-t05-creux-4k.jpg", "zout",
         "Here, sand does not fall from the sky — it rises from the ground. "
         "And it keeps the trace. Where someone has fallen, "),
        ("cine-t05b-sable-4k.jpg", "zin_slow",
         "the sand keeps their weight as a hollow. "
         "The poor sell sand heavy with memories. The rich pay to have it sifted. "
         "Nothing that falls is lost… to everyone."),
    ],
    "T06": [
        ("cine-t06-sondeur-4k.jpg", "panD",
         "Salem goes down into the condemned tiers before the taking, to make sure no one is left. "
         "Hooked pole, rope, notebook. "),
        ("cine-t06b-salem-4k.jpg", "push_resp",
         "He always brings someone back. And it is never enough."),
    ],
    "T07": [
        ("cine-t07-cinq-4k.jpg", "panR", "At his side: "),
        ("cine-t07a-yamina-4k.jpg", "push_L",
         "Yamina, the clockmaker, who signed a List at nineteen — "),
        ("cine-t07e-mains-4k.jpg", "zin_slow",
         "and has been trying to repair the irreparable ever since. "),
        ("cine-t07b-feriel-4k.jpg", "push_R", "Fériel, the glassblower, who turns sand into shields. "),
        ("cine-t07c-boualem-4k.jpg", "push_L",
         "Boualem, the well-digger, who found something beneath the city… and does not speak of it. "),
        ("cine-t07d-tarek-4k.jpg", "push_R",
         "And Tarek, the porter, who carries the Chamber's crates — and its secrets."),
    ],
    "T09": [
        ("cine-t09-duel-4k.jpg", "drift_DR",
         "One recourse remains. An old right, one even the Chamber honours: trial by duel. "),
        ("cine-t09b-cartes-4k.jpg", "push",
         "The cards are fragments of memory, and pacts. "
         "A keeper who loses must open their archives… or grant passage. "),
        ("cine-t09-duel-4k.jpg", "zin_fort", "So we will fight. Not to kill. To be written."),
    ],
    "T11": [
        ("cine-t11-portail-4k.jpg", "rise",
         "And behind it all, the sealed portal. "),
        ("cine-t11b-sceau-4k.jpg", "zin_slow",
         "No one knows who built it. No one knows what it holds back. "),
        ("cine-t11-portail-4k.jpg", "zin_fort",
         "But the Astrolabe will toll again. And this time…"),
    ],
}
# T08 : un plan par prise (greffe, champ Salem, contrechamp Scribe, registre),
# puis la rue vide sur « Twelve living souls… who exist nowhere ».
PLANS_T8 = [
    ("cine-t08-greffe-4k.jpg", "zin_slow"),
    ("cine-t08b-salem-4k.jpg", "push"),
    ("cine-t08c-scribe-4k.jpg", "push"),
    ("cine-t08d-registre-4k.jpg", "settle"),
]
TEXTE_T08D = [
    ("cine-t08d-registre-4k.jpg", "settle",
     "The district has been officially empty since yesterday. "
     "With no registration, no shelter in the upper tiers. "),
    ("cine-t08e-rue-vide-4k.jpg", "zout",
     "Twelve living souls… who exist nowhere."),
]
# T10 : le thé, puis le visage de Mahieddine sur « He never lies »,
# puis son regard sur « He omits ».
PLANS_T10 = [
    ("cine-t10-the-4k.jpg", "settle"),
    ("cine-t10b-mahieddine-4k.jpg", "push_resp"),
    ("cine-t10c-regard-4k.jpg", "zin_resp"),
]
DUREE_PLAN_MIN = 1.0

# Nappes d'ambiance optionnelles : (fichier, bloc_debut, bloc_fin, niveau).
# Les fichiers absents sont ignorés (le film reste mixable sans eux).
# bloc None/None = tout le film. Boucles : prévoir des fichiers bouclables.
AMB = [
    ("wind-desert-loop.wav", None, None, 0.10),
    ("sand-shimmer-loop.wav", "T05", "T05", 0.12),
    ("tea-room-tone.wav", "T10", "T10", 0.10),
    ("deep-drone-loop.wav", "T11", "T12", 0.13),
]
FADE_AMB = 2.0


def silences_t10():
    """Silences détectés dans T10.mp3 : [(debut, fin|None)]. Le [pause]
    ElevenLabs avant « He omits » contient un souffle qui le coupe en
    deux silences (débuts ~10,8 s et ~12,3 s)."""
    audio = os.path.join(VO, "T10.mp3")
    r = subprocess.run([FF, "-v", "info", "-i", audio, "-af",
                        "silencedetect=noise=-32dB:d=0.5", "-f", "null", "-"],
                       capture_output=True, text=True)
    debuts, fins = [], []
    for ligne in r.stderr.splitlines():
        if "silence_start" in ligne:
            try:
                debuts.append(float(ligne.split("silence_start:")[1].split()[0]))
            except ValueError:
                pass
        elif "silence_end" in ligne:
            try:
                fins.append(float(ligne.split("silence_end:")[1].split()[0]))
            except ValueError:
                pass
    return debuts, fins


def position_coupes_t10():
    """Coupes visage + regard dans T10.mp3 : le visage apparaît sur
    « He never lies » (1,8 s avant la fin de la phrase), le regard
    juste après la pause, sur « He omits ». Replis : 75 % / 88 %."""
    duree = duree_mp3(os.path.join(VO, "T10.mp3"))
    debuts, fins = silences_t10()
    tardifs = [s for s in debuts if s > duree * 0.55]
    visage = min(max(min(tardifs) - 1.8, duree * 0.5), duree * 0.93) if tardifs else duree * 0.75
    fins_tardives = [f for f in fins if f > duree * 0.55]
    if fins_tardives:
        regard = min(max(max(fins_tardives) + 0.15, visage + 1.0), duree * 0.96)
    else:
        regard = min(max(duree * 0.88, visage + 1.0), duree * 0.96)
    return visage, regard


def plans_du_bloc(bloc, img, mouv, debut_bloc, fin_bloc, debuts_vo):
    """Découpe un bloc en plans : [(image, mouvement, debut_abs, fin_abs)]."""
    if bloc in SPLITS_TEXTE:
        parties = SPLITS_TEXTE[bloc]
        span_deb = debuts_vo[0][1]
        span_fin = span_deb + debuts_vo[0][2]
        poids = [len(texte) for _, _, texte in parties]
        total = sum(poids)
        bornes = [span_deb]
        for p in poids[:-1]:
            bornes.append(bornes[-1] + (span_fin - span_deb) * p / total)
        bornes.append(span_fin)
        for k in range(1, len(bornes) - 1):
            if bornes[k] - bornes[k - 1] < DUREE_PLAN_MIN:
                bornes[k] = bornes[k - 1] + DUREE_PLAN_MIN
        plans = []
        for k, ((img_p, mouv_p, _), deb, fin) in enumerate(
                zip(parties, bornes[:-1], bornes[1:])):
            plans.append((img_p, mouv_p,
                          debut_bloc if k == 0 else deb,
                          fin_bloc if k == len(parties) - 1 else fin))
        return plans
    if bloc == "T08":
        plans = []
        for k, ((img_p, mouv_p), (vo, deb, d)) in enumerate(zip(PLANS_T8, debuts_vo)):
            fin = debuts_vo[k + 1][1] if k + 1 < len(debuts_vo) else fin_bloc
            plans.append((img_p, mouv_p, debut_bloc if k == 0 else deb, fin))
        # T08d : registre puis rue vide, au prorata du texte.
        (img1, mouv1, txt1), (img2, mouv2, txt2) = TEXTE_T08D
        _, _, deb_d, fin_d = plans[-1][0], plans[-1][1], debuts_vo[-1][1], fin_bloc
        coupe = deb_d + (fin_d - deb_d) * len(txt1) / (len(txt1) + len(txt2))
        if coupe - deb_d < DUREE_PLAN_MIN:
            coupe = deb_d + DUREE_PLAN_MIN
        plans[-1] = (img1, mouv1, debuts_vo[-1][1], coupe)
        plans.append((img2, mouv2, coupe, fin_d))
        # Le premier plan garde la tête de bloc.
        plans[0] = (plans[0][0], plans[0][1], debut_bloc, plans[0][3])
        return plans
    if bloc == "T10":
        vo, deb, d = debuts_vo[0]
        visage, regard = position_coupes_t10()
        (img1, mouv1), (img2, mouv2), (img3, mouv3) = PLANS_T10
        return [(img1, mouv1, debut_bloc, deb + visage),
                (img2, mouv2, deb + visage, deb + regard),
                (img3, mouv3, deb + regard, fin_bloc)]
    return [(img, mouv, debut_bloc, fin_bloc)]


def generer_sable(chemin, duree_boucle=6.0):
    """Voile de sable procedural en boucle parfaite (fond noir, pour un
    melange screen) : grains qui tombent + quelques-uns qui montent
    (ici, le sable monte)."""
    import cv2
    n = round(duree_boucle * FPS)
    rng = np.random.default_rng(7)
    n_tombe, n_monte = 420, 90
    parts = []
    for _ in range(n_tombe):
        parts.append((rng.uniform(0, W), rng.uniform(0, H + 80),
                      rng.uniform(60, 280), rng.uniform(0, 36),
                      rng.integers(1, 4), rng.uniform(0, 2 * np.pi),
                      rng.uniform(0.25, 0.9)))
    for _ in range(n_monte):
        parts.append((rng.uniform(0, W), rng.uniform(0, H + 80),
                      rng.uniform(-70, -30), rng.uniform(0, 20),
                      rng.integers(1, 3), rng.uniform(0, 2 * np.pi),
                      rng.uniform(0.12, 0.35)))
    cmd = [FF, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
           "-pix_fmt", "yuv420p", chemin]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stderr=subprocess.DEVNULL)
    teinte = np.array([150.0, 190.0, 255.0], dtype=np.float32)  # BGR ambre
    for k in range(n):
        t = k / FPS
        toile = np.zeros((H, W, 3), dtype=np.float32)
        for x0, y0, v, sway, cyc, ph, lum in parts:
            y = (y0 + v * t) % (H + 80) - 40
            x = x0 + sway * np.sin(2 * np.pi * cyc * t / duree_boucle + ph)
            lng = abs(v) * 0.04 + 1.0
            cv2.line(toile, (int(x), int(y)), (int(x), int(y - np.sign(v) * lng)),
                     (teinte * lum).tolist(), 1, cv2.LINE_AA)
        proc.stdin.write(np.clip(toile, 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ENCODAGE SABLE ECHOUE")
    return chemin


def generer_flare(chemin, teinte=(255, 196, 130), cx=0.5, cy=0.40, force=1.0):
    """Halo radial + strie anamorphique sur fond noir (pour un melange screen)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    xx /= W
    yy /= H
    dx = (xx - cx) * W / (0.55 * W)
    dy = (yy - cy) * H / (0.55 * W)
    r2 = dx * dx + dy * dy
    halo = np.exp(-r2 * 6) * 0.85 + np.exp(-r2 * 24) * 0.6 + np.exp(-r2 * 60) * 0.9
    strie = (np.exp(-((yy - cy) * H / 14.0) ** 2)
             * np.exp(-((xx - cx) * W / (0.5 * W)) ** 2) * 0.8)
    img = np.clip(halo + strie, 0, 1.2) * force
    rvb = (img[:, :, None] * np.array(teinte, dtype=np.float32)).clip(0, 255)
    Image.fromarray(rvb.astype(np.uint8)).save(chemin)
    return chemin


def generer_lumiere(chemin, duree_tot, pulses, assets):
    """Couche de lumiere plein-film (fond noir, pour un melange screen).
    Pre-rendue en numpy : des entrees -loop + trim dans le graphe ffmpeg
    bufferiseraient des milliers de frames (OOM)."""
    import cv2
    n = max(2, round(duree_tot * FPS))
    halos = {}
    for nom, asset in assets.items():
        bgr = cv2.imread(asset, cv2.IMREAD_COLOR)
        halos[nom] = bgr.astype(np.float32) / 255.0
    cmd = [FF, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
           "-pix_fmt", "yuv420p", chemin]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stderr=subprocess.DEVNULL)
    for k in range(n):
        t = k / FPS
        toile = np.zeros((H, W, 3), dtype=np.float32)
        for nom, T, ain, hold, aout, op in pulses:
            if t < T:
                e = 0.0
            elif t < T + ain:
                e = (t - T) / ain
            elif t < T + ain + hold:
                e = 1.0
            elif t < T + ain + hold + aout:
                e = 1.0 - (t - T - ain - hold) / aout
            else:
                e = 0.0
            if e > 0:
                toile += halos[nom] * (op * e)
        proc.stdin.write(np.clip(toile * 255.0, 0, 255).astype(np.uint8).tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ENCODAGE LUMIERE ECHOUE")
    return chemin


def fmt_vtt(sec):
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def main():
    os.makedirs(MONTAGE, exist_ok=True)
    audio_only = "--audio-only" in sys.argv
    if audio_only:
        print("Mode : audio seul (vidéo réutilisée)")
    os.makedirs(AMB_DIR, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="cine-")

    # 1. Timeline : positions absolues de chaque prise VO, puis découpage en plans.
    # Les fondus restent aux frontières des blocs ; les plans d'un même bloc
    # s'enchaînent en cut sec, calés sur la narration.
    timeline = []  # (fichier_vo, debut_abs, duree)
    segments = []  # (nom, image, mouvement, debut_abs, duree, fi, fo)
    spans = {}  # bloc -> (debut_abs, fin_abs)
    frontieres = []  # fins de blocs internes (whooshes)
    t = 0.0
    for bi, (bloc, img, mouv, tete, queue, fi, fo, prises) in enumerate(BLOCS):
        pos = t + tete
        debuts_vo = []
        for vo, gap in prises:
            pos += gap
            d = duree_mp3(os.path.join(VO, vo))
            timeline.append((vo, pos, d))
            debuts_vo.append((vo, pos, d))
            pos += d
        fin_bloc = pos + queue
        spans[bloc] = (t, fin_bloc)
        if bi < len(BLOCS) - 1:
            frontieres.append(fin_bloc)
        plans = plans_du_bloc(bloc, img, mouv, t, fin_bloc, debuts_vo)
        for k, (img_p, mouv_p, deb_p, fin_p) in enumerate(plans):
            nom = bloc if len(plans) == 1 else f"{bloc}p{k + 1}"
            segments.append((nom, img_p, mouv_p, deb_p, fin_p - deb_p,
                             fi if k == 0 else 0.0,
                             fo if k == len(plans) - 1 else 0.0))
        t = fin_bloc
    duree_tot = t
    print(f"Timeline : {len(timeline)} prises, {len(segments)} plans, duree totale {duree_tot:.1f}s")

    # Cloches : ouverture, cut de T2 (fin VO T02), titre final (juste avant T12).
    fin_t02 = next(d + p for v, p, d in timeline if v == "T02.mp3")
    deb_t12 = next(p for v, p, d in timeline if v == "T12.mp3")
    cloches = [0.2, fin_t02 - 0.15, deb_t12 - 0.4]
    print("Cloches à :", [f"{c:.2f}s" for c in cloches])

    # Pulses de lumière : (asset, T, montee, plateau, descente, opacite).
    deb_t09p3 = next(d for nm, _, _, d, _, _, _ in segments if nm == "T09p3")
    deb_t11, fin_t11 = spans["T11"]
    deb_t12bloc, _ = spans["T12"]
    d_vo12 = next(d for v, p, d in timeline if v == "T12.mp3")
    carton_abs = deb_t12bloc + 2.0 + d_vo12 - 0.4
    halo_hold = max(0.0, duree_tot - carton_abs - 1.5 - 2.0)
    pulses = [
        ("gold", fin_t02 - 0.15, 0.6, 1.2, 2.0, 0.55),  # le glas de l'Astrolabe
        ("gold", deb_t09p3, 0.4, 0.8, 1.5, 0.50),  # « So we will fight »
        ("portal", deb_t11 + (fin_t11 - deb_t11) * 0.4, 1.0, 2.0, 2.5, 0.60),
        ("gold", carton_abs, 1.5, halo_hold, 2.0, 0.45),  # halo du carton titre
    ]

    if not audio_only:
        # 2. Segments vidéo.
        listes_concat = []
        for i, (bloc, img, mouv, debut, duree, fi, fo) in enumerate(segments):
            n = max(2, round(duree * FPS))
            vf = [filtre_zoompan(mouv, n), f"fps={FPS}", "format=yuv420p"]
            if fi:
                vf.append(f"fade=t=in:st=0:d={fi}")
            if fo:
                vf.append(f"fade=t=out:st={duree - fo:.3f}:d={fo}")
            seg = os.path.join(tmp, f"seg{i:02d}.mp4")
            if bloc == "T12":
                print(f"  {bloc} : {duree:.1f}s ({n} img, carton à {2.0 + d_vo12 - 0.4:.1f}s)")
                rendre_t12(os.path.join(K4, img), tmp, seg, n, duree, fi, fo, timeline)
                listes_concat.append(f"file '{seg}'")
                continue
            run([FF, "-y", "-v", "error", "-i", os.path.join(K4, img),
                 "-vf", ",".join(vf), "-frames:v", str(n),
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
                 seg])
            listes_concat.append(f"file '{seg}'")
            print(f"  {bloc} : {duree:.1f}s ({n} img, {mouv})")
        liste = os.path.join(tmp, "concat.txt")
        with open(liste, "w") as f:
            f.write("\n".join(listes_concat))

        video = os.path.join(tmp, "video.mp4")
        run([FF, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", liste,
             "-c", "copy", video])

        # 3. Post-production : étalonnage + voile de sable + couche lumière
        # pré-rendue + vignette + grain.
        sable = generer_sable(os.path.join(tmp, "sable.mp4"))
        flare_gold = generer_flare(os.path.join(tmp, "flare-gold.png"))
        flare_portal = generer_flare(os.path.join(tmp, "flare-portal.png"),
                                     teinte=(170, 215, 255), cy=0.45)
        assets = {"gold": flare_gold, "portal": flare_portal}
        lumiere = generer_lumiere(os.path.join(tmp, "lumiere.mp4"), duree_tot, pulses, assets)
        cmd = [FF, "-y", "-v", "error", "-i", video, "-stream_loop", "-1", "-i", sable,
               "-i", lumiere]
        fc = [f"[0:v]fps={FPS},eq=saturation=1.06,"
              f"colortemperature=temperature=5200:mix=0.12[v0]",
              f"[1:v]fps={FPS},trim=0:{duree_tot:.2f},setpts=PTS-STARTPTS,format=yuv420p,"
              f"fade=t=in:st=0:d=3,fade=t=out:st={duree_tot - 3:.2f}:d=3[s]",
              "[v0][s]blend=all_mode=screen:all_opacity=0.50[v1]",
              f"[2:v]fps={FPS},trim=0:{duree_tot:.2f},setpts=PTS-STARTPTS,format=yuv420p[l]",
              "[v1][l]blend=all_mode=screen:all_opacity=1.0[v2]",
              "[v2]vignette=angle=PI/4.6,noise=alls=5:allf=t,format=yuv420p[vout]"]
        video_post = os.path.join(tmp, "video-post.mp4")
        run(cmd + ["-filter_complex", ";".join(fc), "-map", "[vout]",
                   "-t", f"{duree_tot:.2f}",
                   "-c:v", "libx264", "-preset", "fast", "-crf", "21",
                   video_post])
        print(f"Post : {os.path.getsize(video_post) / 1e6:.1f} Mo")

    # 4. Cloche (réelle si fournie, sinon synthétique : partiels inharmoniques).
    bell_src = None
    for cand in ("bell-hit.wav", "bell-hit.mp3"):
        if os.path.exists(os.path.join(AMB_DIR, cand)):
            bell_src = os.path.join(AMB_DIR, cand)
            break
    bell = os.path.join(tmp, "bell.wav")
    if bell_src:
        print(f"Cloche réelle : {bell_src}")
        run([FF, "-y", "-v", "error", "-i", bell_src, "-af",
             "aresample=44100,aformat=channel_layouts=stereo", bell])
    else:
        partiels = "sin(2*PI*98*t)+0.55*sin(2*PI*198*t)+0.35*sin(2*PI*269*t)"
        partiels += "+0.22*sin(2*PI*369*t)+0.12*sin(2*PI*530*t)"
        run([FF, "-y", "-v", "error", "-f", "lavfi",
             "-i", f"aevalsrc=exprs='exp(-2.5*t)*({partiels})':s=44100:d=5",
             "-af", "lowpass=f=3200,volume=0.4,aformat=channel_layouts=stereo",
             bell])

    # 5. Whoosh de transition (bruit rose filtré, un par frontière de bloc).
    whoosh = os.path.join(tmp, "whoosh.wav")
    run([FF, "-y", "-v", "error", "-f", "lavfi", "-i",
         "anoisesrc=color=pink:d=1.4:seed=7", "-af",
         "highpass=f=150,lowpass=f=900,volume='0.9*sin(PI*t/1.4)':eval=frame,"
         "aresample=44100,aformat=channel_layouts=stereo", whoosh])

    # 6. Mix audio : VO + nappe (duckée) + cloches + whooshes + ambiances.
    cmd = [FF, "-y", "-v", "error"]
    for vo, _, _ in timeline:
        cmd += ["-i", os.path.join(VO, vo)]
    n_vo = len(timeline)
    cmd += ["-i", bell, "-i", MUSIQUE, "-i", MUSIQUE, "-i", whoosh]
    i_bell, i_m1, i_m2, i_wh = n_vo, n_vo + 1, n_vo + 2, n_vo + 3
    idx_entrees = []
    for fichier, bdeb, bfin, niveau in AMB:
        chemin = os.path.join(AMB_DIR, fichier)
        if os.path.exists(chemin):
            idx_entrees.append((n_vo + 4 + len(idx_entrees), fichier, bdeb, bfin, niveau))
            cmd += ["-stream_loop", "-1", "-i", chemin]
    if idx_entrees:
        print("Ambiances :", [f for _, f, _, _, _ in idx_entrees])
    else:
        print("Ambiances : aucune (voir audio/amb/README.md)")
    fc = []
    for k, (vo, debut, _) in enumerate(timeline):
        ms = int(debut * 1000)
        fc.append(f"[{k}]aresample=44100,aformat=channel_layouts=stereo,"
                  f"adelay={ms}|{ms}[v{k}]")
    fc.append("".join(f"[v{k}]" for k in range(n_vo)) + f"amix={n_vo}:normalize=0[vo0]")
    fc.append("[vo0]asplit=2[vo_key][vo_mix]")
    fc.append(f"[{i_bell}]asplit=3[b0][b1][b2]")
    for j, c in enumerate(cloches):
        ms = int(c * 1000)
        fc.append(f"[b{j}]adelay={ms}|{ms}[bb{j}]")
    fc.append("[bb0][bb1][bb2]amix=3:normalize=0,volume=0.5[cloches]")
    fc.append(f"[{i_m1}][{i_m2}]acrossfade=d=6:curve1=tri:curve2=tri[bed0]")
    fc.append(f"[bed0]atrim=0:{duree_tot:.2f},afade=t=in:st=0:d=2,volume=0.15[bed]")
    fc.append("[bed][vo_key]sidechaincompress=threshold=0.03:ratio=3:"
              "attack=250:release=1000[duck]")
    n_wh = len(frontieres)
    fc.append(f"[{i_wh}]asplit={n_wh}" + "".join(f"[w{j}]" for j in range(n_wh)))
    for j, front in enumerate(frontieres):
        ms = int(max(0.0, front - 0.7) * 1000)
        fc.append(f"[w{j}]adelay={ms}|{ms}[ww{j}]")
    fc.append("".join(f"[ww{j}]" for j in range(n_wh)) +
              f"amix={n_wh}:normalize=0,volume=0.30[whooshes]")
    bus = ["[vo_mix]", "[duck]", "[cloches]", "[whooshes]"]
    if idx_entrees:
        for m, (idx, fichier, bdeb, bfin, niveau) in enumerate(idx_entrees):
            deb = spans[bdeb][0] if bdeb else 0.0
            fin = spans[bfin][1] if bfin else duree_tot
            fc.append(f"[{idx}]aresample=44100,aformat=channel_layouts=stereo,"
                      f"atrim=0:{fin - deb:.2f},"
                      f"afade=t=in:st=0:d={FADE_AMB},"
                      f"afade=t=out:st={fin - deb - FADE_AMB:.2f}:d={FADE_AMB},"
                      f"adelay={int(deb * 1000)}|{int(deb * 1000)},"
                      f"volume={niveau}[amb{m}]")
        fc.append("".join(f"[amb{m}]" for m in range(len(idx_entrees))) +
                  f"amix={len(idx_entrees)}:normalize=0[amb]")
        bus.append("[amb]")
    fc.append("".join(bus) + f"amix={len(bus)}:normalize=0,"
              f"afade=t=out:st={duree_tot - 3:.2f}:d=3,"
              f"alimiter=limit=0.95,apad=whole_dur={duree_tot:.2f}[mix]")
    mix = os.path.join(tmp, "mix.m4a")
    run(cmd + ["-filter_complex", ";".join(fc), "-map", "[mix]",
               "-c:a", "aac", "-b:a", "160k", "-ar", "44100", mix])

    # 7. Mux final.
    final = os.path.join(MONTAGE, "cine-intro-en-1080p.mp4")
    if audio_only:
        # La vidéo existe déjà : on ne remplace que la piste audio.
        tmp_final = os.path.join(tmp, "final.mp4")
        run([FF, "-y", "-v", "error", "-i", final, "-i", mix,
             "-map", "0:v", "-map", "1:a", "-c", "copy",
             "-movflags", "+faststart", tmp_final])
        os.replace(tmp_final, final)
    else:
        run([FF, "-y", "-v", "error", "-i", video_post, "-i", mix,
             "-c", "copy", "-movflags", "+faststart", final])
    print(f"MP4 : {final} ({os.path.getsize(final) / 1e6:.1f} Mo)")

    # 8. Sous-titres EN recalés (répartition au prorata des caractères).
    lignes = ["WEBVTT - Le Sablier, intro EN (recalé sur la VO définitive)", ""]
    for vo, debut, duree in timeline:
        cues = CUES[vo]
        poids = [len(a or "") + len(b or "") for a, b in cues]
        total_p = sum(poids)
        pos = debut
        for (a, b), p in zip(cues, poids):
            d = duree * p / total_p
            fin = pos + d - 0.08
            lignes.append(f"{fmt_vtt(pos)} --> {fmt_vtt(fin)} line:-4")
            lignes.append(a + (f"\n{b}" if b else ""))
            lignes.append("")
            pos += d
    vtt = os.path.join(MONTAGE, "sous-titres-en.vtt")
    with open(vtt, "w") as f:
        f.write("\n".join(lignes))
    print(f"VTT : {vtt}")


if __name__ == "__main__":
    main()
