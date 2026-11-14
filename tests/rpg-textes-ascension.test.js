import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ASCENSION_CARDS } from '../src/games/rpgAscensionCards.js';
import { RPG_ASCENSION_SUPPORT_CREATURES, RPG_ASCENSION_SUPPORT_SPELLS } from '../src/games/rpgAscensionSupports.js';
import { cardById } from '../src/games/rpgCards.js';
import { effetsDetailles, texteCombatIndividuel } from '../src/games/effetIcons.js';
import { texteApercuSansDoublons } from '../src/games/rpgCardResume.js';
import { rpgMobaCartePourApercu } from '../src/games/rpgMobaPresentation.js';

const supports = [...RPG_ASCENSION_SUPPORT_CREATURES, ...RPG_ASCENSION_SUPPORT_SPELLS];
const apercu = carte => texteApercuSansDoublons(effetsDetailles(carte));

test('Soutiens : textes courts sans répéter les règles générales, limite par nom conservée', () => {
  for (const carte of supports) for (const vue of [carte, rpgMobaCartePourApercu(carte)]) {
    for (const texte of [vue.text, texteCombatIndividuel(vue), apercu(vue)]) {
      assert.ok(texte.length <= 210, carte.id);
      assert.doesNotMatch(texte, /sans Rapidité|ne consomme pas votre invocation normale|ne peut pas attaquer ce tour/i, carte.id);
      assert.match(texte, /Une fois par tour, toutes copies confondues/, carte.id);
    }
  }
});

test('Retour des ensevelis : les conditions et le choix automatique restent lisibles', () => {
  for (const vue of [cardById('retour-des-ensevelis'), rpgMobaCartePourApercu(cardById('retour-des-ensevelis'))]) {
    const texte = apercu(vue);
    assert.match(texte, /dernière créature Ténèbres non-Ascension de coût imprimé 3 ou moins de votre cimetière/);
    assert.match(texte, /Une fois par tour, toutes copies confondues/);
    assert.ok(effetsDetailles(vue).pastilles.find(p => p.cle === 'reanimation')?.description);
  }
});

test('Chaque soutien conserve sa source, sa sélection et ses contraintes essentielles', () => {
  const motifs = {
    'gardienne-des-sables-ensevelis': /choisissez dans votre cimetière.*coût imprimé 3 ou moins.*spécialement.*bouclier avant son effet d’arrivée/,
    'convoi-des-dunes': /première créature Sable de coût imprimé 2 de votre main/,
    'confluence-des-etincelles': /depuis votre main jusqu’à deux Djinns Braise : le premier de coût imprimé 1, puis le premier de coût 3/,
    'eveil-des-dunes': /premier Élémental Sable de coût imprimé 4 depuis le dessus de votre pioche/,
  };
  for (const [id, motif] of Object.entries(motifs)) {
    for (const carte of [cardById(id), rpgMobaCartePourApercu(cardById(id))]) assert.match(apercu(carte), motif, id);
  }
});

test('Ascensions : recettes et effets propres lisibles, définitions détaillées dans les pastilles', () => {
  const effets = {
    'samourai-du-dragon-rouge': ['contreAttaque', 'esquive', 'defenseur'],
    'jarl-du-dernier-rempart': ['overkill', 'bouclier', 'furie'],
    'scorpion-de-l-eclipse': ['defenseur', 'poison'],
    'colosse-du-verre-ardent': ['bouclier', 'provocation'],
    'valkyrie-de-la-derniere-aurore': ['envol', 'volDeVie'],
    'amiral-des-abysses': ['bouclier', 'butin', 'abordage'],
  };
  for (const carte of RPG_ASCENSION_CARDS) for (const vue of [carte, rpgMobaCartePourApercu(carte)]) {
    assert.equal(texteCombatIndividuel(vue), vue.text, carte.id);
    assert.match(apercu(vue), /^Ascension — .+ Coût total : \d+\./, carte.id);
    for (const cle of effets[carte.id] ?? []) assert.ok(effetsDetailles(vue).pastilles.find(p => p.cle === cle)?.description, `${carte.id} : ${cle}`);
  }
  assert.match(apercu(cardById('scorpion-de-l-eclipse')), /créatures blessées, alliées et adverses.*MOBA.*sa voie/);
  assert.match(apercu(cardById('colosse-du-verre-ardent')), /choisissez.*jusqu’à 2 Djinns.*coût imprimé 3 ou moins.*cimetière/);
  assert.match(apercu(cardById('valkyrie-de-la-derniere-aurore')), /choisissez une créature Viking.*cimetière/);
  assert.match(apercu(cardById('amiral-des-abysses')), /piochez une carte/);
  const abordage = effetsDetailles(cardById('amiral-des-abysses')).pastilles.find(p => p.cle === 'abordage');
  assert.match(abordage.description, /coût 5 ou moins/);
  assert.match(abordage.description, /ne peut pas être rachetée/);
});
