#!/usr/bin/env python3
"""Montage de la cinematique d'intro EN du Sablier.

Assemble : 12 tableaux 4K (Ken Burns) + 15 prises VO + nappe musicale
+ 3 cloches synthetiques + carton titre -> MP4 1080p + sous-titres EN recales.

Entrees : public/sablier-cinematic/4k/*.jpg, audio/en/T*.mp3,
          public/Desert Solitude with Percussion.mp3
Sorties : public/sablier-cinematic/montage/cine-intro-en-1080p.mp4
          public/sablier-cinematic/montage/sous-titres-en.vtt
Usage : python3 tools/monter-cinematique.py
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont
import tempfile

import imageio_ffmpeg
from mutagen.mp3 import MP3

FF = imageio_ffmpeg.get_ffmpeg_exe()
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CINE = os.path.join(RACINE, "public", "sablier-cinematic")
K4 = os.path.join(CINE, "4k")
VO = os.path.join(CINE, "audio", "en")
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
        print("ECHEC:", " ".join(cmd[:6]), "...", file=sys.stderr)
        print(r.stderr[-3000:], file=sys.stderr)
        raise SystemExit(1)
    return r


# (bloc, image, mouvement, tête, queue, fade_in, fade_out, [(vo, gap_avant)])
BLOCS = [
    ("T01", "cine-t01-bab-el-4k.jpg", "zin", 2.2, 0.9, 0.8, 0.35, [("T01.mp3", 0)]),
    ("T02", "cine-t02-astrolabe-4k.jpg", "zin_slow", 0.6, 0.5, 0.35, 0.0, [("T02.mp3", 0)]),
    ("T03", "cine-t03-reprise-4k.jpg", "panD", 0.6, 0.9, 0.0, 0.35, [("T03.mp3", 0)]),
    ("T04", "cine-t04-liste-4k.jpg", "panR", 0.6, 0.9, 0.35, 0.35, [("T04.mp3", 0)]),
    ("T05", "cine-t05-creux-4k.jpg", "zout", 0.6, 0.9, 0.35, 0.35, [("T05.mp3", 0)]),
    ("T06", "cine-t06-sondeur-4k.jpg", "panD", 0.6, 0.9, 0.35, 0.35, [("T06.mp3", 0)]),
    ("T07", "cine-t07-cinq-4k.jpg", "zin", 0.6, 0.9, 0.35, 0.35, [("T07.mp3", 0)]),
    ("T08", "cine-t08-greffe-4k.jpg", "zin_slow", 0.6, 0.9, 0.35, 0.35,
     [("T08a.mp3", 0), ("T08b.mp3", 0.5), ("T08c.mp3", 0.6), ("T08d.mp3", 2.0)]),
    ("T09", "cine-t09-duel-4k.jpg", "zin", 0.6, 0.9, 0.35, 0.35, [("T09.mp3", 0)]),
    ("T10", "cine-t10-the-4k.jpg", "zin_slow", 0.6, 1.5, 0.35, 0.35, [("T10.mp3", 0)]),
    ("T11", "cine-t11-portail-4k.jpg", "zin", 0.6, 1.0, 0.35, 0.35, [("T11.mp3", 0)]),
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


def filtre_zoompan(mouvement, n):
    cx = "x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2'"
    if mouvement == "zin":
        zp = f"z='1+0.07*on/{n}'"
    elif mouvement == "zin_slow":
        zp = f"z='1+0.035*on/{n}'"
    elif mouvement == "zout":
        zp = f"z='1.07-0.07*on/{n}'"
    elif mouvement == "static":
        zp = f"z='1+0.015*on/{n}'"
    elif mouvement == "panR":
        return f"zoompan=z=1.09:x='(iw-iw/zoom)*on/{n}':y='(ih-ih/zoom)/2':d={n}:s={W}x{H}:fps={FPS}"
    elif mouvement == "panD":
        return f"zoompan=z=1.09:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*on/{n}':d={n}:s={W}x{H}:fps={FPS}"
    else:
        raise ValueError(mouvement)
    return f"zoompan={zp}:{cx}:d={n}:s={W}x{H}:fps={FPS}"


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


def fmt_vtt(sec):
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def main():
    os.makedirs(MONTAGE, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="cine-")

    # 1. Timeline : positions absolues de chaque prise VO.
    timeline = []  # (fichier_vo, debut_abs, duree)
    segments = []  # (bloc, image, mouvement, debut_abs, duree, fi, fo)
    t = 0.0
    for bloc, img, mouv, tete, queue, fi, fo, prises in BLOCS:
        pos = t + tete
        for vo, gap in prises:
            pos += gap
            d = duree_mp3(os.path.join(VO, vo))
            timeline.append((vo, pos, d))
            pos += d
        duree_seg = (pos - t) + queue
        segments.append((bloc, img, mouv, t, duree_seg, fi, fo))
        t += duree_seg
    duree_tot = t
    print(f"Timeline : {len(timeline)} prises, duree totale {duree_tot:.1f}s")

    # Cloches : ouverture, cut de T2 (fin VO T02), titre final (juste avant T12).
    fin_t02 = next(d + p for v, p, d in timeline if v == "T02.mp3")
    deb_t12 = next(p for v, p, d in timeline if v == "T12.mp3")
    cloches = [0.2, fin_t02 - 0.15, deb_t12 - 0.4]
    print("Cloches à :", [f"{c:.2f}s" for c in cloches])

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
            d_vo12 = next(d for v, p, d in timeline if v == "T12.mp3")
            print(f"  {bloc} : {duree:.1f}s ({n} img, carton à {2.0 + d_vo12 - 0.4:.1f}s)")
            rendre_t12(os.path.join(K4, img), tmp, seg, n, duree, fi, fo, timeline)
            listes_concat.append(f"file '{seg}'")
            continue
        run([FF, "-y", "-v", "error", "-i", os.path.join(K4, img),
             "-vf", ",".join(vf), "-frames:v", str(n),
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
             seg])
        listes_concat.append(f"file '{seg}'")
        print(f"  {bloc} : {duree:.1f}s ({n} img)")
    liste = os.path.join(tmp, "concat.txt")
    with open(liste, "w") as f:
        f.write("\n".join(listes_concat))

    video = os.path.join(tmp, "video.mp4")
    run([FF, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", liste,
         "-c", "copy", video])

    # 3. Cloche synthétique (partiels inharmoniques amortis, ~sol grave).
    bell = os.path.join(tmp, "bell.wav")
    partiels = "sin(2*PI*98*t)+0.55*sin(2*PI*198*t)+0.35*sin(2*PI*269*t)"
    partiels += "+0.22*sin(2*PI*369*t)+0.12*sin(2*PI*530*t)"
    run([FF, "-y", "-v", "error", "-f", "lavfi",
         "-i", f"aevalsrc=exprs='exp(-2.5*t)*({partiels})':s=44100:d=5",
         "-af", "lowpass=f=3200,volume=0.4,aformat=channel_layouts=stereo",
         bell])

    # 4. Mix audio : VO + nappe (duckée) + cloches.
    cmd = [FF, "-y", "-v", "error"]
    for vo, _, _ in timeline:
        cmd += ["-i", os.path.join(VO, vo)]
    n_vo = len(timeline)
    cmd += ["-i", bell, "-i", MUSIQUE, "-i", MUSIQUE]
    i_bell, i_m1, i_m2 = n_vo, n_vo + 1, n_vo + 2
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
    fc.append(f"[vo_mix][duck][cloches]amix=3:normalize=0,"
              f"afade=t=out:st={duree_tot - 3:.2f}:d=3,"
              f"alimiter=limit=0.95,apad=whole_dur={duree_tot:.2f}[mix]")
    mix = os.path.join(tmp, "mix.m4a")
    run(cmd + ["-filter_complex", ";".join(fc), "-map", "[mix]",
               "-c:a", "aac", "-b:a", "160k", "-ar", "44100", mix])

    # 5. Mux final.
    final = os.path.join(MONTAGE, "cine-intro-en-1080p.mp4")
    run([FF, "-y", "-v", "error", "-i", video, "-i", mix,
         "-c", "copy", "-movflags", "+faststart", final])
    print(f"MP4 : {final} ({os.path.getsize(final) / 1e6:.1f} Mo)")

    # 6. Sous-titres EN recalés (répartition au prorata des caractères).
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
