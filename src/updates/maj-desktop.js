/**
 * La mise à jour de la coque PC, vue du jeu — src/updates/maj-desktop.js
 * =====================================================================
 * Le pendant « dans le jeu » de `desktop/main.js`. Le processus principal
 * reste seul à parler à `electron-updater` ; ce module ne fait que lire le
 * pont sécurisé (`window.letsPlayDesktop.maj`, posé par `preload.cjs`) et
 * présenter son état au panneau du Sablier (`RpgMiseAJour.jsx`).
 *
 * Trois règles :
 *
 *   1. **hors coque PC, rien** — dans un navigateur ou l'APK, le pont n'existe
 *      pas : le store reste inerte, le panneau ne se monte pas ;
 *   2. **le store est un singleton** — la pastille, le panneau modal et la
 *      carte des Paramètres lisent le même état, une seule abonnement IPC ;
 *   3. **rien ne lève** — un pont absent ou une promesse rejetée est un état
 *      « erreur », jamais une exception qui viderait la table de duel.
 *
 * Le pont est injectable (`creerStoreMajDesktop(pont)`) pour les tests.
 */

/** L'état initial, avant toute nouvelle de la coque. */
export const ETAT_MAJ_INITIAL = Object.freeze({
  phase: 'repos',
  version: '',
  versionInstallee: '',
  datePublication: '',
  progression: { percent: 0, octetsParSeconde: 0, transferes: 0, total: 0 },
  erreur: '',
});

/** Les phases que la coque peut diffuser (voir `desktop/main.js`). */
export const PHASES_MAJ = ['repos', 'verification', 'disponible', 'telechargement', 'prete', 'a-jour', 'erreur'];

/** Vrai quand le pont de mise à jour de la coque PC est présent. */
export function pontMajDisponible(win = typeof window === 'undefined' ? undefined : window) {
  return Boolean(win?.letsPlayDesktop?.maj && typeof win.letsPlayDesktop.maj.etat === 'function');
}

/** Normalise un état reçu de la coque : jamais de trou, jamais de NaN. */
export function normaliserEtatMaj(brut) {
  if (!brut || typeof brut !== 'object') return { ...ETAT_MAJ_INITIAL };
  const phase = PHASES_MAJ.includes(brut.phase) ? brut.phase : 'repos';
  const progression = brut.progression && typeof brut.progression === 'object' ? brut.progression : {};
  const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);
  return {
    phase,
    version: typeof brut.version === 'string' ? brut.version : '',
    versionInstallee: typeof brut.versionInstallee === 'string' ? brut.versionInstallee : '',
    datePublication: typeof brut.datePublication === 'string' ? brut.datePublication : '',
    progression: {
      percent: Math.min(100, Math.max(0, nombre(progression.percent))),
      octetsParSeconde: Math.max(0, nombre(progression.octetsParSeconde)),
      transferes: Math.max(0, nombre(progression.transferes)),
      total: Math.max(0, nombre(progression.total)),
    },
    erreur: typeof brut.erreur === 'string' ? brut.erreur : '',
  };
}

/**
 * Crée le store de mise à jour. `pont` est le pont `window.letsPlayDesktop.maj`
 * (injectable pour les tests). Sans pont, le store est inerte : `disponible`
 * vaut false et aucun ordre n'est envoyé.
 */
export function creerStoreMajDesktop(pont) {
  let etat = { ...ETAT_MAJ_INITIAL };
  let disponible = Boolean(pont && typeof pont.etat === 'function');
  const abonnes = new Set();
  const abonnesOuverture = new Set();
  let desabonnement = null;
  let desabonnementOuverture = null;
  let demarre = false;

  const emettre = () => { for (const abonne of abonnes) abonne(etat); };

  const majEtat = (patch) => {
    etat = normaliserEtatMaj({ ...etat, ...patch });
    emettre();
  };

  const store = {
    get disponible() { return disponible; },
    getEtat: () => etat,

    /** S'abonne aux changements d'état. Renvoie la fonction de désabonnement. */
    abonner(abonne) {
      abonnes.add(abonne);
      // Le premier abonné réveille le store : il réclame la main à la coque et
      // s'abonne aux diffusions IPC. Les suivants ne font que s'ajouter.
      if (!demarre) {
        demarre = true;
        if (disponible) {
          try {
            desabonnement = pont.surEtat?.((brut) => majEtat(brut)) || null;
          } catch { desabonnement = null; }
          try {
            desabonnementOuverture = pont.surOuverture?.(() => {
              for (const abonneOuverture of abonnesOuverture) abonneOuverture();
            }) || null;
          } catch { desabonnementOuverture = null; }
          Promise.resolve()
            .then(() => pont.etat())
            .then((brut) => { if (brut) majEtat(brut); })
            .catch((erreur) => majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) }));
        }
      }
      abonne(etat);
      return () => {
        abonnes.delete(abonne);
        // Le dernier abonné parti coupe l'abonnement IPC (la page se démonte).
        if (abonnes.size === 0 && desabonnement) {
          try { desabonnement(); } catch { /* déjà coupé */ }
          try { desabonnementOuverture?.(); } catch { /* déjà coupé */ }
          desabonnement = null;
          desabonnementOuverture = null;
          demarre = false;
        }
      };
    },

    /** S'abonne au signal « ouvre le panneau » (menu Aide de la coque). */
    abonnerOuverture(abonne) {
      abonnesOuverture.add(abonne);
      return () => { abonnesOuverture.delete(abonne); };
    },

    /** Demande une vérification à la coque (bouton du panneau / des Paramètres). */
    verifier() {
      if (!disponible) return;
      majEtat({ phase: 'verification', erreur: '' });
      try {
        Promise.resolve(pont.verifier()).catch((erreur) => majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) }));
      } catch (erreur) {
        majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) });
      }
    },

    /** Lance le téléchargement de l'installeur. */
    telecharger() {
      if (!disponible) return;
      majEtat({ phase: 'telechargement', erreur: '', progression: { percent: 0, octetsParSeconde: 0, transferes: 0, total: 0 } });
      try {
        Promise.resolve(pont.telecharger()).catch((erreur) => majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) }));
      } catch (erreur) {
        majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) });
      }
    },

    /** Quitte le jeu et lance l'installeur (« Redémarrer et installer »). */
    installer() {
      if (!disponible) return;
      try {
        Promise.resolve(pont.installer()).catch((erreur) => majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) }));
      } catch (erreur) {
        majEtat({ phase: 'erreur', erreur: String(erreur?.message || erreur) });
      }
    },
  };

  return store;
}

/** Le store partagé par tout le jeu (pastille, panneau, carte des Paramètres). */
let storePartage = null;

/** Renvoie le store singleton, créé à la première demande depuis le pont réel. */
export function storeMajDesktop(win = typeof window === 'undefined' ? undefined : window) {
  if (!storePartage) {
    storePartage = creerStoreMajDesktop(win?.letsPlayDesktop?.maj);
  }
  return storePartage;
}

/** Réinitialise le singleton (tests). */
export function reinitialiserStoreMajDesktop() {
  storePartage = null;
}

/** Formate un débit en octets/seconde en libellé lisible (« 2,4 Mo/s »). */
export function libelleDebit(octetsParSeconde) {
  const valeur = Number(octetsParSeconde) || 0;
  if (valeur >= 1048576) return `${(valeur / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo/s`;
  if (valeur >= 1024) return `${Math.round(valeur / 1024)} Ko/s`;
  return `${Math.round(valeur)} o/s`;
}

/** Formate une taille en octets en libellé lisible (« 105 Mo »). */
export function libelleTaille(octets) {
  const valeur = Number(octets) || 0;
  if (valeur >= 1048576) return `${(valeur / 1048576).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
  if (valeur >= 1024) return `${Math.round(valeur / 1024)} Ko`;
  return `${Math.round(valeur)} o`;
}
