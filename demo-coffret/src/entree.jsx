import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import RpgCoffretBienvenue from '../../src/games/RpgCoffretBienvenue.jsx';
import RpgBoosterOuverture from '../../src/games/RpgBoosterOuverture.jsx';
import { cardArt } from '../../src/games/rpgCardArt.js';
import { cardById, cardRarityInfo } from '../../src/games/rpgCards.js';

/** Un paquet de démonstration : une nouvelle, deux 2ᵉ exemplaires, un remboursé. */
function paquetDemo() {
  const ligne = (id, { doublon, remboursement = 0, exemplaires = 1 }) => ({
    id,
    carte: cardById(id),
    rarete: cardRarityInfo(cardById(id)).key,
    doublon,
    remboursement,
    exemplaires,
  });
  const cartes = [
    ligne('cavalier-amazigh-du-desert', { doublon: false, exemplaires: 1 }),
    ligne('le-grand-debarquement', { doublon: true, exemplaires: 2 }),
    ligne('vipere-de-verre', { doublon: true, exemplaires: 2 }),
    ligne('lame-des-ergs', { doublon: true, remboursement: 22, exemplaires: 2 }),
    ligne('tour-de-neige', { doublon: false, exemplaires: 1 }),
  ];
  return {
    cartes,
    prix: 140,
    rayonId: 'souk',
    offert: false,
    nouvelles: cartes.filter((c) => !c.doublon).length,
    remboursement: cartes.reduce((n, c) => n + c.remboursement, 0),
  };
}

function Demo() {
  const [vue, setVue] = useState('coffret');
  useEffect(() => {
    const choisir = (e) => setVue(e.detail);
    window.addEventListener('demo-vue', choisir);
    return () => window.removeEventListener('demo-vue', choisir);
  }, []);

  if (vue === 'booster') {
    return (
      <RpgBoosterOuverture
        ouverture={paquetDemo()}
        cardArt={cardArt}
        onPlaySfx={(nom) => console.log('sfx', nom)}
        onFermer={() => setVue('coffret')}
      />
    );
  }

  return (
    <RpgCoffretBienvenue
      onOuvrir={(coffret) => console.log('coffret ouvert', coffret.id)}
      onPlaySfx={(nom) => console.log('sfx', nom)}
    />
  );
}

// L'estampille du build : elle dit d'un coup d'œil si la page tourne sur une
// version ancienne (cache) ou sur celle qui vient d'être construite.
window.__BUILD__ = new Date().toISOString().slice(11, 19);

document.getElementById('vue-coffret')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('demo-vue', { detail: 'coffret' })));
document.getElementById('vue-booster')?.addEventListener('click', () => window.dispatchEvent(new CustomEvent('demo-vue', { detail: 'booster' })));
document.getElementById('rejouer')?.addEventListener('click', () => {
  Object.keys(localStorage)
    .filter((cle) => cle.startsWith('letsplay_sablier'))
    .forEach((cle) => localStorage.removeItem(cle));
  location.reload();
});

createRoot(document.getElementById('racine')).render(<Demo />);
