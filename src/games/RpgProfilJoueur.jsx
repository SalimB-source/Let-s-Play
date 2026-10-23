/**
 * La carte de profil du joueur — src/games/RpgProfilJoueur.jsx
 * ------------------------------------------------------------
 * L'onglet qui ouvre le menu (`dossier 20-profil-joueur-xp.md`). Il répond à
 * trois questions, dans cet ordre :
 *
 *   1. **qui je suis** — le pseudo, l'emblème, le rang de Bab El et le niveau,
 *      en une carte d'identité qui tient sur un écran de téléphone ;
 *   2. **où j'en suis** — la barre d'XP, ce qu'elle a avalé dans le palier en
 *      cours, ce que le suivant demande, et **la courbe qui se lit** : chaque
 *      niveau à venir affiche son prix, donc le durcissement se voit au lieu de
 *      se subir ;
 *   3. **ce que la ville retient** — les compteurs du profil, le barème de l'XP
 *      (aucun chiffre caché) et le journal des derniers paliers, avec le paquet
 *      que chacun a offert.
 *
 * Comme l'écran du Souk, celui-ci est **purement présentationnel** : la courbe,
 * les gains et la dette de paquets viennent de `rpgProfil.js`, la persistance de
 * `useSablierBourse.js`. Il rend toujours quelque chose — un profil vide dit
 * « niveau 1, 0 XP », il ne casse jamais l'écran.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import './rpg-profil.css';
import {
  BAREME_XP,
  COURBE,
  EMBLEMES,
  RANGS,
  XP,
  boostersDus,
  glypheEmbleme,
  motifLisible,
  paliersAVenir,
  progressionDeXp,
  pseudoLisible,
  rangDeNiveau,
  xpLisible,
} from './rpgProfil.js';
import { RPG_DUEL_CARDS } from './rpgCards.js';
import RpgCreditIcon from './RpgCreditIcon.jsx';

/** « 12 mars, 14 h 05 » — le journal des paliers se lit, il ne se déchiffre pas. */
export function palierQuand(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const jour = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const heure = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${jour}, ${heure} h ${minute}`;
}

/**
 * Les compteurs de la carte, dans l'ordre où on les lit. Le profil ne retient
 * que ce que personne d'autre ne compte : les paquets ouverts vivent dans le
 * portefeuille, les cartes dans la collection, les crédits dans la bourse.
 */
export function lignesStatistiques({ profil, collection = [], portefeuille = null, quetes = null } = {}) {
  const stats = profil?.stats ?? {};
  const possedees = Array.isArray(collection) ? collection.length : 0;
  return [
    { cle: 'niveau', label: 'Niveau atteint', valeur: progressionDeXp(profil?.xp).niveau },
    { cle: 'xp', label: 'XP accumulée', valeur: xpLisible(profil?.xp ?? 0) },
    { cle: 'duels', label: 'Duels gagnés', valeur: stats.duelsGagnes ?? 0 },
    { cle: 'etages', label: 'Étages déblayés une première fois', valeur: stats.etagesPremiers ?? 0 },
    { cle: 'rejoues', label: 'Étages rejoués', valeur: stats.etagesRejoues ?? 0 },
    { cle: 'tours', label: 'Tours terminées', valeur: stats.toursTerminees ?? 0 },
    { cle: 'cartes', label: 'Cartes posées sur la table', valeur: xpLisible(stats.cartesJouees ?? 0) },
    { cle: 'quetes', label: 'Quêtes du jour réclamées', valeur: stats.quetesReclamees ?? 0 },
    { cle: 'cachets', label: 'Cachets encaissés', valeur: stats.cachets ?? 0 },
    { cle: 'lecons', label: 'Leçons terminées', valeur: stats.lecons ?? 0 },
    { cle: 'boosters', label: 'Paquets ouverts au Souk', valeur: portefeuille?.ouvertures ?? 0 },
    { cle: 'offerts', label: 'Paquets offerts par un palier', valeur: profil?.boostersOfferts ?? 0 },
    {
      cle: 'collection',
      label: 'Cartes dans la collection',
      valeur: `${possedees} / ${RPG_DUEL_CARDS.length}`,
    },
    { cle: 'credits', label: 'Crédits en bourse', valeur: `${xpLisible(portefeuille?.credits ?? 0)} ◈` },
    { cle: 'serie', label: 'Jours d’affilée au Souk', valeur: quetes?.serie ?? 0 },
    { cle: 'rangs', label: 'Rangs de Bab El', valeur: `${RANGS.filter((rang) => rang.niveau <= progressionDeXp(profil?.xp).niveau).length} / ${RANGS.length}` },
  ];
}

/** Le médaillon du niveau : l'emblème du joueur, cerclé d'or, comme une pièce. */
function Medaillon({ niveau, glyphe, maximal }) {
  return (
    <span className={`rpg-profil__medaillon${maximal ? ' is-maximal' : ''}`} data-profil-niveau={niveau}>
      <span className="rpg-profil__medaillon-glyphe" aria-hidden="true">{glyphe}</span>
      <span className="rpg-profil__medaillon-chiffre">
        <em>niveau</em>
        <strong>{niveau}</strong>
      </span>
    </span>
  );
}

/**
 * La barre elle-même. Un `role="progressbar"` complet (valeur, min, max,
 * libellé) : la progression ne passe pas par la couleur seule, le chiffre est
 * écrit à côté — c'est la règle d'accessibilité du dossier 04, §6.
 */
function BarreXp({ barre, rang }) {
  const { niveau, into, need, percent, reste, suivant, maximal } = barre;
  return (
    <div className="rpg-profil__xp">
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
        <i className="rpg-profil__xp-remplissage" style={{ width: `${percent}%` }} data-profil-xp-percent={percent} />
        <span className="rpg-profil__xp-grains" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <b key={index} style={{ '--grain': index }} />)}
        </span>
      </div>
      <p className="rpg-profil__xp-lecture" data-profil-xp-reste={reste}>
        {maximal ? (
          <>
            <strong>Niveau maximal atteint.</strong> L’XP continue de compter — {xpLisible(barre.xp)} au
            compteur — mais plus aucun palier ne sonne, et le comptoir n’a plus de paquet à offrir.
          </>
        ) : (
          <>
            <strong>{xpLisible(into)} / {xpLisible(need)} XP</strong> dans le niveau {niveau} — encore{' '}
            {xpLisible(reste)} XP avant le niveau {suivant}, qui offrira un paquet du Souk.
          </>
        )}
      </p>
      <p className="rpg-profil__rang" data-profil-rang={rang.rang.id}>
        <strong>{rang.rang.nom}</strong>
        <span>{rang.rang.phrase}</span>
        {rang.prochain
          ? <em>Prochain rang : {rang.prochain.nom}, au niveau {rang.prochain.niveau}.</em>
          : <em>Dernier rang de Bab El.</em>}
      </p>
    </div>
  );
}

export default function RpgProfilJoueur({
  profil = null,
  collection = [],
  portefeuille = null,
  quetes = null,
  statutSync = 'local',
  nomCompte = null,
  onRenommer = null,
  onChoisirEmbleme = null,
  onPlaySfx = null,
  onExit = null,
  onOuvrirSouk = null,
}) {
  const barre = useMemo(() => progressionDeXp(profil?.xp ?? 0), [profil?.xp]);
  const rang = useMemo(() => rangDeNiveau(barre.niveau), [barre.niveau]);
  const glyphe = glypheEmbleme(profil);
  const dus = boostersDus(profil);
  const paliers = useMemo(() => paliersAVenir(profil, { nombre: 4 }), [profil]);
  const journal = Array.isArray(profil?.paliers) ? profil.paliers : [];
  const stats = useMemo(
    () => lignesStatistiques({ profil, collection, portefeuille, quetes }),
    [profil, collection, portefeuille, quetes],
  );

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

  const sync = statutSync === 'synchronise'
    ? '☁ Profil synchronisé avec votre compte'
    : statutSync === 'attente'
      ? '☁ Synchronisation du compte…'
      : statutSync === 'horsligne'
        ? '☁ Compte non rejoint : le profil reste sur cet appareil'
        : 'Profil gardé sur cet appareil';

  return (
    <main className="rpg-profil" aria-label="Profil du joueur" data-profil>
      <header className="rpg-profil__header">
        <div className="rpg-profil__titre">
          <span className="rpg-mode-menu__eyebrow">LE SABLIER · VOTRE PROFIL DE GARDIEN</span>
          <h2 data-profil-pseudo={nom}>{nom}</h2>
          <p>{rang.rang.nom} — {rang.rang.phrase}</p>
          <p className="rpg-profil__sync" role="status" data-profil-sync={statutSync}>{sync}</p>
        </div>
        <Medaillon niveau={barre.niveau} glyphe={glyphe} maximal={barre.maximal} />
        <button
          type="button"
          className="rpg-menu-button rpg-profil__retour"
          data-profil-retour
          onClick={() => { onPlaySfx?.('menu'); onExit?.(); }}
        >
          <span aria-hidden="true">←</span> Menu
        </button>
      </header>

      {dus > 0 && (
        <p className="rpg-profil__attente" role="status" data-profil-attente={dus}>
          <span aria-hidden="true">✦</span>{' '}
          {dus === 1
            ? 'Un paquet de palier vous attend : il s’ouvrira dès que le comptoir pourra tirer.'
            : `${dus} paquets de palier vous attendent : un par niveau franchi.`}
          {onOuvrirSouk && (
            <button type="button" className="rpg-profil__attente-aller" onClick={() => { onPlaySfx?.('menu'); onOuvrirSouk(); }}>
              Voir le Souk
            </button>
          )}
        </p>
      )}

      <section className="rpg-profil__section" aria-labelledby="profil-xp-titre">
        <div className="rpg-profil__section-tete">
          <h3 id="profil-xp-titre">La barre d’expérience</h3>
          <p>
            Les premiers niveaux tombent en un ou deux duels ; ensuite chaque palier coûte plus cher que
            le précédent. <strong>Chaque niveau gagné ouvre un booster au hasard</strong> — offert, sans
            crédit dépensé.
          </p>
        </div>
        <BarreXp barre={barre} rang={rang} />
        {paliers.length > 0 && (
          <ul className="rpg-profil__courbe" data-profil-courbe={paliers.length}>
            {paliers.map((palier) => (
              <li key={palier.niveau} data-profil-courbe-niveau={palier.niveau}>
                <span className="rpg-profil__courbe-niveau">Niv. {palier.niveau} → {palier.niveau + 1}</span>
                <span className="rpg-profil__courbe-prix">{xpLisible(palier.seuil)} XP</span>
                <span className="rpg-profil__courbe-total">palier à {xpLisible(palier.total)} XP</span>
              </li>
            ))}
          </ul>
        )}
        <p className="rpg-profil__note">
          La courbe suit <code>{COURBE.base} × niveau^{COURBE.exposant.toString().replace('.', ',')}</code>, du
          niveau {COURBE.niveauDepart} au niveau {COURBE.niveauMax}. Elle est écrite dans{' '}
          <code>rpgProfil.js</code>, affichée ici et vérifiée par <code>tests/rpg-profil.test.js</code>.
        </p>
      </section>

      <section className="rpg-profil__section" aria-labelledby="profil-identite-titre">
        <div className="rpg-profil__section-tete">
          <h3 id="profil-identite-titre">Votre nom et votre emblème</h3>
          <p>Le nom s’écrit sur la carte de profil et sur l’onglet du menu. L’emblème est un glyphe : aucun asset à charger.</p>
        </div>
        <form
          className="rpg-profil__identite"
          onSubmit={(event) => { event.preventDefault(); enregistrer(); }}
          data-profil-identite
        >
          <label className="rpg-profil__pseudo">
            <span>Votre pseudo</span>
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
          </label>
          <button
            type="submit"
            className="rpg-menu-button rpg-menu-button--primary"
            data-profil-pseudo-enregistrer
            disabled={!modifie || !saisie.trim() || saisie.trim() === nom}
          >
            Enregistrer
          </button>
          {!modifie && <p className="rpg-profil__pseudo-note">{nomCompte ? `Repris de votre compte : ${nomCompte}.` : 'Gardé sur cet appareil.'}</p>}
          {modifie && !saisie.trim() && (
            <p className="rpg-profil__pseudo-note" data-profil-pseudo-vide>
              Un champ vide n’efface pas votre nom : il reste <strong>{nom}</strong>.
            </p>
          )}
        </form>
        <ul className="rpg-profil__emblemes" data-profil-emblemes={EMBLEMES.length} aria-label="Choisir un emblème">
          {EMBLEMES.map((embleme) => (
            <li key={embleme.id}>
              <button
                type="button"
                className={`rpg-profil__embleme${profil?.embleme === embleme.id || (!profil?.embleme && embleme.id === EMBLEMES[0].id) ? ' is-choisi' : ''}`}
                aria-pressed={glyphe === embleme.glyphe}
                data-profil-embleme={embleme.id}
                title={embleme.nom}
                onClick={() => {
                  const change = onChoisirEmbleme?.(embleme.id);
                  onPlaySfx?.(change ? 'select' : 'menu');
                }}
              >
                <span aria-hidden="true">{embleme.glyphe}</span>
                <em>{embleme.nom}</em>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rpg-profil__section" aria-labelledby="profil-stats-titre">
        <div className="rpg-profil__section-tete">
          <h3 id="profil-stats-titre">Ce que la ville retient de vous</h3>
          <p>Les compteurs du profil, et ce que le Souk et la collection gardent de leur côté.</p>
        </div>
        <ul className="rpg-profil__stats" data-profil-stats={stats.length}>
          {stats.map((ligne) => (
            <li key={ligne.cle} data-profil-stat={ligne.cle}>
              <strong>{ligne.valeur}</strong>
              <span>{ligne.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rpg-profil__section" aria-labelledby="profil-bareme-titre">
        <div className="rpg-profil__section-tete">
          <h3 id="profil-bareme-titre">Ce qui fait monter la barre</h3>
          <p>Aucun barème caché : chaque geste vaut ce qui est écrit ici, et rien d’autre.</p>
        </div>
        <ul className="rpg-profil__bareme" data-profil-bareme={BAREME_XP.length}>
          {BAREME_XP.map((ligne) => (
            <li key={ligne.cle} data-profil-bareme-ligne={ligne.cle}>
              <span className="rpg-profil__bareme-geste">{ligne.label}</span>
              <span className="rpg-profil__bareme-xp">+{ligne.xp} XP</span>
            </li>
          ))}
        </ul>
        <p className="rpg-profil__note">
          Les crédits ◈ suivent leur propre barème, au <RpgCreditIcon /> près : le Souk paie les paquets,
          l'XP mesure le temps passé à Bab El. Une défaite ne retire jamais rien — ni XP, ni crédits.
        </p>
      </section>

      <section className="rpg-profil__section" aria-labelledby="profil-journal-titre">
        <div className="rpg-profil__section-tete">
          <h3 id="profil-journal-titre">Le journal des paliers</h3>
          <p data-profil-journal={journal.length}>
            {journal.length
              ? `Les ${journal.length} derniers niveaux franchis, le plus haut d’abord — chacun offre un paquet du Souk.`
              : 'Aucun palier franchi pour l’instant : la première carte posée commence la barre.'}
          </p>
        </div>
        {journal.length > 0 && (
          <ol className="rpg-profil__journal" data-profil-journal-lignes={journal.length}>
            {journal.map((palier) => (
              <li key={palier.niveau} data-profil-journal-niveau={palier.niveau}>
                <span className="rpg-profil__journal-niveau">Niveau {palier.niveau}</span>
                <span className="rpg-profil__journal-date">{palierQuand(palier.le)}</span>
                <span className="rpg-profil__journal-motif">{motifLisible(palier.motif)}</span>
                <span className="rpg-profil__journal-paquet">1 paquet offert</span>
              </li>
            ))}
          </ol>
        )}
        <p className="rpg-profil__note">
          Un paquet offert est un vrai paquet : il avance la pitié des mythiques et rembourse ses doublons
          ({XP.boosterOuvert} XP par paquet ouvert, offert ou acheté).
        </p>
      </section>
    </main>
  );
}
