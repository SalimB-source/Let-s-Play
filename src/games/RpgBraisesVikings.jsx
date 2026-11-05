/* Étincelles portées par le vent sur la lice viking : un simple calque 2D,
 * visible même sans WebGL. Elles restent aux bords pour ne pas gêner les cartes
 * ni le Valknut, et sont découpées avec la moitié de plateau de leur camp. */
// Auparavant les points de 3 px étaient presque imperceptibles sur la
// peinture 4K. Plusieurs tailles et départs décalés donnent un feu vivant,
// sans flammes ni braseros et sans encombrer le Valknut au centre.
const BRAISES = [
  [5, 12, 8, -2, 5.2, 12], [16, 25, 6, -4, 6.3, -13],
  [8, 39, 7, -1, 4.8, 17], [18, 69, 6, -3, 6.7, -9],
  [9, 86, 9, -5, 5.6, 14], [22, 94, 6, -2, 7.1, -11],
  [34, 8, 7, -4, 6.5, 12], [64, 6, 8, -2, 5.9, -14],
  [86, 16, 8, -3, 6.1, -12], [95, 33, 6, -1, 5.3, 13],
  [84, 53, 7, -5, 7.0, -15], [94, 73, 8, -2, 5.5, 11],
  [82, 88, 6, -4, 6.6, -12], [70, 95, 7, -1, 5.8, 10],
  [47, 94, 6, -3, 6.9, -8], [4, 59, 6, -4, 5.7, 9],
  [11, 18, 7, -3, 6.2, -14], [7, 67, 8, -5, 5.1, 13],
  [14, 81, 6, -1, 5.9, -9], [26, 96, 7, -4, 6.5, 13],
  [89, 24, 6, -5, 6.8, 8], [96, 46, 8, -3, 5.7, -12],
  [91, 63, 7, -4, 6.1, 14], [87, 81, 8, -2, 5.3, -9],
  [59, 96, 7, -3, 6.4, 8], [39, 5, 6, -1, 5.7, -11],
];

export default function RpgBraisesVikings({ cote = 'entier' }) {
  return (
    <div className={`rpg-braises-vikings rpg-braises-vikings--${cote}`} aria-hidden="true">
      {BRAISES.map(([x, y, taille, delai, duree, derive], index) => (
        <span
          key={index}
          className="rpg-braises-vikings__etincelle"
          style={{
            '--braise-x': `${x}%`, '--braise-y': `${y}%`, '--braise-taille': `${taille}px`,
            '--braise-delai': `${delai}s`, '--braise-duree': `${duree}s`, '--braise-derive': `${derive}px`,
          }}
        />
      ))}
    </div>
  );
}
