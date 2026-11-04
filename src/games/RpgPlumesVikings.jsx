/* Plumes du champ de bataille : visibles même sans WebGL et dans chaque moitié
 * d'une table conquise. La peinture et les cartes ne capturent aucun geste. */
// Les plumes longent les bords : le cœur de l'arène reste libre pour les cartes.
const PLUMES = [
  [7, 19, 10, -3, 12], [26, 7, 15, -9, 18], [88, 12, 16, -12, 20],
  [12, 43, 13, -7, 14], [86, 40, 11, -10, 17], [8, 63, 15, -4, 19],
  [91, 76, 14, -8, 21], [38, 92, 11, -6, 13], [6, 83, 15, -10, 18],
  [67, 94, 12, -8, 16],
];

export default function RpgPlumesVikings({ cote = 'entier' }) {
  return (
    <div className={`rpg-plumes-vikings rpg-plumes-vikings--${cote}`} aria-hidden="true">
      {PLUMES.map(([x, y, taille, delai, duree], index) => (
        <span
          key={index}
          className={`rpg-plumes-vikings__plume${index % 3 === 0 ? ' is-sombre' : ''}`}
          style={{ '--plume-x': `${x}%`, '--plume-y': `${y}%`, '--plume-taille': `${taille}px`, '--plume-delai': `${delai}s`, '--plume-duree': `${duree}s` }}
        >
          <svg viewBox="0 0 24 58" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
            <path d="M12 55 C16 36 24 24 19 5 C17 -2 11 3 7 10 C-1 23 5 42 12 55Z" fill="currentColor" opacity=".88" />
            <path d="M12 55 C12 35 14 17 19 5 M12 42 L5 29 M13 34 L6 21 M15 25 L9 13 M12 40 L20 27 M14 30 L21 17" stroke="#394957" strokeWidth=".9" strokeLinecap="round" opacity=".62" />
            <path d="M12 55 C13 40 15 23 19 5" stroke="#f7ecd9" strokeWidth=".8" strokeLinecap="round" opacity=".7" />
          </svg>
        </span>
      ))}
    </div>
  );
}
