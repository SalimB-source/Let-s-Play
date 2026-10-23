/**
 * La carte de profil du joueur — src/games/RpgProfilJoueur.jsx
 * ------------------------------------------------------------
 * Une carte, et rien d'autre (`dossier 20-profil-joueur-xp.md`) : le visage, le
 * nom, le niveau, la barre d'XP — et de quoi choisir **qui l'on est** : un
 * avatar, un emblème, un pseudo, et la table sur laquelle on reçoit.
 *
 * Tout le reste a été retiré : le rang et sa phrase, l'état de synchronisation,
 * les seize compteurs, le barème des dix gestes, le journal des vingt derniers
 * paliers, la liste des paliers à venir et la formule de la courbe. Ces chiffres
 * existent toujours — dans `rpgProfil.js`, dans le Souk, dans la collection —
 * mais la carte de profil n'est pas un tableau de bord. Ce qu'elle répond tient
 * en une ligne : **qui je suis, et où j'en suis de mon prochain paquet.**
 *
 * Les trois choix sont des gestes, pas des informations : douze visages du
 * récit (`rpgAvatars.js`), six emblèmes en glyphes de texte, douze terrains de
 * duel (`rpgPlateaux.js`) plus « au gré du deck ». Les vignettes pèsent de 6 à
 * 34 Ko — le bandeau entier coûte moins qu'une seule peinture de carte. Elles
 * sont peintes en `background-image` des boutons, pas en `<img>` : ce sont des
 * décors de bouton, le nom accessible porte déjà tout (`aria-label`, `title`).
 *
 * Sous la barre, la **piste des gains** (`RpgProfilPiste.jsx`) : un chemin de
 * paliers qui défile, du niveau en cours jusqu'au prochain rang puis quatre
 * niveaux au-delà. Elle dit ce que chaque niveau rapporte — un paquet du Souk,
 * un rang de Bab El, un cadre de médaillon, un titre sous le pseudo — et c'est
 * là que les cosmétiques gagnés se portent. La carte y gagne une ligne de plus,
 * pas un tableau de bord : aucun compteur, aucun barème, aucune formule n'est
 * revenu.
 *
 * Comme l'écran du Souk, celui-ci est **purement présentationnel** : la barre
 * vient de `rpgProfil.js`, les gains de `rpgProfilGains.js`, la persistance de
 * `useSablierBourse.js`. Il rend toujours quelque chose — un profil vide dit
 * « Niveau 1 », il ne casse jamais l'écran.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './rpg-profil.css';
import {
  COURBE,
  EMBLEMES,
  boostersDus,
  glypheEmbleme,
  progressionDeXp,
  pseudoLisible,
  xpLisible,
} from './rpgProfil.js';
import { RPG_AVATARS, avatarDeProfil, vignetteAvatar } from './rpgAvatars.js';
import { RPG_PLATEAUX, vignettePlateau } from './rpgPlateaux.js';
import { cadreDeProfil, titreDeProfil } from './rpgProfilGains.js';
import RpgProfilPiste from './RpgProfilPiste.jsx';

/** Le préfixe de `public/` : `/Let-s-Play/` en ligne, `/` sur le bureau. */
const BASE_URL = import.meta.env?.BASE_URL ?? '/';

export default function RpgProfilJoueur({
  profil = null,
  nomCompte = null,
  onRenommer = null,
  onChoisirEmbleme = null,
  onChoisirAvatar = null,
  onChoisirPlateau = null,
  onChoisirCadre = null,
  onChoisirTitre = null,
  onPlaySfx = null,
  onExit = null,
  onOuvrirSouk = null,
}) {
  const barre = useMemo(() => progressionDeXp(profil?.xp ?? 0), [profil?.xp]);
  const { niveau, into, need, percent, reste, maximal } = barre;
  const glyphe = glypheEmbleme(profil);
  const avatar = avatarDeProfil(profil);
  const plateauChoisi = profil?.plateau ?? null;
  // Le nom de ce qui est choisi s'écrit sur l'étiquette du geste : cliquer doit
  // se **voir** ailleurs que sur un anneau de 44 px — le cachet du médaillon et
  // l'étiquette le disent, même quand la tuile choisie a défilé hors de vue.
  const emblemeChoisi = EMBLEMES.find((embleme) => embleme.glyphe === glyphe) ?? EMBLEMES[0];
  const tableChoisie = RPG_PLATEAUX.find((table) => table.id === plateauChoisi) ?? null;
  // Ce que le joueur **porte** parmi ce qu'il a gagné : un cadre de médaillon et
  // un titre. Les deux se calculent — un gain que le niveau ne donne pas ne se
  // porte pas, même écrit dans une sauvegarde.
  const cadrePorte = cadreDeProfil(profil);
  const titrePorte = titreDeProfil(profil);
  const dus = boostersDus(profil);

  const nom = pseudoLisible(profil, nomCompte);
  const [saisie, setSaisie] = useState(nom);
  const [modifie, setModifie] = useState(false);
  const saisieRef = useRef(null);
  // Le pseudo peut arriver après le premier rendu (compte restauré, connexion) :
  // la saisie suit tant que le joueur n'a rien tapé.
  useEffect(() => { if (!modifie) setSaisie(nom); }, [nom, modifie]);

  const enregistrer = () => {
    const propre = saisie.trim();
    const change = onRenommer?.(propre);
    onPlaySfx?.(change ? 'select' : 'erreur');
    if (change) { setModifie(false); setSaisie(propre); saisieRef.current?.blur?.(); }
  };

  return (
    <main className="rpg-profil" aria-label="Profil du joueur" data-profil>
      <button
        type="button"
        className="rpg-menu-button rpg-profil__retour"
        data-profil-retour
        onClick={() => { onPlaySfx?.('menu'); onExit?.(); }}
      >
        <span aria-hidden="true">←</span> Menu
      </button>

      <div className="rpg-profil__carte">
        <span className="rpg-profil__tete" data-profil-cadre={cadrePorte.id}>
          <span
            className={`rpg-profil__medaillon${avatar ? ' rpg-profil__medaillon--visage' : ''}`}
            style={avatar ? { backgroundImage: `url("${vignetteAvatar(avatar.id, BASE_URL)}")` } : undefined}
            data-profil-medaille={avatar?.id ?? 'glyphe'}
            data-profil-avatar-image={avatar?.id ?? undefined}
          >
            {avatar ? null : glyphe}
          </span>
          {/* Le cachet de cire : quand le médaillon porte un visage, l'emblème
              choisi se pose dessus en sceau — sans visage, c'est le médaillon
              lui-même qui porte le glyphe, et le répéter ici ne ferait que
              charger la carte. Un emblème se lit donc toujours, une seule fois. */}
          {avatar ? (
            <span className="rpg-profil__cachet" aria-hidden="true" data-profil-cachet={emblemeChoisi.id}>
              {glyphe}
            </span>
          ) : null}
        </span>
        <h2 className="rpg-profil__nom" data-profil-pseudo={nom}>{nom}</h2>
        {titrePorte ? (
          <p className="rpg-profil__titre" data-profil-titre={titrePorte.id}>{titrePorte.nom}</p>
        ) : null}
        <p className="rpg-profil__niveau" data-profil-niveau={niveau}>
          Niveau {niveau}{maximal ? ' — maximal' : ''}
        </p>

        {/* La barre reste un `progressbar` complet : la progression ne passe pas
            par la couleur seule, le chiffre est écrit dessous (dossier 04, §6). */}
        <div
          className="rpg-profil__xp-piste"
          role="progressbar"
          aria-valuenow={into}
          aria-valuemin={0}
          aria-valuemax={need || 0}
          aria-label={`Expérience du niveau ${niveau}${maximal ? ' — niveau maximal' : ` : ${into} XP sur ${need}`}`}
          data-profil-xp={into}
          data-profil-xp-need={need}
          data-profil-xp-maximal={maximal || undefined}
        >
          <i style={{ width: `${percent}%` }} data-profil-xp-percent={percent} />
        </div>
        <p className="rpg-profil__xp-lecture" data-profil-xp-reste={reste}>
          {maximal ? 'Plus aucun palier à franchir.' : `${xpLisible(into)} / ${xpLisible(need)} XP`}
        </p>

        {/* La piste des gains : ce que rapportent les prochains niveaux, en
            défilant. C'est aussi là qu'un cadre ou un titre gagné se porte. */}
        <RpgProfilPiste
          profil={profil}
          onChoisirCadre={onChoisirCadre}
          onChoisirTitre={onChoisirTitre}
          onPlaySfx={onPlaySfx}
        />

        {dus > 0 && (
          <p className="rpg-profil__attente" role="status" data-profil-attente={dus}>
            <button
              type="button"
              className="rpg-profil__attente-aller"
              data-profil-attente-aller
              onClick={() => { onPlaySfx?.('menu'); onOuvrirSouk?.(); }}
            >
              <span aria-hidden="true">✦</span>
              {dus === 1 ? 'Un paquet vous attend' : `${dus} paquets vous attendent`}
            </button>
          </p>
        )}

        {/* Qui l'on est : trois gestes, chacun sur sa ligne, aucun chiffre. */}
        <div className="rpg-profil__choix">
          <span className="rpg-profil__etiquette" id="rpg-profil-visage" aria-hidden="true">
            Visage{avatar ? <b> · {avatar.nom}</b> : null}
          </span>
          <div
            className="rpg-profil__avatars"
            role="group"
            aria-labelledby="rpg-profil-visage"
            data-profil-avatars={RPG_AVATARS.length}
          >
            {RPG_AVATARS.map((figure) => {
              const choisi = avatar?.id === figure.id;
              return (
                <button
                  key={figure.id}
                  type="button"
                  className={`rpg-profil__avatar${choisi ? ' is-choisi' : ''}`}
                  aria-pressed={choisi}
                  aria-label={`${figure.nom} — ${figure.fonction}`}
                  title={`${figure.nom} — ${figure.fonction}`}
                  data-profil-avatar={figure.id}
                  style={{ backgroundImage: `url("${vignetteAvatar(figure.id, BASE_URL)}")` }}
                  onClick={() => {
                    const change = onChoisirAvatar?.(figure.id);
                    onPlaySfx?.(change ? 'select' : 'menu');
                  }}
                />
              );
            })}
          </div>

          <span className="rpg-profil__etiquette" id="rpg-profil-cachet" aria-hidden="true">
            Emblème<b> · {emblemeChoisi.nom}</b>
          </span>
          <div
            className="rpg-profil__emblemes"
            role="group"
            aria-labelledby="rpg-profil-cachet"
            data-profil-emblemes={EMBLEMES.length}
          >
            {EMBLEMES.map((embleme) => {
              const choisi = glyphe === embleme.glyphe;
              return (
                <button
                  key={embleme.id}
                  type="button"
                  className={`rpg-profil__embleme${choisi ? ' is-choisi' : ''}`}
                  aria-pressed={choisi}
                  aria-label={embleme.nom}
                  title={embleme.nom}
                  data-profil-embleme={embleme.id}
                  onClick={() => {
                    const change = onChoisirEmbleme?.(embleme.id);
                    onPlaySfx?.(change ? 'select' : 'menu');
                  }}
                >
                  {embleme.glyphe}
                </button>
              );
            })}
          </div>

          <span className="rpg-profil__etiquette" id="rpg-profil-table" aria-hidden="true">
            Table<b> · {tableChoisie ? tableChoisie.nom : 'au gré du deck'}</b>
          </span>
          <div
            className="rpg-profil__plateaux"
            role="group"
            aria-labelledby="rpg-profil-table"
            data-profil-plateaux={RPG_PLATEAUX.length}
          >
            <button
              type="button"
              className={`rpg-profil__plateau rpg-profil__plateau--auto${plateauChoisi ? '' : ' is-choisi'}`}
              aria-pressed={!plateauChoisi}
              aria-label="Au gré du deck — le terrain que votre paquet impose"
              title="Au gré du deck — le terrain que votre paquet impose"
              data-profil-plateau-auto
              onClick={() => {
                const change = onChoisirPlateau?.(null);
                onPlaySfx?.(change ? 'select' : 'menu');
              }}
            >
              <span aria-hidden="true">✦</span>
              Au gré
              <br />
              du deck
            </button>
            {RPG_PLATEAUX.map((table) => {
              const choisi = plateauChoisi === table.id;
              return (
                <button
                  key={table.id}
                  type="button"
                  className={`rpg-profil__plateau${choisi ? ' is-choisi' : ''}`}
                  aria-pressed={choisi}
                  aria-label={`${table.nom} — ${table.lieu}`}
                  title={`${table.nom} — ${table.lieu}`}
                  data-profil-plateau={table.id}
                  style={{ backgroundImage: `url("${vignettePlateau(table, BASE_URL)}")` }}
                  onClick={() => {
                    const change = onChoisirPlateau?.(table.id);
                    onPlaySfx?.(change ? 'select' : 'menu');
                  }}
                >
                  {/* Le nom peint sur la tuile : une table se choisit aussi en
                      la lisant. Le nom accessible porte déjà nom et lieu. */}
                  <span className="rpg-profil__plateau-nom" aria-hidden="true">{table.nom}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form
          className="rpg-profil__pseudo"
          data-profil-identite
          onSubmit={(event) => { event.preventDefault(); enregistrer(); }}
        >
          <input
            ref={saisieRef}
            type="text"
            value={saisie}
            maxLength={COURBE.pseudoMax}
            placeholder="Gardien de Bab El"
            aria-label="Votre pseudo"
            data-profil-pseudo-saisie
            onChange={(event) => { setSaisie(event.target.value); setModifie(true); }}
          />
          <button
            type="submit"
            className="rpg-menu-button"
            data-profil-pseudo-enregistrer
            disabled={!modifie || !saisie.trim() || saisie.trim() === nom}
          >
            Enregistrer
          </button>
        </form>
        {modifie && !saisie.trim() && (
          <p className="rpg-profil__note" data-profil-pseudo-vide>Un champ vide n’efface pas votre nom.</p>
        )}
      </div>
    </main>
  );
}
