/**
 * Le seuil de la création de deck — le premier écran que la crate
 * « Nouveau deck » ouvre. Deux portes, rien d'autre :
 *
 *   - **Création assistée** : une demande en toutes lettres (« un deck viking
 *     neige ténèbres, avec quelques sorts de contrôle »), lue par l'IA de
 *     l'atelier, puis deux questions (couleurs, style) que la lecture
 *     pré-remplit — le moteur compose le deck avec les cartes possédées ;
 *   - **Création manuelle** : l'atelier minimaliste, carte par carte, à la
 *     Hearthstone.
 *
 * Pur présentationnel : le parent (`RpgDeckCreation`) décide de la suite.
 */

export function RpgDeckModeChoice({ onAssiste, onManuel, onRetour, surSfx = () => {} }) {
  return (
    <section className="rpg-creation" aria-label="Créer un nouveau deck">
      <header className="rpg-creation__header">
        <div>
          <span className="rpg-mode-menu__eyebrow">ATELIER · NOUVEAU DECK</span>
          <h2>Comment voulez-vous construire votre deck ?</h2>
          <p className="rpg-creation__aide">
            Deux chemins mènent au même boîtier de 30 cartes, gardé sur votre étagère et retouchable par la suite.
          </p>
        </div>
        <button type="button" className="rpg-menu-link" onClick={() => { surSfx('annuler'); onRetour(); }}>
          ← Retour à l’étagère
        </button>
      </header>

      <div className="rpg-creation__choix">
        <button
          type="button"
          className="rpg-creation__carte rpg-creation__carte--assiste"
          aria-label="Création assistée : décrire le deck voulu, ou choisir ses couleurs et son style — le jeu compose le deck"
          onClick={() => { surSfx('apparition'); onAssiste(); }}
        >
          <i className="rpg-creation__icone" aria-hidden="true">✦</i>
          <strong>Création assistée</strong>
          <small>Le jeu compose pour vous</small>
          <span className="rpg-creation__etapes">
            <b>1</b> Votre idée
            <i aria-hidden="true">→</i>
            <b>2</b> Vos couleurs
            <i aria-hidden="true">→</i>
            <b>3</b> Votre style
            <i aria-hidden="true">→</i>
            <b>✦</b> Deck généré
          </span>
          <span className="rpg-creation__desc">
            Dites le deck que vous voulez — « un deck viking neige ténèbres, avec quelques sorts de contrôle » —
            et l’atelier cherche les cartes pour vous. Ou choisissez une à trois couleurs, puis un plan de jeu :
            aggro, contrôle ou mix. Dans les deux cas, 30 cartes prises dans votre collection.
          </span>
          <span className="rpg-creation__cta">Commencer →</span>
        </button>

        <button
          type="button"
          className="rpg-creation__carte rpg-creation__carte--manuel"
          aria-label="Création manuelle : composer soi-même chaque carte du deck"
          onClick={() => { surSfx('select'); onManuel(); }}
        >
          <i className="rpg-creation__icone" aria-hidden="true">✎</i>
          <strong>Création manuelle</strong>
          <small>Vous choisissez chaque carte</small>
          <span className="rpg-creation__etapes">
            <b>✚</b> Ajouter
            <i aria-hidden="true">→</i>
            <b>−</b> Retirer
            <i aria-hidden="true">→</i>
            <b>⌸</b> Enregistrer
          </span>
          <span className="rpg-creation__desc">
            Un constructeur minimaliste : votre collection à gauche, votre deck à droite. Clic pour ajouter,
            clic droit pour retirer, 30 cartes et c’est tout.
          </span>
          <span className="rpg-creation__cta">Ouvrir l’atelier →</span>
        </button>
      </div>
    </section>
  );
}

export default RpgDeckModeChoice;
