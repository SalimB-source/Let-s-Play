import './rpg-eclair-activation.css';

/** Un éclair doré à facettes : même dessin, quelle que soit la police emoji. */
export default function RpgEclairActivation() {
  return (
    <svg className="rpg-eclair-activation" viewBox="0 0 24 28" aria-hidden="true" focusable="false">
      {/* L'épaisseur sombre est décalée sous la face pour créer le relief. */}
      <path d="M13.5 1.6 3.5 15.2h6.4L7.4 26.3 21 10.1h-6.3l3.4-8.5Z" transform="translate(.8 1)" fill="#80500a" stroke="#3d2406" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M13.5 1.6 3.5 15.2h6.4L7.4 26.3 21 10.1h-6.3l3.4-8.5Z" fill="#e6a920" stroke="#693d08" strokeWidth="1" strokeLinejoin="round" />
      <path d="M13.5 2.4 4.8 14.4h5.9l2-3.4H19l-4.8-1 2.9-7.6Z" fill="#ffe272" />
      <path d="m10.7 14.4-2.1 9.5L19 11l-6.3 4Z" fill="#f9c63a" />
      <path d="M13.5 2.5 5 14.2h2.4l6.9-11.7Z" fill="#fff5be" opacity=".9" />
      <path d="m9 23.7 10-12.2-6.4 5.1Z" fill="#b67810" opacity=".65" />
    </svg>
  );
}
