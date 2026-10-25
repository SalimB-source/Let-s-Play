/**
 * Icône « Jeu Solo » du Sablier — `src/games/RpgSoloIcon.jsx`
 *
 * Elle remplace l'ancien emoji sur l'onglet des Tours de Bab El : celui-ci
 * changeait de dessin (ou disparaissait) selon la police du téléphone, et ne
 * disait rien du Sablier. Le dessin vit dans
 * `public/icons/sablier/jeu-solo.svg` : une tour créée pour le mode solo, avec
 * le sablier gravé dedans et un grain unique au col. Le dossier `public/icons`
 * est embarqué par la coque PC — l'icône reste
 * donc visible hors ligne.
 *
 * L'image est décorative : le bouton porte déjà `aria-label="Jeu Solo"` et le
 * libellé « Jeu Solo » reste à côté. Sa taille est réglée en `1em` par
 * `rpg-battle.css`, comme les autres icônes d'onglets.
 */
const DESSIN = `${import.meta.env.BASE_URL}icons/sablier/jeu-solo.svg`;

export default function RpgSoloIcon({ className = '' }) {
  return (
    <img
      className={`rpg-solo-icon${className ? ` ${className}` : ''}`}
      src={DESSIN}
      alt=""
      aria-hidden="true"
      width="24"
      height="24"
      decoding="async"
      draggable={false}
      data-icone-jeu-solo=""
    />
  );
}
