/**
 * L'icône du Souk de Bab El — une échoppe de marché, bannière déployée.
 *
 * Elle remplace la pièce de crédit là où l'on parle du Souk lui-même (le lien
 * « Aller au Souk »), pas de la bourse : la pièce ◈ dit « combien j'ai »,
 * l'échoppe dit « où j'achète ». Deux idées, deux glyphes.
 *
 * Dessinée en `stroke="currentColor"` : elle prend la couleur du texte qui
 * l'entoure (le laiton du bouton), sans dégradé ni identifiant à gérer. Elle se
 * dimensionne en `1em`, comme la pièce. `aria-hidden` : le libellé « Le Souk »
 * déjà lu à côté suffit.
 */
export default function RpgMarketIcon({ className = '' }) {
  return (
    <svg
      className={`rpg-market${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* La tente de l'échoppe, de l'apex jusqu'au comptoir. */}
      <path d="M12 3.4 4.5 8V20.6h15V8Z" />
      {/* L'étagère sous l'auvent. */}
      <path d="M4.5 11.5h15" />
      {/* L'entrée. */}
      <path d="M9 20.6v-5h6v5" />
      {/* Le mât et sa bannière — ce qui fait d'elle un étal de marché. */}
      <path d="M12 3.4V1.6" />
      <path d="M12 1.6l4 1.4-4 1.4Z" />
    </svg>
  );
}
