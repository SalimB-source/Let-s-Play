/**
 * La piste des gains — src/games/RpgPisteGains.jsx
 * -------------------------------------------------
 * Inspirée de l'écran Mastery de MTG Arena : les 60 niveaux de la courbe sont
 * découpés en 6 pages lisibles de 10 niveaux côte à côte, sans surcharge de
 * texte dans les colonnes.
 *
 * Chaque colonne affiche deux cases superposées :
 *   1. En haut : le numéro du niveau + l'état d'avancement (coche ambrée sur
 *      les paliers franchis, halo lumineux sur le niveau actuel).
 *   2. En bas : le visuel pur de la récompense du niveau (vrai sachet 3D du
 *      Souk, miniature d'illustration alternative, médaillon de cadre, sceau de
 *      titre ou blason de rang), surmonté d'un petit cadenas tant que le niveau
 *      n'est pas atteint.
 *
 * Un bandeau synthétique juste sous la grille nomme clairement le contenu du
 * niveau sélectionné ou survolé et permet d'équiper directement un cadre ou un
 * titre débloqué.
 */

import { useEffect, useMemo, useState } from 'react';
import './rpg-souk.css';
import './rpg-piste-gains.css';
import { COURBE, progressionDuProfil, rangDeNiveau, xpLisible, xpTotalDuNiveau } from './rpgProfil.js';
import { cadreDeProfil, gainsDuNiveau, titreDeProfil, vignetteDosDeCarte } from './rpgProfilGains.js';
import { ALTERNATIVES_DE_L_ECHELLE, illustrationAlternativeUrl } from './rpgCardArtAlternatives.js';
import { cardById } from './rpgCards.js';
import RpgPaquetChemin from './RpgPaquetChemin.jsx';

const BASE_URL = import.meta.env?.BASE_URL ?? '/';
export const NIVEAUX_PAR_PAGE = 10;
export const PAGES_MAITRISE = Math.ceil(COURBE.niveauMax / NIVEAUX_PAR_PAGE);

const ALTERNATIVES_PAR_NIVEAU = new Map(
  ALTERNATIVES_DE_L_ECHELLE.map((entree) => [entree.niveau, entree]),
);

const LIBELLES_SORTE = Object.freeze({
  paquet: 'Paquet du Souk',
  rang: 'Rang',
  cadre: 'Cadre',
  titre: 'Titre',
  alternative: 'Illustration alternative',
});

function pageDuNiveau(niveau) {
  const n = Math.max(1, Math.min(COURBE.niveauMax, Math.floor(Number(niveau) || 1)));
  return Math.floor((n - 1) / NIVEAUX_PAR_PAGE);
}

function construirePaliers(barre) {
  const { niveau, maximal } = barre;
  const liste = [];
  for (let n = 1; n <= COURBE.niveauMax; n += 1) {
    const gains = gainsDuNiveau(n);
    const alternative = ALTERNATIVES_PAR_NIVEAU.get(n) ?? null;
    const carteAlt = alternative ? cardById(alternative.carteId) : null;
    const cosmetique = gains.find((g) => g.sorte === 'cadre' || g.sorte === 'titre') ?? null;
    const rangGain = gains.find((g) => g.sorte === 'rang') ?? null;
    const etat = maximal || n < niveau ? 'gagne' : n === niveau ? 'courant' : 'verrouille';

    // Priorité visuelle dans la case récompense : illustration alternative > cosmétique > rang > paquet
    const vedette = alternative
      ? {
        sorte: 'alternative',
        id: alternative.carteId,
        nom: carteAlt ? `${carteAlt.name} — ${alternative.nom}` : alternative.nom,
        court: carteAlt?.name ?? alternative.nom,
        alternative,
        carte: carteAlt,
      }
      : cosmetique
        ? { ...cosmetique, court: cosmetique.nom }
        : rangGain
          ? { ...rangGain, court: rangGain.nom }
          : { ...gains[gains.length - 1], court: 'Paquet du Souk' };

    liste.push({
      niveau: n,
      xpRequis: xpTotalDuNiveau(n),
      etat,
      gagne: etat !== 'verrouille',
      gains,
      alternative,
      carteAlt,
      cosmetique,
      rangGain,
      vedette,
    });
  }
  return liste;
}

export default function RpgPisteGains({
  profil = null,
  paquetsEnAttente = 0,
  onChoisirCadre = null,
  onChoisirTitre = null,
  onOuvrirSouk = null,
  onOuvrirCarte = null,
  onPlaySfx = null,
}) {
  const barre = useMemo(() => progressionDuProfil(profil ?? null), [profil]);
  const { prochain: prochainRang } = useMemo(() => rangDeNiveau(barre.niveau), [barre.niveau]);
  const paliers = useMemo(() => construirePaliers(barre), [barre]);
  const cadrePorte = cadreDeProfil(profil);
  const titrePorte = titreDeProfil(profil);
  const dus = Math.max(0, Math.floor(Number(paquetsEnAttente) || 0));
  const dos = vignetteDosDeCarte(BASE_URL);

  const pageCourante = pageDuNiveau(barre.niveau);
  const [page, setPage] = useState(pageCourante);
  const [niveauSelectionne, setNiveauSelectionne] = useState(barre.niveau);

  useEffect(() => {
    setPage(pageDuNiveau(barre.niveau));
    setNiveauSelectionne(barre.niveau);
  }, [barre.niveau]);

  const debutPage = page * NIVEAUX_PAR_PAGE + 1;
  const finPage = Math.min(COURBE.niveauMax, debutPage + NIVEAUX_PAR_PAGE - 1);
  const paliersPage = paliers.slice(debutPage - 1, finPage);
  const palierActif = paliers[(niveauSelectionne ?? barre.niveau) - 1] ?? paliers[barre.niveau - 1] ?? paliers[0];

  const changerPage = (nouvellePage) => {
    const cible = Math.max(0, Math.min(PAGES_MAITRISE - 1, nouvellePage));
    if (cible === page) return;
    onPlaySfx?.('menu');
    setPage(cible);
    const premier = cible * NIVEAUX_PAR_PAGE + 1;
    const dernier = Math.min(COURBE.niveauMax, premier + NIVEAUX_PAR_PAGE - 1);
    if (barre.niveau >= premier && barre.niveau <= dernier) {
      setNiveauSelectionne(barre.niveau);
    } else {
      setNiveauSelectionne(premier);
    }
  };

  const revenirAuNiveauActuel = () => {
    onPlaySfx?.('menu');
    setPage(pageCourante);
    setNiveauSelectionne(barre.niveau);
  };

  const estCosmetiquePorte = (cosmetique) => {
    if (!cosmetique) return false;
    return cosmetique.sorte === 'cadre'
      ? cadrePorte.id === cosmetique.id
      : titrePorte?.id === cosmetique.id;
  };

  const basculerCosmetique = (cosmetique) => {
    if (!cosmetique) return;
    if (cosmetique.sorte === 'cadre') {
      const change = onChoisirCadre?.(cosmetique.id === cadrePorte.id ? null : cosmetique.id);
      onPlaySfx?.(change ? 'select' : 'menu');
      return;
    }
    if (cosmetique.sorte === 'titre') {
      const change = onChoisirTitre?.(cosmetique.id === titrePorte?.id ? null : cosmetique.id);
      onPlaySfx?.(change ? 'select' : 'menu');
    }
  };

  const renderVisuelRecompense = (palier) => {
    const { vedette, gagne } = palier;
    if (vedette.sorte === 'alternative') {
      // Les illustrations d'échelle non gagnées ne chargent jamais leur peinture :
      // elles affichent le dos de carte scellé dans un halo lumineux.
      const imageUrl = gagne ? illustrationAlternativeUrl(vedette.alternative) : dos;
      return (
        <span className={`rpg-piste__carte-alt${gagne ? ' is-ouverte' : ' is-scellee'}`}>
          <span
            className="rpg-piste__carte-alt-img"
            style={{ backgroundImage: `url("${imageUrl}")` }}
          />
          <i className="rpg-piste__bonus-paquet" title="+ 1 paquet du Souk" />
        </span>
      );
    }
    if (vedette.sorte === 'cadre' || vedette.sorte === 'titre' || vedette.sorte === 'rang') {
      return (
        <span className={`rpg-piste__jeton rpg-piste__jeton--${vedette.sorte}`}>
          <span className="rpg-piste__jeton-glyphe">{vedette.glyphe}</span>
          <i className="rpg-piste__bonus-paquet" title="+ 1 paquet du Souk" />
        </span>
      );
    }
    return <RpgPaquetChemin dos={dos} />;
  };

  const cosmetiqueActif = palierActif?.cosmetique ?? null;
  const cosmetiqueActifPorte = estCosmetiquePorte(cosmetiqueActif);

  return (
    <section
      className="rpg-piste"
      aria-label="Paliers de maîtrise"
      data-piste
      data-piste-page={`${page + 1}/${PAGES_MAITRISE}`}
      data-piste-niveaux={`${debutPage}-${finPage}`}
      data-piste-rang={prochainRang?.id ?? 'maximal'}
    >
      <div className="rpg-piste__barre">
        <div className="rpg-piste__pagination" role="group" aria-label="Navigation des pages de niveaux">
          <button
            type="button"
            className="rpg-piste__fleche"
            onClick={() => changerPage(page - 1)}
            disabled={page <= 0}
            aria-label="Page précédente"
          >
            ◀
          </button>
          <span className="rpg-piste__page-label">
            Page {page + 1} / {PAGES_MAITRISE}
          </span>
          <button
            type="button"
            className="rpg-piste__fleche"
            onClick={() => changerPage(page + 1)}
            disabled={page >= PAGES_MAITRISE - 1}
            aria-label="Page suivante"
          >
            ▶
          </button>
        </div>

        <div className="rpg-piste__barre-droite">
          {page !== pageCourante && (
            <button
              type="button"
              className="rpg-piste__retour-courant"
              onClick={revenirAuNiveauActuel}
            >
              Niveau actuel ({barre.niveau})
            </button>
          )}
          {!barre.maximal && prochainRang ? (
            <span className="rpg-piste__prochain-rang" data-piste-accroche>
              Prochain rang : <b>{prochainRang.nom}</b> (niv. {prochainRang.niveau})
            </span>
          ) : (
            <span className="rpg-piste__prochain-rang" data-piste-accroche>
              Tous les paliers sont débloqués
            </span>
          )}
        </div>
      </div>

      <ol
        className="rpg-piste__grille"
        aria-label={`Niveaux ${debutPage} à ${finPage}`}
        data-piste-paliers={paliersPage.length}
      >
        {paliersPage.map((palier) => {
          const estCourant = palier.etat === 'courant';
          const estSelectionne = palierActif?.niveau === palier.niveau;
          const porte = estCosmetiquePorte(palier.cosmetique);
          const classes = [
            'rpg-piste__palier',
            `rpg-piste__palier--${palier.vedette.sorte}`,
            palier.gagne ? 'is-gagne' : 'is-verrouille',
            estCourant ? 'is-courant' : '',
            estSelectionne ? 'is-selectionne' : '',
            porte ? 'is-porte' : '',
            dus > 0 && estCourant ? 'is-du' : '',
          ].filter(Boolean).join(' ');

          const resumeAccessible = [
            `Niveau ${palier.niveau}`,
            `${LIBELLES_SORTE[palier.vedette.sorte]} : ${palier.vedette.court}`,
            palier.vedette.sorte !== 'paquet' ? '+ 1 paquet du Souk' : null,
            palier.gagne ? 'Débloqué' : 'Verrouillé',
          ].filter(Boolean).join(' · ');

          return (
            <li
              key={palier.niveau}
              className={classes}
              data-palier={palier.niveau}
              data-palier-etat={palier.etat}
              data-palier-gain={palier.vedette.sorte}
              aria-current={estCourant ? 'step' : undefined}
            >
              <span className="rpg-piste__ici" aria-hidden="true">
                {estCourant ? 'Niveau actuel' : ''}
              </span>

              <button
                type="button"
                className="rpg-piste__colonne"
                aria-label={resumeAccessible}
                aria-pressed={estSelectionne}
                onMouseEnter={() => setNiveauSelectionne(palier.niveau)}
                onFocus={() => setNiveauSelectionne(palier.niveau)}
                onClick={() => {
                  setNiveauSelectionne(palier.niveau);
                  if (palier.gagne && palier.cosmetique) {
                    basculerCosmetique(palier.cosmetique);
                  } else if (palier.gagne && palier.carteAlt && onOuvrirCarte) {
                    onPlaySfx?.('menu');
                    onOuvrirCarte(palier.carteAlt);
                  } else {
                    onPlaySfx?.('menu');
                  }
                }}
              >
                <span className="rpg-piste__case-haut" aria-hidden="true">
                  <span className="rpg-piste__niveau">{palier.niveau}</span>
                  <span className="rpg-piste__statut">
                    {palier.gagne ? (
                      <svg className="rpg-piste__coche-svg" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12.6L9.6 17.2L19.2 7.2"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="rpg-piste__point-attente" />
                    )}
                  </span>
                </span>

                <span className="rpg-piste__case-bas" aria-hidden="true">
                  {!palier.gagne && <span className="rpg-piste__verrou" />}
                  {porte && <span className="rpg-piste__badge-porte">✓</span>}
                  <span className="rpg-piste__tuile-face">
                    {renderVisuelRecompense(palier)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {palierActif && (
        <div className="rpg-piste__detail" aria-live="polite" data-piste-detail={palierActif.niveau}>
          <div className="rpg-piste__detail-infos">
            <span className="rpg-piste__detail-niveau">Niveau {palierActif.niveau}</span>
            <span className={`rpg-piste__detail-etat is-${palierActif.etat}`}>
              {palierActif.etat === 'courant'
                ? 'Niveau actuel'
                : palierActif.gagne
                  ? 'Débloqué ✓'
                  : `Encore ${xpLisible(Math.max(1, palierActif.xpRequis - barre.xp))} XP`}
            </span>
            <div className="rpg-piste__detail-gains">
              {palierActif.alternative && (
                <span className="rpg-piste__detail-chip rpg-piste__detail-chip--alternative">
                  Illustration : <b>{palierActif.carteAlt?.name ?? palierActif.alternative.nom}</b>
                </span>
              )}
              {palierActif.rangGain && (
                <span className="rpg-piste__detail-chip rpg-piste__detail-chip--rang">
                  Rang : <b>{palierActif.rangGain.nom}</b>
                </span>
              )}
              {palierActif.cosmetique && (
                <span className={`rpg-piste__detail-chip rpg-piste__detail-chip--${palierActif.cosmetique.sorte}`}>
                  {LIBELLES_SORTE[palierActif.cosmetique.sorte]} : <b>{palierActif.cosmetique.nom}</b>
                </span>
              )}
              <span className="rpg-piste__detail-chip rpg-piste__detail-chip--paquet">
                <b>1 paquet du Souk</b>
              </span>
            </div>
          </div>

          <div className="rpg-piste__detail-actions">
            {palierActif.gagne && cosmetiqueActif && (
              <button
                type="button"
                className={`rpg-piste__action${cosmetiqueActifPorte ? ' is-porte' : ''}`}
                data-gain-cadre={cosmetiqueActif.sorte === 'cadre' ? cosmetiqueActif.id : undefined}
                data-gain-titre={cosmetiqueActif.sorte === 'titre' ? cosmetiqueActif.id : undefined}
                onClick={() => basculerCosmetique(cosmetiqueActif)}
              >
                {cosmetiqueActifPorte ? 'Porté ✓' : `Porter ce ${cosmetiqueActif.sorte}`}
              </button>
            )}
            {palierActif.gagne && palierActif.carteAlt && onOuvrirCarte && (
              <button
                type="button"
                className="rpg-piste__action"
                onClick={() => { onPlaySfx?.('menu'); onOuvrirCarte(palierActif.carteAlt); }}
              >
                Voir la carte
              </button>
            )}
            {dus > 0 && onOuvrirSouk && (
              <button
                type="button"
                className="rpg-piste__action rpg-piste__action--souk"
                data-piste-du={dus}
                onClick={() => { onPlaySfx?.('menu'); onOuvrirSouk(); }}
              >
                Ouvrir au Souk ({dus}) →
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rpg-piste__points" role="tablist" aria-label="Pages de maîtrise">
        {Array.from({ length: PAGES_MAITRISE }, (_, idx) => {
          const active = idx === page;
          return (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Page ${idx + 1} (niveaux ${idx * NIVEAUX_PAR_PAGE + 1} à ${(idx + 1) * NIVEAUX_PAR_PAGE})`}
              className={`rpg-piste__point${active ? ' is-active' : ''}`}
              onClick={() => changerPage(idx)}
            />
          );
        })}
      </div>

      <p className="rpg-piste__note">
        Gagnez de l’XP en remportant des duels, en gravissant les Tours et en accomplissant vos quêtes quotidiennes.
      </p>
    </section>
  );
}
