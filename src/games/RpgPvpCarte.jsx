import { Link } from 'react-router-dom';
import './rpg-pvp.css';
import { invitationDepuisMessage } from './rpgPvpSalon.js';
import { cheminDefi, lienDefi } from './rpgPvpApi.js';

/**
 * La carte d'un défi du Sablier, dans la messagerie.
 *
 * Elle ne contient que ce que le message porte — un code et un mode. Le statut
 * (en attente, accepté, terminé) n'est **jamais** recopié dans le message : les
 * deux joueurs le lisent à l'arbitre depuis le salon. Une carte ne peut donc
 * pas mentir sur l'état d'une partie, même si l'expéditeur modifie son client.
 */
export default function RpgPvpCarte({ message }) {
  const invitation = invitationDepuisMessage(message);
  if (!invitation) return null;
  const prefixeBase = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '');
  const origine = typeof window === 'undefined' ? '' : `${window.location.origin}${prefixeBase}`;
  const href = lienDefi(invitation.code, origine);
  return (
    <div className="rpg-pvp-carte">
      <p className="rpg-pvp-carte__eyebrow">DÉFI DU SABLIER</p>
      <p className="rpg-pvp-carte__code">{invitation.code}</p>
      <p className="rpg-pvp-carte__mode">
        {invitation.mode === 'async' ? 'À la correspondance' : 'En direct'}
        {invitation.deckNom ? ` · ${invitation.deckNom}` : ''}
      </p>
      <Link className="rpg-pvp-carte__cta" to={cheminDefi(invitation.code)}>Rejoindre le duel</Link>
      <span className="rpg-pvp-carte__lien">{href}</span>
    </div>
  );
}
