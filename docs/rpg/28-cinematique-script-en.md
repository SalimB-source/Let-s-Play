# 28 — Intro cinematic: English recording script

> English adaptation of [`27-cinematique-script.md`](27-cinematique-script.md)
> (« Que ton nom soit écrit »). Same 12 tableaux, same timings, same images.
> Adapted for spoken English — same duration and rhythm, not word-for-word.
> Title stays **LE SABLIER** in all languages; tagline EN:
> *May your name be written.*

Legend: **VO** = narrator · **PLAYED** = acted line · `[brackets]` = direction,
never read. Directions are in French (recording notes for the author).

---

**T1 — Bab El** *(grave et calme, poser la voix)*
> VO: There are cities built on stone. Bab El is built on time. Nine tiers of
> copper and limestone, raised around a portal that never opened. And beneath
> it… [2 s silence] a desert that rises.

**T2 — The Astrolabe** *(montée discrète, martelé sans crier, couper net)*
> VO: Above the ninth tier turns the Astrolabe. It does not count the hours.
> It counts the cycles we have left. And when it tolls…

**T3 — The Taking** *(factuel, presque administratif)*
> VO: The first tier is already lost. Then the second. Then the third. Today,
> we live on the fourth. Everyone knows. And everyone keeps living.

**T4 — The Chamber of Hours** *(« …and the others » presque murmuré ; fin douce)*
> VO: What holds the city together is no king, no god. It is an
> administration: the Chamber of Hours. Every cycle, it publishes the List —
> those evacuated first… and the others. Its agents carry no weapons. They
> carry ledgers.

**T5 — The Hollows** *(le plus poétique — ralentir encore ; ironie douce-amère)*
> VO: Here, sand does not fall from the sky — it rises from the ground. And it
> keeps the trace. Where someone has fallen, the sand keeps their weight as a
> hollow. The poor sell sand heavy with memories. The rich pay to have it
> sifted. Nothing that falls is lost… to everyone.

**T6 — The Sounder** *(respect, affection ; trois coups nets)*
> VO: Salem goes down into the condemned tiers before the taking, to make sure
> no one is left. Hooked pole, rope, notebook. He always brings someone back.
> And it is never enough.

**T7 — The five** *(respirer entre chaque personnage ; Yamina = gravité,
Fériel = sourire, Boualem = mystère, Tarek = malice ; jamais accélérer)*
> VO: At his side: Yamina, the clockmaker, who signed a List at nineteen —
> and has been trying to repair the irreparable ever since. Fériel, the
> glassblower, who turns sand into shields. Boualem, the well-digger, who found
> something beneath the city… and does not speak of it. And Tarek, the porter,
> who carries the Chamber's crates — and its secrets.

**T8 — Where they are written** *(le cœur — les 2 répliques JOUÉES, autre voix
si possible ; silence 2 s après la Scribe)*
> VO: This time, Salem came back up with twelve people from a condemned
> district. Twelve living souls.
> PLAYED — Salem *(grave, fatigué, factuel)*: They're standing right behind me.
> PLAYED — The Scribe *(polie, inflexible, jamais méchante)*: I'm not asking
> where they are. I'm asking where they are written.
> VO: The district has been officially empty since yesterday. With no
> registration, no shelter in the upper tiers. Twelve living souls… who exist
> nowhere.

**T9 — Trial by duel** *(énergie neuve, appel à l'action, rythme franc)*
> VO: One recourse remains. An old right, one even the Chamber honours: trial
> by duel. The cards are fragments of memory, and pacts. A keeper who loses
> must open their archives… or grant passage. So we will fight. Not to kill.
> To be written.

**T10 — The Grand Horologist's tea** *(courtoisie feutrée ; « He never lies »
presque admiratif, silence, « He omits » définitif)*
> VO: At the top of the Tower of Lists waits the Grand Horologist Mahieddine.
> A gentle man, polite, who offers you tea… and has been signing the List for
> forty years. He never lies. [2 s silence] He omits.

**T11 — The sealed portal** *(voix qui descend ; phrase en suspens)*
> VO: And behind it all, the sealed portal. No one knows who built it. No one
> knows what it holds back. But the Astrolabe will toll again. And this
> time…

**T12 — Title** *(silence 2 s avant ; plus bas, proche du micro, confidence)*
> VO: …you hold the cards.
> Card: **LE SABLIER** — *May your name be written.*

---

## Version ElevenLabs (copier-coller, un bloc = une génération)

Réglages : modèle **Eleven v3** (pas v2 — les tags n'existent que sur v3),
Stability **Natural** (→ Robust si la voix dérive), Speed **≈ 0.95**.
Une voix pour le narrateur (les 12 blocs), une voix homme pour Salem, une
voix femme pour la Scribe. 2–3 takes par bloc, garder la meilleure.
Si un tag est *lu* à voix haute, le retirer et régénérer.

```text
--- T1 NARRATEUR ---
[calmly] [slowly]
There are cities built on stone.
Bab El is built on time.
Nine tiers of copper and limestone, raised around a portal that never opened.
And beneath it… [pause]
[softly] a desert that rises.

--- T2 NARRATEUR ---
[seriously]
Above the ninth tier turns the Astrolabe.
[firmly] It does not count the hours.
It counts the cycles we have left.
[darkly] And when it tolls…

--- T3 NARRATEUR ---
[calmly] [coldly]
The first tier is already lost.
Then the second.
Then the third.
[softly] Today, we live on the fourth.
Everyone knows.
[tenderly] And everyone keeps living.

--- T4 NARRATEUR ---
[seriously]
What holds the city together is no king, no god.
It is an administration: the Chamber of Hours.
Every cycle, it publishes the List —
[softly] those evacuated first… and the others.
[coldly] [quietly] Its agents carry no weapons.
They carry ledgers.

--- T5 NARRATEUR ---
[gently] [slowly]
Here, sand does not fall from the sky — it rises from the ground.
And it keeps the trace.
[softly] Where someone has fallen, the sand keeps their weight as a hollow.
The poor sell sand heavy with memories.
The rich pay to have it sifted.
[pause] [wistfully] Nothing that falls is lost… to everyone.

--- T6 NARRATEUR ---
[warmly]
Salem goes down into the condemned tiers before the taking, to make sure no one is left.
[firmly] Hooked pole, rope, notebook.
He always brings someone back.
[sadly] [softly] And it is never enough.

--- T7 NARRATEUR ---
[warmly]
At his side: Yamina, the clockmaker,
[seriously] who signed a List at nineteen — and has been trying to repair the irreparable ever since.
[playfully] [warmly] Fériel, the glassblower, who turns sand into shields.
[darkly] [quietly] Boualem, the well-digger, who found something beneath the city… and does not speak of it.
[playfully] [quietly] And Tarek, the porter, who carries the Chamber's crates — and its secrets.

--- T8 NARRATEUR (avant dialogue) ---
[seriously]
This time, Salem came back up with twelve people from a condemned district.
[softly] Twelve living souls.

--- T8 SALEM (voix homme) ---
[tired] [firmly] They're standing right behind me.

--- T8 SCRIBE (voix femme) ---
[calmly] [coldly] I'm not asking where they are. I'm asking where they are written.

--- T8 NARRATEUR (après dialogue) ---
[pause]
[coldly] The district has been officially empty since yesterday.
With no registration, no shelter in the upper tiers.
[softly] [sadly] Twelve living souls… who exist nowhere.

--- T9 NARRATEUR ---
[resolutely]
One recourse remains.
An old right, one even the Chamber honours: trial by duel.
[seriously] The cards are fragments of memory, and pacts.
A keeper who loses must open their archives… or grant passage.
[firmly] So we will fight.
Not to kill.
[resolutely] To be written.

--- T10 NARRATEUR ---
[warmly] [calmly]
At the top of the Tower of Lists waits the Grand Horologist Mahieddine.
A gentle man, polite, who offers you tea… and has been signing the List for forty years.
[softly] He never lies.
[pause]
[coldly] [quietly] He omits.

--- T11 NARRATEUR ---
[darkly] [slowly]
And behind it all, the sealed portal.
No one knows who built it.
No one knows what it holds back.
[pause] [ominously] But the Astrolabe will toll again.
And this time…

--- T12 NARRATEUR ---
[pause]
[whispers] …you hold the cards.
```
