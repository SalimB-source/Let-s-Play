/**
 * La piste des gains — src/games/RpgProfilPiste.jsx
 * --------------------------------------------------
 * Un chemin de paliers qui défile, comme un laissez-passer de bataille : du
 * niveau en cours jusqu'au **prochain rang** de Bab El, puis quatre niveaux
 * au-delà (`pisteDesGains` dans `rpgProfilGains.js`). Chaque palier dit ce qu'il
 * rapporte — un paquet du Souk, un rang, un cadre de médaillon, un titre — et
 * le filet qui les relie se remplit au pourcentage de la barre.
 *
 * ## Ce qui se clique
 *
 * Seuls les **cosmétiques** se cliquent : un cadre ou un titre gagné se porte,
 * et se repose en recliquant. Les paquets ne se réclament pas ici — la dette se
 * règle au Souk, et la carte a déjà sa ligne « Un paquet vous attend » — et les
 * rangs tombent d'eux-mêmes avec le niveau. Un cosmétique pas encore gagné reste
 * un bouton, mais `aria-disabled` : il dit ce qu'il manque au lieu de
 * disparaître, et le clic sonne l'erreur plutôt que de mentir.
 *
 * ## Rien n'est chargé
 *
 * Aucun asset : les glyphes sont du texte, les cadres sont peints en CSS
 * (`rpg-profil-piste.css`), le filet est un dégradé dont la largeur vient d'une
 * propriété personnalisée. La piste coûte moins de deux Ko de styles et zéro
 * requête — et elle ne touche pas la queue de `rpg-profil.css`, où vivent les
 * `z-index` de la cérémonie et de l'annonce.
 *
 * Purement présentationnel, comme le reste de l'écran : les règles viennent de
 * `rpgProfilGains.js`, la persistance de `useSablierBourse.js`.
 */

import { useEffect, useMemo, useRef } from 'react';
import './rpg-profil-piste.css';
import { xpLisible } from './rpgProfil.js';
import { cadreDeProfil, pisteDesGains, titreDeProfil } from './rpgProfilGains.js';

/** Le mot d'une sorte de gain, pour le nom accessible — jamais un identifiant. */
const MOTS_SORTE = Object.freeze({
  paquet: 'un paquet du Souk offert',
  rang: 'le rang',
  cadre: 'un cadre de médaillon',
  titre: 'un titre sous le pseudo',
});

/** Ce que dit un palier : le niveau, le gain, et ce qu'il en coûte d'y arriver. */
function direPalier(palier, { porte, gagne }) {
  const gain = palier.principal;
  const cout = palier.seuil > 0 ? `${xpLisible(palier.seuil)} XP pour passer au niveau ${palier.niveau + 1}` : 'le plafond de la courbe';
  const etat = gagne
    ? 'Gagné.'
    : palier.etat === 'courant'
      ? `En cours — ${cout}.`
      : `Gagné au niveau ${palier.niveau} — ${cout}.`;
  const action = gagne && porte ? ' Porté : recliquer pour ne plus le porter.' : gagne ? ' Porter.' : '';
  return `Niveau ${palier.niveau} — ${MOTS_SORTE[gain.sorte]} ${gain.nom}. ${etat}${action}`;
}

export default function RpgProfilPiste({
  profil = null,
  onChoisirCadre = null,
  onChoisirTitre = null,
  onPlaySfx = null,
}) {
  const piste = useMemo(() => pisteDesGains(profil), [profil]);
  const cadrePorte = cadreDeProfil(profil);
  const titrePorte = titreDeProfil(profil);
  const pisteRef = useRef(null);
  const courantRef = useRef(null);

  // La piste s'ouvre sur le niveau en cours : on arrive déjà au bon endroit, sans
  // avoir à faire défiler. `scrollIntoView` n'existe pas dans jsdom, d'où le
  // calcul à la main — qui y vaut 0, et ne bouge donc rien en test.
  useEffect(() => {
    const bande = pisteRef.current;
    const courant = courantRef.current;
    if (!bande || !courant) return;
    bande.scrollLeft = Math.max(0, courant.offsetLeft - (bande.clientWidth - courant.clientWidth) / 2);
  }, [piste.niveau]);

  /** Porte un cosmétique gagné — ou le repose s'il est déjà porté. */
  const porter = (gain) => {
    if (gain.sorte === 'cadre') {
      const change = onChoisirCadre?.(gain.id === cadrePorte.id ? null : gain.id);
      onPlaySfx?.(change ? 'select' : 'menu');
      return;
    }
    if (gain.sorte === 'titre') {
      const change = onChoisirTitre?.(gain.id === titrePorte?.id ? null : gain.id);
      onPlaySfx?.(change ? 'select' : 'menu');
    }
  };

  const jalon = piste.prochainRang;
  return (
    <div className="rpg-profil__chemin" data-profil-piste data-profil-piste-niveaux={`${piste.debut}-${piste.fin}`}>
      <span className="rpg-profil__etiquette" id="rpg-profil-chemin" aria-hidden="true" data-profil-chemin-rang={jalon?.id ?? 'maximal'}>
        Chemin<b> · {piste.maximal ? 'niveau maximal atteint' : `rang ${jalon.nom} au niveau ${jalon.niveau}`}</b>
      </span>

      <ol
        ref={pisteRef}
        className="rpg-profil__piste"
        tabIndex={0}
        role="list"
        aria-label={`Les gains à venir, du niveau ${piste.debut} au niveau ${piste.fin}. Faites défiler pour voir la suite du chemin.`}
        data-profil-piste-paliers={piste.paliers.length}
      >
        {piste.paliers.map((palier) => {
          const gain = palier.principal;
          const gagne = palier.etat !== 'verrouille';
          // Un palier porte au plus un cosmétique ; quand le rang l'occupe déjà
          // (niveaux 1 et 60), le cosmétique passe en pastille sous la tuile.
          const cosmetique = palier.cosmetiques[0] ?? null;
          const dansTuile = cosmetique && gain.sorte === cosmetique.sorte ? cosmetique : null;
          const porte = dansTuile
            ? (dansTuile.sorte === 'cadre' ? cadrePorte.id === dansTuile.id : titrePorte?.id === dansTuile.id)
            : false;
          const classes = [
            'rpg-profil__palier',
            `rpg-profil__palier--${gain.sorte}`,
            gagne ? 'is-gagne' : 'is-verrouille',
            palier.etat === 'courant' ? 'is-courant' : '',
            palier.estJalon ? 'is-jalon' : '',
            porte ? 'is-porte' : '',
          ].filter(Boolean).join(' ');

          return (
            <li
              key={palier.niveau}
              className={classes}
              data-profil-palier={palier.niveau}
              data-profil-palier-etat={palier.etat}
              data-profil-palier-gain={gain.sorte}
              data-profil-palier-jalon={palier.estJalon ? palier.niveau : undefined}
              aria-current={palier.etat === 'courant' ? 'step' : undefined}
              style={{ '--gauche': `${palier.filet.gauche}%`, '--droite': `${palier.filet.droite}%` }}
            >
              {/* Le filet : la moitié gauche dit d'où l'on vient, la moitié
                  droite où l'on va — celle du niveau en cours se remplit en
                  route. Une seule boîte, deux largeurs en propriétés
                  personnalisées, aucun noeud de plus. */}
              <span className="rpg-profil__palier-filet" aria-hidden="true" />

              {dansTuile ? (
                <button
                  type="button"
                  className="rpg-profil__palier-tuile"
                  aria-pressed={porte}
                  aria-disabled={!gagne || undefined}
                  aria-label={direPalier(palier, { porte, gagne })}
                  title={direPalier(palier, { porte, gagne })}
                  data-profil-gain-cadre={dansTuile.sorte === 'cadre' ? dansTuile.id : undefined}
                  data-profil-gain-titre={dansTuile.sorte === 'titre' ? dansTuile.id : undefined}
                  onClick={() => { if (gagne) porter(dansTuile); else onPlaySfx?.('erreur'); }}
                >
                  <span aria-hidden="true">{gain.glyphe}</span>
                </button>
              ) : (
                <span className="rpg-profil__palier-tuile" aria-hidden="true" title={gain.nom}>
                  {gain.glyphe}
                </span>
              )}

              <span className="rpg-profil__palier-niveau" aria-hidden="true">{palier.niveau}</span>
              <span className="rpg-profil__palier-gain" aria-hidden="true">{gain.nom}</span>

              {/* Le cosmétique que le rang pousse hors de la tuile : sa pastille. */}
              {cosmetique && !dansTuile ? (
                <button
                  type="button"
                  className="rpg-profil__palier-puce"
                  aria-pressed={cosmetique.sorte === 'cadre' ? cadrePorte.id === cosmetique.id : titrePorte?.id === cosmetique.id}
                  aria-disabled={!gagne || undefined}
                  aria-label={direPalier({ ...palier, principal: cosmetique }, { porte: false, gagne })}
                  title={cosmetique.nom}
                  data-profil-gain-cadre={cosmetique.sorte === 'cadre' ? cosmetique.id : undefined}
                  data-profil-gain-titre={cosmetique.sorte === 'titre' ? cosmetique.id : undefined}
                  onClick={() => { if (gagne) porter(cosmetique); else onPlaySfx?.('erreur'); }}
                >
                  <span aria-hidden="true">{cosmetique.glyphe}</span>
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
