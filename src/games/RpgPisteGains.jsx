/**
 * La piste des gains — src/games/RpgPisteGains.jsx
 * -------------------------------------------------
 * Un chemin de paliers qui défile, comme un laissez-passer de bataille : du
 * niveau en cours jusqu'au **prochain rang** de Bab El, puis quatre niveaux
 * au-delà (`pisteDesGains` dans `rpgProfilGains.js`). Elle vit sur l'écran
 * **Jouer** — là où l'on décide de sa soirée — et non sur la carte de profil :
 * la carte dit *qui l'on est*, la piste dit *ce que l'on gagne à monter*.
 *
 * ## Ce que chaque palier montre
 *
 * - un **paquet** du Souk : un sachet miniature peint en CSS, avec le dos d'une
 *   carte qui dépasse (`public/profil/dos-de-carte.webp`, 1,3 Ko). Cinq cartes
 *   face cachée — on montre le dos, jamais un tirage qui n'a pas eu lieu ;
 * - un **rang** de Bab El : une tuile ronde, et un jalon « rang » sur le
 *   prochain ;
 * - un **cadre** de médaillon ou un **titre** : leur glyphe, et un clic pour les
 *   porter.
 *
 * Quand des paquets sont dus (`boostersDus`), la piste le dit en tête avec un
 * bouton vers le Souk — l'écran Jouer est à un onglet du comptoir, autant y
 * aller.
 *
 * ## Ce qui se clique
 *
 * Seuls les **cosmétiques** : un cadre ou un titre gagné se porte, et se repose
 * en recliquant. Les paquets ne se réclament pas ici, et les rangs tombent
 * d'eux-mêmes avec le niveau. Un cosmétique pas encore gagné reste un bouton,
 * mais `aria-disabled` : il dit ce qu'il manque au lieu de disparaître, et le
 * clic sonne l'erreur plutôt que de mentir.
 *
 * ## Rien n'est chargé, rien n'est écrit
 *
 * Un seul asset (le dos de carte, 1,3 Ko) ; le reste est du texte et des
 * dégradés. Le composant n'a ni `useState`, ni stockage, ni règle d'écriture :
 * les règles viennent de `rpgProfilGains.js`, la persistance de
 * `useSablierBourse.js`.
 */

import { useEffect, useMemo, useRef } from 'react';
import './rpg-piste-gains.css';
import { xpLisible } from './rpgProfil.js';
import { cadreDeProfil, pisteDesGains, titreDeProfil, vignetteDosDeCarte } from './rpgProfilGains.js';

/** Le préfixe de `public/` : `/Let-s-Play/` en ligne, `/` sur le bureau. */
const BASE_URL = import.meta.env?.BASE_URL ?? '/';

/** Le mot d'une sorte de gain, pour le nom accessible — jamais un identifiant. */
const MOTS_SORTE = Object.freeze({
  paquet: 'un paquet du Souk — cinq cartes face cachée',
  rang: 'le rang',
  cadre: 'un cadre de médaillon',
  titre: 'un titre sous le pseudo',
});

/** Ce que dit un palier : le niveau, le gain, son prix, et ce qu'on en fait. */
function direPalier(palier, { porte, gagne, dus }) {
  const gain = palier.principal;
  const cout = palier.seuil > 0
    ? `${xpLisible(palier.seuil)} XP pour passer au niveau ${palier.niveau + 1}`
    : 'le plafond de la courbe';
  const etat = gagne
    ? dus > 0 && palier.etat === 'courant'
      ? `Gagné — ${dus} paquet${dus > 1 ? 's' : ''} à ouvrir au Souk.`
      : 'Gagné.'
    : palier.etat === 'courant'
      ? `En cours — ${cout}.`
      : `Gagné au niveau ${palier.niveau} — ${cout}.`;
  const action = gagne && porte
    ? ' Porté : recliquer pour ne plus le porter.'
    : gagne ? ' Porter.' : '';
  return `Niveau ${palier.niveau} — ${MOTS_SORTE[gain.sorte]} ${gain.nom}. ${etat}${action}`;
}

export default function RpgPisteGains({
  profil = null,
  paquetsEnAttente = 0,
  onChoisirCadre = null,
  onChoisirTitre = null,
  onOuvrirSouk = null,
  onPlaySfx = null,
}) {
  const piste = useMemo(() => pisteDesGains(profil), [profil]);
  const cadrePorte = cadreDeProfil(profil);
  const titrePorte = titreDeProfil(profil);
  const dus = Math.max(0, Math.floor(Number(paquetsEnAttente) || 0));
  const dos = vignetteDosDeCarte(BASE_URL);
  const bandeRef = useRef(null);
  const courantRef = useRef(null);

  // La piste s'ouvre sur le niveau en cours : on arrive déjà au bon endroit, sans
  // avoir à faire défiler. `scrollIntoView` n'existe pas dans jsdom, d'où le
  // calcul à la main — qui y vaut 0, et ne bouge donc rien en test.
  useEffect(() => {
    const bande = bandeRef.current;
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
    <section
      className="rpg-piste"
      aria-label="Les gains des prochains niveaux"
      data-piste
      data-piste-niveaux={`${piste.debut}-${piste.fin}`}
      data-piste-rang={jalon?.id ?? 'maximal'}
    >
      <div className="rpg-piste__entete">
        <span className="rpg-piste__eyebrow" aria-hidden="true">LE CHEMIN · BAB EL</span>
        <p className="rpg-piste__accroche" data-piste-accroche>
          {piste.maximal
            ? 'Niveau maximal atteint — le chemin se souvient de vous.'
            : `Prochain rang : ${jalon.nom}, au niveau ${jalon.niveau}.`}
        </p>
        {dus > 0 ? (
          <button
            type="button"
            className="rpg-piste__du"
            data-piste-du={dus}
            onClick={() => { onPlaySfx?.('menu'); onOuvrirSouk?.(); }}
          >
            <span className="rpg-piste__sachet rpg-piste__sachet--puce" aria-hidden="true" />
            {dus === 1 ? '1 paquet à ouvrir' : `${dus} paquets à ouvrir`}
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>

      <ol
        ref={bandeRef}
        className="rpg-piste__bande"
        tabIndex={0}
        aria-label={`Les gains à venir, du niveau ${piste.debut} au niveau ${piste.fin}. Faites défiler pour voir la suite du chemin.`}
        data-piste-paliers={piste.paliers.length}
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
            'rpg-piste__palier',
            `rpg-piste__palier--${gain.sorte}`,
            gagne ? 'is-gagne' : 'is-verrouille',
            palier.etat === 'courant' ? 'is-courant' : '',
            palier.estJalon ? 'is-jalon' : '',
            porte ? 'is-porte' : '',
            dus > 0 && palier.etat === 'courant' ? 'is-du' : '',
          ].filter(Boolean).join(' ');

          /** La face de la tuile : un sachet et son dos de carte, ou un glyphe. */
          const face = gain.sorte === 'paquet' ? (
            <>
              <span className="rpg-piste__carte" style={{ backgroundImage: `url("${dos}")` }} aria-hidden="true" />
              {/* Le sachet est un **volume** : trois faces montées que la feuille
                  de style met en perspective et fait tourner doucement — un
                  paquet à gagner se reconnaît de loin. */}
              <span className="rpg-piste__sachet" aria-hidden="true">
                <i className="rpg-piste__sachet-face" />
                <i className="rpg-piste__sachet-cote" />
                <i className="rpg-piste__sachet-top" />
              </span>
            </>
          ) : gain.glyphe;

          return (
            <li
              key={palier.niveau}
              ref={palier.etat === 'courant' ? courantRef : undefined}
              className={classes}
              data-palier={palier.niveau}
              data-palier-etat={palier.etat}
              data-palier-gain={gain.sorte}
              data-palier-jalon={palier.estJalon ? palier.niveau : undefined}
              aria-current={palier.etat === 'courant' ? 'step' : undefined}
              style={{ '--gauche': `${palier.filet.gauche}%`, '--droite': `${palier.filet.droite}%` }}
            >
              {/* Le repère « niveau actuel » : une ligne réservée dans chaque
                  colonne, et seule celle en cours l'écrit — les hauteurs
                  restent alignées, comme sur une passe de maîtrise. */}
              <span className="rpg-piste__ici" aria-hidden="true">
                {palier.etat === 'courant' ? 'niveau actuel' : ''}
              </span>
              <span className="rpg-piste__niveau" aria-hidden="true">{palier.niveau}</span>
              {/* La coche des niveaux déjà passés : peinte par la feuille de
                  style sur `.is-gagne` — le numéro au-dessus, la récompense
                  dessous, et entre les deux le chemin. */}
              <span className="rpg-piste__coche" aria-hidden="true" />
              {/* Le filet : la moitié gauche dit d'où l'on vient, la moitié
                  droite où l'on va — celle du niveau en cours se remplit en
                  route. Une seule boîte, deux largeurs en propriétés
                  personnalisées, aucun noeud de plus. */}
              <span className="rpg-piste__filet" aria-hidden="true" />

              {dansTuile ? (
                <button
                  type="button"
                  className="rpg-piste__tuile"
                  aria-pressed={porte}
                  aria-disabled={!gagne || undefined}
                  aria-label={direPalier(palier, { porte, gagne, dus })}
                  title={direPalier(palier, { porte, gagne, dus })}
                  data-gain-cadre={dansTuile.sorte === 'cadre' ? dansTuile.id : undefined}
                  data-gain-titre={dansTuile.sorte === 'titre' ? dansTuile.id : undefined}
                  onClick={() => { if (gagne) porter(dansTuile); else onPlaySfx?.('erreur'); }}
                >
                  <span className="rpg-piste__tuile-face" aria-hidden="true">{face}</span>
                  {gagne ? null : <span className="rpg-piste__verrou" aria-hidden="true" />}
                </button>
              ) : (
                <span className="rpg-piste__tuile" aria-hidden="true" title={gain.nom}>
                  <span className="rpg-piste__tuile-face">{face}</span>
                  {gagne ? null : <span className="rpg-piste__verrou" aria-hidden="true" />}
                </span>
              )}

              <span className="rpg-piste__gain" aria-hidden="true">
                <b className="rpg-piste__famille">{gain.sorte}</b>
                <span className="rpg-piste__gain-nom">{gain.nom}</span>
              </span>

              {/* Le cosmétique que le rang pousse hors de la tuile : sa pastille. */}
              {cosmetique && !dansTuile ? (
                <button
                  type="button"
                  className="rpg-piste__puce"
                  aria-pressed={cosmetique.sorte === 'cadre' ? cadrePorte.id === cosmetique.id : titrePorte?.id === cosmetique.id}
                  aria-disabled={!gagne || undefined}
                  aria-label={direPalier({ ...palier, principal: cosmetique }, { porte: false, gagne, dus })}
                  title={cosmetique.nom}
                  data-gain-cadre={cosmetique.sorte === 'cadre' ? cosmetique.id : undefined}
                  data-gain-titre={cosmetique.sorte === 'titre' ? cosmetique.id : undefined}
                  onClick={() => { if (gagne) porter(cosmetique); else onPlaySfx?.('erreur'); }}
                >
                  <span aria-hidden="true">{cosmetique.glyphe}</span>
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
