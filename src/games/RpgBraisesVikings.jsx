/* Étincelles portées par le vent sur la lice viking : un simple calque 2D,
 * visible même sans WebGL. Elles restent aux bords pour ne pas gêner les cartes
 * ni le Valknut, et sont découpées avec la moitié de plateau de leur camp. */
const BRAISES = [
  [5, 12, 5, -2, 5.2, 12], [16, 25, 3, -4, 6.3, -13],
  [8, 39, 4, -1, 4.8, 17], [18, 69, 3, -3, 6.7, -9],
  [9, 86, 6, -5, 5.6, 14], [22, 94, 3, -2, 7.1, -11],
  [34, 8, 3, -4, 6.5, 12], [64, 6, 4, -2, 5.9, -14],
  [86, 16, 5, -3, 6.1, -12], [95, 33, 3, -1, 5.3, 13],
  [84, 53, 4, -5, 7.0, -15], [94, 73, 5, -2, 5.5, 11],
  [82, 88, 3, -4, 6.6, -12], [70, 95, 4, -1, 5.8, 10],
  [47, 94, 3, -3, 6.9, -8], [4, 59, 3, -4, 5.7, 9],
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
