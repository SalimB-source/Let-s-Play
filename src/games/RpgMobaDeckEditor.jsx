import { rpgMobaCartePourApercu, rpgMobaNotesCarte } from './rpgMobaPresentation.js';
import { useMemo, useState } from 'react';
import { RPG_ELEMENTS, cardById, cardColors, cardCopyLimit } from './rpgCards.js';
import { cardArt } from './rpgCardArt.js';
import { MOBA_CARTES_AUTORISEES, rpgMobaValiderDeck } from './rpgMobaLocal.js';

const normaliser = (texte) => texte.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
const categorie = (card) => ['creature', 'hero'].includes(card.kind) ? 'creature' : card.kind;

/** Each seat has an independent draft; the engine remains the source of deck rules. */
export default function RpgMobaDeckEditor({ deck, joueur, onCancel, onSave }) {
  const [ids, setIds] = useState(() => [...deck.cardIds]);
  const [query, setQuery] = useState('');
  const [element, setElement] = useState('tous');
  const [type, setType] = useState('tous');
  const [tri, setTri] = useState('nom');
  const [selection, setSelection] = useState(false);
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
      && (type === 'tous' || categorie(card) === type)
      && (!selection || counts.has(card.id))
      && normaliser(card.name).includes(normaliser(query.trim())))
    .sort((a, b) => (tri === 'cout' ? a.cost - b.cost : 0) || a.name.localeCompare(b.name, 'fr'));
  const add = (id) => setIds((current) => [...current, id]);
  const remove = (id) => setIds((current) => {
    const index = current.lastIndexOf(id);
    return index < 0 ? current : [...current.slice(0, index), ...current.slice(index + 1)];
  });
  const resetFilters = () => { setQuery(''); setElement('tous'); setType('tous'); setTri('nom'); setSelection(false); };
  return <div className="moba__overlay moba__editor-overlay" role="dialog" aria-modal="true" aria-label={`Composer le deck de ${joueur}`}>
    <div className="moba__modal moba__editor">
      <div className="moba__editor-heading"><div><span>ATELIER DE DECK · {joueur.toUpperCase()}</span><h2>Composer votre deck</h2><p>30 cartes · 1 à 2 éléments · limites d’exemplaires habituelles</p></div><span className="moba__editor-crest" aria-hidden="true">✦</span></div>
      <div className="moba__editor-summary" aria-live="polite">
        <div className="moba__editor-progress"><strong>{ids.length} / 30 cartes</strong><span className="moba__editor-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, ids.length / 30 * 100)}%` }} /></span></div>
        <span>Couleurs : {elements.join(', ') || 'aucune'}</span>
        <span className={validation.ok ? 'is-valid' : 'is-invalid'}>{validation.ok ? 'Deck valide' : validation.raison}</span>
      </div>
      <div className="moba__editor-filters">
        <label className="moba__editor-search">Rechercher une carte<input autoFocus type="search" placeholder="Nom de la carte" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>Élément<select value={element} onChange={(event) => setElement(event.target.value)}><option value="tous">Tous</option>{RPG_ELEMENTS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label>
        <label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option value="tous">Tous</option><option value="creature">Créatures et héros</option><option value="magie">Magies</option><option value="arme">Armes</option>{MOBA_CARTES_AUTORISEES.some((id) => cardById(id)?.kind === 'site') && <option value="site">Sites</option>}</select></label>
        <label>Trier par<select value={tri} onChange={(event) => setTri(event.target.value)}><option value="nom">Nom</option><option value="cout">Coût imprimé</option></select></label>
      </div>
      <div className="moba__editor-toolbar"><label className="moba__editor-owned"><input type="checkbox" checked={selection} onChange={(event) => setSelection(event.target.checked)} /> Cartes de ce deck uniquement</label><span role="status">{cards.length} carte{cards.length === 1 ? '' : 's'}</span><button type="button" className="moba__editor-reset" onClick={resetFilters}>Réinitialiser les filtres</button></div>
      <div className="moba__editor-list" aria-label="Cartes adaptées au MOBA">
        {cards.map((card) => {
          const count = counts.get(card.id) ?? 0;
          const limit = cardCopyLimit(card);
          return <div className={`moba__editor-card${count ? ' is-in-deck' : ''}`} key={card.id}>
            <img src={cardArt(card.id)} alt="" loading="lazy" />
            <div><strong>{card.name}</strong><small className="moba__editor-meta">{cardColors(card).join(' · ')} · coût {card.cost} · {card.rarity}</small><small>{rpgMobaCartePourApercu(card)?.text}</small>{rpgMobaNotesCarte(card).map((note) => <small key={note}>MOBA : {note}</small>)}{card.id === 'chercheuse-des-armes-ensevelies' && <small>MOBA : seules les armes imprimées auditées sont éligibles. Le Sabre maudit est une magie et ne peut pas être trouvé.</small>}{['javelot-du-beffroi', 'braise-et-sable', 'lance-de-givre', 'lance-de-la-lune-givree'].includes(card.id) && <small>Durabilité du moteur de duel : l’arme se brise après une attaque ou une défense du porteur.</small>}{['cuirasse-de-sel', 'takouba-des-pistes', 'armure-de-cendres', 'hache-de-la-banquise', 'khopesh-d-or', 'licou-du-chien-de-sable', 'harnais-du-mehari', 'masque-du-guetteur', 'jitte-d-amayas', 'sandales-de-tislit', 'grappin-d-abordage', 'baton-des-citernes', 'lame-des-ergs', 'takouba-de-tin-hinan', 'sphere-de-rotation'].includes(card.id) && <small>Durabilité du moteur de duel : l’arme se brise après deux attaques ou défenses du porteur.</small>}{card.id === 'sphere-de-rotation' && <small>MOBA : le renvoi peut aussi partir en défense ou sur une Attaque ciblée ; le bouclier adverse peut l’intercepter.</small>}{card.id === 'guetteuse-des-marees' && <small>MOBA : l’alliée revient dans sa voie d’origine ; si elle est pleine, elle attend. Une voie conquise annule le retour.</small>}{card.id === 'takouba-de-tin-hinan' && <small>MOBA : blesser la voie adverse crée le Chien dans la voie du porteur, ou dans une autre voie active si nécessaire.</small>}{card.id === 'passeur-au-masque-de-chacal' && <small>MOBA : la dernière créature du cimetière revient si elle est auditée dans sa voie si possible, sinon dans une autre voie active ; un champ plein ou une dernière créature non auditée empêche le retour.</small>}{card.id === 'sabre-du-croissant-noir' && <small>Endurance : l’arme se brise après une attaque du porteur, pas après une défense.</small>}</div>
            <div className="moba__editor-count"><button type="button" aria-label={`Retirer ${card.name}`} disabled={!count} onClick={() => remove(card.id)}>−</button><span aria-label={`${count} sur ${limit} exemplaires`}>{count}/{limit}</span><button type="button" aria-label={`Ajouter ${card.name}`} disabled={count >= limit || ids.length >= 30} onClick={() => add(card.id)}>+</button></div>
          </div>;
        })}
        {!cards.length && <p className="moba__editor-empty">Aucune carte adaptée ne correspond à ces filtres.</p>}
      </div>
      <div className="moba__editor-actions"><span>Modifications conservées uniquement pour cette partie</span><button type="button" onClick={onCancel}>Annuler</button><button type="button" className="moba__primary" disabled={!validation.ok} onClick={() => onSave({ ...draft, name: 'Deck personnalisé' })}>Utiliser ce deck →</button></div>
    </div>
  </div>;
}
