import { useMemo, useState } from 'react';
import { RPG_ELEMENTS, cardById, cardColors, cardCopyLimit } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import { MOBA_CARTES_AUTORISEES, rpgMobaValiderDeck } from './rpgMobaLocal.js';

/** Build only from the lane-audited pool; the parent keeps each seat's draft
 * separately. The original deck rules remain the source of copy limits. */
export default function RpgMobaDeckEditor({ deck, joueur, onCancel, onSave }) {
  const [ids, setIds] = useState(() => [...deck.cardIds]);
  const [query, setQuery] = useState('');
  const [element, setElement] = useState('tous');
  const counts = useMemo(() => {
    const result = new Map();
    for (const id of ids) result.set(id, (result.get(id) ?? 0) + 1);
    return result;
  }, [ids]);
  const elements = RPG_ELEMENTS.filter((color) => ids.some((id) => cardColors(cardById(id)).includes(color)));
  const draft = { cardIds: ids, elements };
  const validation = rpgMobaValiderDeck(draft);
  const cards = MOBA_CARTES_AUTORISEES.map((id) => cardById(id))
    .filter((card) => (element === 'tous' || cardColors(card).includes(element))
      && card.name.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const add = (id) => setIds((current) => [...current, id]);
  const remove = (id) => setIds((current) => {
    const index = current.lastIndexOf(id);
    return index < 0 ? current : [...current.slice(0, index), ...current.slice(index + 1)];
  });
  return <div className="moba__overlay" role="dialog" aria-modal="true" aria-label={`Composer le deck de ${joueur}`}>
    <div className="moba__modal moba__editor">
      <span>DECK PERSONNALISÉ · {joueur.toUpperCase()}</span>
      <h2>Composer votre deck</h2>
      <p>Choisissez parmi les cartes adaptées au MOBA. 30 cartes et 1 à 3 couleurs maximum ; les limites d’exemplaires habituelles s’appliquent.</p>
      <div className="moba__editor-summary" aria-live="polite">
        <strong>{ids.length} / 30 cartes</strong><span>Couleurs : {elements.join(', ') || 'aucune'}</span>
        <span className={validation.ok ? 'is-valid' : 'is-invalid'}>{validation.ok ? 'Deck valide' : validation.raison}</span>
      </div>
      <div className="moba__editor-filters">
        <label>Rechercher une carte<input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>Élément<select value={element} onChange={(event) => setElement(event.target.value)}><option value="tous">Tous</option>{RPG_ELEMENTS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>
      </div>
      <div className="moba__editor-list" aria-label="Cartes adaptées au MOBA">
        {cards.map((card) => {
          const count = counts.get(card.id) ?? 0;
          const limit = cardCopyLimit(card);
          return <div className="moba__editor-card" key={card.id}>
            <img src={cardArt(card.id)} alt="" />
            <div><strong>{card.name}</strong><small>{cardColors(card).join(' · ')} · {card.cost} mana · {card.rarity}</small><small>{card.text}</small></div>
            <div className="moba__editor-count"><button type="button" aria-label={`Retirer ${card.name}`} disabled={!count} onClick={() => remove(card.id)}>−</button><span aria-label={`${count} sur ${limit} exemplaires`}>{count}/{limit}</span><button type="button" aria-label={`Ajouter ${card.name}`} disabled={count >= limit || ids.length >= 30} onClick={() => add(card.id)}>+</button></div>
          </div>;
        })}
        {!cards.length && <p>Aucune carte adaptée ne correspond à cette recherche.</p>}
      </div>
      <div className="moba__editor-actions"><button type="button" onClick={onCancel}>Annuler</button><button type="button" className="moba__primary" disabled={!validation.ok} onClick={() => onSave({ ...draft, name: 'Deck personnalisé' })}>Utiliser ce deck →</button></div>
    </div>
  </div>;
}
