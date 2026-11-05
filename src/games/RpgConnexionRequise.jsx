import { useContext } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { LoginForm } from './RpgDesktopLogin';

/** Ne monte aucun écran du Sablier avant la restauration d'une vraie session. */
export default function RpgConnexionRequise({ children }) {
  const auth = useContext(AuthContext);
  if (!auth || auth.loading) {
    return <div className="rpg-desktop-login__chargement" role="status">Chargement du compte…</div>;
  }
  if (!auth.session?.user) return <LoginForm connexionObligatoire />;
  return children;
}
