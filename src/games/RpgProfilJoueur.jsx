/**
 * La carte de profil du joueur — src/games/RpgProfilJoueur.jsx
 * ------------------------------------------------------------
 * Une carte, et rien d'autre (`dossier 20-profil-joueur-xp.md`) : l'emblème,
 * le nom, le niveau, la barre d'XP — et de quoi choisir son emblème et son nom.
 *
 * Tout le reste a été retiré : le rang et sa phrase, l'état de synchronisation,
 * les seize compteurs, le barème des dix gestes, le journal des vingt derniers
 * paliers, la liste des paliers à venir et la formule de la courbe. Ces chiffres
 * existent toujours — dans `rpgProfil.js`, dans le Souk, dans la collection —
 * mais la carte de profil n'est pas un tableau de bord. Ce qu'elle répond tient
 * en une ligne : **qui je suis, et où j'en suis de mon prochain paquet.**
 *
 * Comme l'écran du Souk, celui-ci est **purement présentationnel** : la barre
 * vient de `rpgProfil.js`, la persistance de `useSablierBourse.js`. Il rend
 * toujours quelque chose — un profil vide dit « Niveau 1 », il ne casse jamais
 * l'écran.
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

export default function RpgProfilJoueur({
  profil = null,
  nomCompte = null,
  onRenommer = null,
  onChoisirEmbleme = null,
  onPlaySfx = null,
  onExit = null,
  onOuvrirSouk = null,
}) {
  const barre = useMemo(() => progressionDeXp(profil?.xp ?? 0), [profil?.xp]);
  const { niveau, into, need, percent, reste, maximal } = barre;
  const glyphe = glypheEmbleme(profil);
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
        <span className="rpg-profil__medaillon" aria-hidden="true">{glyphe}</span>
        <h2 className="rpg-profil__nom" data-profil-pseudo={nom}>{nom}</h2>
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

        <div className="rpg-profil__emblemes" data-profil-emblemes={EMBLEMES.length} role="group" aria-label="Choisir un emblème">
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
