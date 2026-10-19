import { creditsLisible } from './rpgCredits.js';

const COULEURS = {
  sable: { label: 'Sable', accent: '#e7c477', fond: 'rgba(199, 157, 77, .16)' },
  eau: { label: 'Eau', accent: '#8ed8ef', fond: 'rgba(74, 158, 194, .18)' },
  tenebres: { label: 'Ténèbres', accent: '#c9a4e8', fond: 'rgba(126, 87, 164, .2)' },
  braise: { label: 'Braise', accent: '#f3a06c', fond: 'rgba(198, 92, 52, .18)' },
  neige: { label: 'Neige', accent: '#b8e7ff', fond: 'rgba(125, 195, 225, .18)' },
};

/**
 * Le choix des leçons : une carte par tutoriel, avec son deck, sa durée, le
 * nombre d'étapes et la récompense. Une leçon terminée reste jouable, mais sa
 * récompense n'est versée qu'une fois (la bourse le retient).
 */
export default function RpgTutorialMenu({ tutoriels, termines = [], credits = 0, onStart, onExit, onPlaySfx }) {
  const faits = new Set(termines);
  const play = (son) => onPlaySfx?.(son);
  return (
    <main className="rpg-tutoriels" data-screen="tutoriels">
      <header className="rpg-tutoriels__header">
        <button type="button" className="rpg-tutoriels__back" onClick={() => { play('menu'); onExit?.(); }}>
          <span aria-hidden="true">←</span> Retour
        </button>
        <div className="rpg-tutoriels__heading">
          <span className="rpg-tutoriels__eyebrow">LE SABLIER · APPRENDRE À JOUER</span>
          <h1>Choisissez votre leçon</h1>
          <p>Cinq parties guidées, cinq decks, cinq mécaniques. Chaque leçon terminée verse une récompense en crédits ◈ — une seule fois par leçon.</p>
        </div>
        <div className="rpg-tutoriels__purse" aria-label={`Bourse : ${credits} crédits`}>
          <span aria-hidden="true">◈</span>
          <strong>{creditsLisible(credits)}</strong>
          <small>crédits</small>
        </div>
      </header>

      <div className="rpg-tutoriels__grid">
        {tutoriels.map((tutoriel, index) => {
          const couleur = COULEURS[tutoriel.element] ?? COULEURS.sable;
          const fait = faits.has(tutoriel.id);
          return (
            <article
              key={tutoriel.id}
              className={`rpg-tutoriels__card${fait ? ' is-done' : ''}`}
              style={{ '--tuto-accent': couleur.accent, '--tuto-fond': couleur.fond }}
              data-tutorial-id={tutoriel.id}
            >
              <div className="rpg-tutoriels__topline">
                <span className="rpg-tutoriels__index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span className="rpg-tutoriels__niveau">{tutoriel.level}</span>
                {fait && <span className="rpg-tutoriels__done">✓ Terminé</span>}
              </div>
              <div className="rpg-tutoriels__sigil" aria-hidden="true">{tutoriel.icon}</div>
              <span className="rpg-tutoriels__element">{couleur.label} · {tutoriel.deckName}</span>
              <h2>{tutoriel.name}</h2>
              <p className="rpg-tutoriels__tagline">{tutoriel.tagline}</p>
              <p className="rpg-tutoriels__description">{tutoriel.description}</p>
              <div className="rpg-tutoriels__meta">
                <span>{tutoriel.duration}</span>
                <span>{tutoriel.steps.length} étapes</span>
                <span className={`rpg-tutoriels__reward${fait ? ' is-claimed' : ''}`}>
                  {fait ? 'Récompense remportée' : `+${tutoriel.reward} ◈`}
                </span>
              </div>
              <button
                type="button"
                className="rpg-tutoriels__start"
                data-tutorial-start={tutoriel.id}
                onClick={() => { play('select'); onStart?.(tutoriel.id); }}
              >
                <span>{fait ? 'Rejouer la leçon' : 'Commencer la leçon'}</span>
                <span aria-hidden="true">→</span>
              </button>
            </article>
          );
        })}
      </div>

      <p className="rpg-tutoriels__hint">
        Astuce : chaque leçon utilise le deck indiqué. Une fois son écran d’entraînement terminé, vous continuez la partie librement ou revenez au menu.
      </p>
    </main>
  );
}
