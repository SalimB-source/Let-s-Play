import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), 'utf8');

const page = lire('src/games/RpgDuelPage.jsx');
const battleCss = lire('src/games/rpg-battle.css');
const mobileCss = lire('src/games/rpg-mobile.css');
const essaiCss = lire('src/games/rpg-mana-essai.css');
const vieCss = lire('src/games/rpg-vie-compteurs.css');

test('jauges de mana PC en mode essai : ancrées sur la hauteur réelle de leur plaque, jamais à +64px fixe', () => {
  assert.doesNotMatch(
    essaiCss,
    /\.rpg-flux-track--(?:ennemi|joueur)\s*\{[^}]*\+\s*64px/s,
    'plus de décalage fixe +64px qui faisait passer la jauge sur les PV et le portrait',
  );
  assert.match(
    essaiCss,
    /\.rpg-battle\[data-mode-mana="essai"\]:not\(\.rpg-battle--touch\) \.card-table > \.rpg-flux-track--ennemi\s*\{[^}]*top:\s*calc\(var\(--rpg-essai-ennemi-top\)\s*\+\s*var\(--rpg-plaque-ennemi-h,\s*\d+px\)\s*\+\s*var\(--rpg-essai-hud-gap\)\);/s,
    'la jauge adverse descend sous la hauteur réelle mesurée de la plaque adverse',
  );
  assert.match(
    essaiCss,
    /\.rpg-battle\[data-mode-mana="essai"\]:not\(\.rpg-battle--touch\) \.card-table > \.rpg-flux-track--joueur\s*\{[^}]*top:\s*calc\(var\(--rpg-essai-joueur-top\)\s*\+\s*var\(--rpg-plaque-joueur-h,\s*\d+px\)\s*\+\s*var\(--rpg-essai-hud-gap\)\);/s,
    'la jauge du joueur descend sous la hauteur réelle mesurée de la plaque du joueur',
  );
  assert.match(
    page,
    /const modeManaEssai = Boolean\(duel && duel\.modeMana === RPG_MODE_MANA_ESSAI\);[\s\S]*?if \(!modeManaEssai \|\| !table\) return undefined;[\s\S]*?table\.style\.setProperty\(`--rpg-plaque-\$\{suffixe\}-h`, `\$\{hauteurPlaque\}px`\);/,
    'la page publie --rpg-plaque-ennemi-h et --rpg-plaque-joueur-h sur PC comme sur mobile en mode essai',
  );
});

test('plaques des sorciers PC : marge intérieure, césure propre et rond de PV proportionné au portrait', () => {
  assert.match(
    battleCss,
    /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate\s*\{[^}]*padding:\s*6px 18px 6px 6px;/s,
    'la pastille PC garde une marge intérieure pour que le nom ne déborde pas de l’arrondi ni ne touche la bordure',
  );
  assert.match(
    battleCss,
    /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__profile-name,\s*\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-wizard-plate__enemy-name\s*\{[^}]*overflow-wrap:\s*break-word;/s,
    'les noms longs comme « Le Passeur au masque de chacal » reviennent à la ligne entre les mots',
  );
  assert.match(
    vieCss,
    /\.rpg-battle:not\(\.rpg-battle--touch\) \.rpg-jauge-vie__rond\s*\{\s*width:\s*clamp\(34px,\s*2\.5vw,\s*40px\);\s*height:\s*clamp\(34px,\s*2\.5vw,\s*40px\);\s*\}/,
    'le rond de PV PC reste plus compact que le portrait pour ne pas gonfler la plaque',
  );
  assert.match(
    mobileCss,
    /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.rpg-battle--touch \.card-table > \.rpg-wizard-plate\s*\{[^}]*padding:\s*6px 18px 6px 6px;/,
    'une fenêtre PC étroite à la souris garde la même marge intérieure de pastille',
  );
  assert.match(
    essaiCss,
    /\.rpg-battle\[data-mode-mana="essai"\]\.rpg-battle--touch :is\(\.rpg-wizard-plate--joueur, \.rpg-wizard-plate--ennemi\) \.rpg-wizard-plate__avatar\s*\{[^}]*width:\s*var\(--rpg-plate-avatar\);[^}]*height:\s*var\(--rpg-plate-avatar\);/s,
    'en fenêtre étroite avec souris, le portrait ne déborde jamais de sa colonne dans la grille d’essai',
  );
});

test('colonne gauche PC en mode essai : bulle de réflexion, paquet et plaques ne se chevauchent sur aucun format', () => {
  assert.match(
    essaiCss,
    /\.rpg-battle\[data-mode-mana="essai"\]:not\(\.rpg-battle--touch\) \.rpg-wizard-plate--ennemi \.rpg-wizard-plate__thinking\s*\{\s*top:\s*auto;\s*bottom:\s*calc\(100%\s*\+\s*7px\);\s*\}/,
    '« Le sorcier réfléchit… » passe au-dessus de la plaque adverse pour ne pas couvrir la jauge de mana',
  );
  assert.match(
    battleCss,
    /\.rpg-card-pile--deck\s*\{[^}]*padding:\s*10px 10px 6px 12px;/s,
    'la capsule du paquet encadre les cartes décalées sans débordement en haut à gauche',
  );

  const clamp = (min, val, max) => Math.max(min, Math.min(max, val));

  // Vérifie tous les formats PC (> 1100 px), du portable mis à l'échelle 150 %
  // (1280 × 580) au grand écran (2560 × 1440), avec nom adverse sur 2 lignes
  // (« Le Passeur au masque de chacal ») et nom joueur sur 1 ou 2 lignes.
  const formats = [
    [1101, 580],
    [1280, 580],
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1600, 900],
    [1920, 920],
    [1920, 1080],
    [2560, 1440],
  ];

  for (const [W, H] of formats) {
    for (const lignesJoueur of [1, 2]) {
      const combatFeedBottom = 12 + 34; // top: 12px, min-height: 34px
      const fontNom = clamp(10, 0.009 * W, 13);
      const hauteurLigneNom = Math.ceil(fontNom * 1.18);
      const diametrePv = clamp(34, 0.025 * W, 40);
      const diametreAvatar = clamp(44, 0.036 * W, 52);

      const hauteurPlaque = (lignesNom) => {
        const colDroite = lignesNom * hauteurLigneNom + 3 + diametrePv;
        return Math.ceil(Math.max(diametreAvatar, colDroite) + 12 + 2);
      };

      const ennemiTop = clamp(54, 0.125 * H, 144);
      const ennemiH = hauteurPlaque(2); // ex. « Le Passeur au masque de chacal »
      const ennemiBottom = ennemiTop + ennemiH;

      const fluxH = 36;
      const fluxEnnemiTop = ennemiBottom + 8;
      const fluxEnnemiBottom = fluxEnnemiTop + fluxH;

      const pilesTop = 0.42 * H;
      const deckStackH = clamp(72, Math.min(0.072 * W, 0.12 * H), 104);
      const pilesH = 10 + deckStackH + 4 + 15 + 4 + 9 + 6;
      const pilesBottom = pilesTop + pilesH;

      const joueurTop = 0.685 * H;
      const joueurH = hauteurPlaque(lignesJoueur);
      const joueurBottom = joueurTop + joueurH;

      const fluxJoueurTop = joueurBottom + 8;
      const fluxJoueurBottom = fluxJoueurTop + fluxH;

      const contexte = `${W}×${H} (joueur ${lignesJoueur}L)`;
      assert.ok(ennemiTop >= combatFeedBottom + 6, `${contexte} : plaque adverse sous le journal (${ennemiTop} vs ${combatFeedBottom})`);
      assert.ok(fluxEnnemiTop >= ennemiBottom + 8, `${contexte} : jauge adverse sous la plaque adverse`);
      assert.ok(pilesTop >= fluxEnnemiBottom + 12, `${contexte} : paquet/cimetière sous la jauge adverse (${pilesTop.toFixed(1)} vs ${fluxEnnemiBottom.toFixed(1)})`);
      assert.ok(joueurTop >= pilesBottom + 12, `${contexte} : plaque joueur sous le paquet (${joueurTop.toFixed(1)} vs ${pilesBottom.toFixed(1)})`);
      assert.ok(fluxJoueurTop >= joueurBottom + 8, `${contexte} : jauge joueur sous la plaque joueur`);
      assert.ok(fluxJoueurBottom <= H - 12, `${contexte} : jauge joueur entière dans l'écran (${fluxJoueurBottom.toFixed(1)} vs ${H})`);
    }
  }
});
