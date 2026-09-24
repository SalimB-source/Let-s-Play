/**
 * Vérification des boutons de compte de la navigation — `npm run check:auth`.
 *
 * La barre de navigation affiche « Se connecter » et « S'inscrire » comme deux
 * liens vers `/auth`, différenciés par le seul paramètre `?mode=`. La page
 * d'authentification doit donc lire ce paramètre : c'est le bug corrigé ici —
 * le bouton **S'inscrire** ouvrait le pop-up de connexion, parce que le mode
 * initial venait de la prop `initialMode` (« signin » par défaut) et ignorait la
 * requête. Quatre niveaux de contrôle :
 *
 *   1. la résolution du mode (paramètre d'URL, prop `/register`, valeurs
 *      inconnues, paramètre absent) ;
 *   2. le rendu réel (SSR) de chaque URL : quel formulaire s'affiche ;
 *   3. les deux boutons de la navigation pointent bien sur `/auth?mode=…`, et
 *      le membre connecté voit à la place la pastille de compte suivie du
 *      bouton « Se déconnecter » (croix) ;
 *   4. les garde-fous de source : le mode suit l'URL y compris quand le pop-up
 *      est déjà ouvert (effet sur `location.search`), et le fichier ne revient
 *      pas à un mode initial figé.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'auth-popup-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'vite',
    'build',
    '--ssr',
    'scripts/auth-popup-smoke.jsx',
    '--outDir',
    path.relative(root, outDir),
    '--emptyOutDir',
    '--logLevel',
    'error',
  ],
  { cwd: root, stdio: 'inherit' }
);

const { AUTH_MODES, modeFromSearch, readAuthMode, renderAuth, renderNav } = await import(
  path.join(outDir, 'auth-popup-smoke.js')
);

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}
function ok(label, condition, detail = '') {
  check(`${label}${detail ? ` (${detail})` : ''}`, Boolean(condition), true);
}

// Marqueurs du rendu anglais (copy de src/pages/Auth.jsx) — les deux
// formulaires n'ont aucun texte de bouton en commun, ce qui rend la lecture
// sans ambiguïté.
const SIGNUP_MARKERS = ['CREATE ACCOUNT', 'Gamertag', 'Confirm password'];
const SIGNIN_MARKER = 'SIGN IN';

function isSignup(html) {
  return SIGNUP_MARKERS.every((marker) => html.includes(marker)) && !html.includes(SIGNIN_MARKER);
}
function isSignin(html) {
  return html.includes(SIGNIN_MARKER) && !html.includes('CREATE ACCOUNT');
}
function formOf(html) {
  if (isSignup(html)) return 'signup';
  if (isSignin(html)) return 'signin';
  return 'inconnu';
}

/* --------------------------------------------- 1. Résolution du mode */

console.log('\n[1/4] lecture du mode : URL (les deux boutons) puis prop `/register`\n');

check('liste des modes acceptés', AUTH_MODES.join(', '), 'signin, signup');
check('?mode=signup (bouton S’inscrire)', readAuthMode('', '?mode=signup'), 'signup');
check('?mode=signin (bouton Se connecter)', readAuthMode('', '?mode=signin'), 'signin');
check('paramètre absent → connexion', readAuthMode('', ''), 'signin');
check('paramètre vide → connexion', readAuthMode('', '?mode='), 'signin');
check('valeur inconnue ignorée', readAuthMode('', '?mode=register'), 'signin');
check('paramètre noyé dans les autres', readAuthMode('', '?utm=x&mode=signup&q=1'), 'signup');
check('prop /register prioritaire', readAuthMode('signup', '?mode=signin'), 'signup');
check('prop « update » (lien de récupération) → connexion', readAuthMode('update', ''), 'signin');
check('modeFromSearch sans requête', modeFromSearch(undefined), '');
check('modeFromSearch valide', modeFromSearch('?mode=signup'), 'signup');

/* ------------------------------------------------ 2. Rendu réel (SSR) */

console.log('\n[2/4] le rendu ouvre le formulaire annoncé par l’URL\n');

const urls = [
  ['/auth?mode=signup (bouton S’inscrire)', { pathname: '/auth', search: '?mode=signup' }, 'signup'],
  ['/auth?mode=signin (bouton Se connecter)', { pathname: '/auth', search: '?mode=signin' }, 'signin'],
  ['/auth (aucun paramètre)', { pathname: '/auth' }, 'signin'],
  ['/auth?mode=inconnu (retour à la connexion)', { pathname: '/auth', search: '?mode=inconnu' }, 'signin'],
  ['/register (prop initialMode)', { pathname: '/register', initialMode: 'signup' }, 'signup'],
  ['/auth#access_token=…&type=recovery garde la connexion', { pathname: '/auth', hash: '#access_token=abc&type=recovery' }, 'signin'],
];

for (const [label, entry, expected] of urls) {
  let html = '';
  try {
    html = renderAuth(entry);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL ${label} → rendu en erreur : ${error.message}`);
    continue;
  }
  check(label, formOf(html), expected);
}

// Le pop-up d'inscription doit vraiment proposer le champ pseudo et la
// confirmation de mot de passe — pas seulement un titre différent.
const signupHtml = renderAuth({ pathname: '/auth', search: '?mode=signup' });
// React rend la prop telle quelle en SSR : `maxLength`, pas `maxlength`.
ok('le formulaire d’inscription demande le pseudo', /maxLength="24"/.test(signupHtml));
ok('l’inscription confirme le mot de passe', signupHtml.includes('Confirm password'));
ok('l’inscription masque « Mot de passe oublié ? »', !signupHtml.includes('Forgot password?'));
const signinHtml = renderAuth({ pathname: '/auth', search: '?mode=signin' });
ok('la connexion garde « Mot de passe oublié ? »', signinHtml.includes('Forgot password?'));

/* --------------------------------------- 3. Les boutons de la navigation */

console.log('\n[3/4] les boutons de la navbar : visiteur (mode) et membre connecté (Log out)\n');

const navHtml = renderNav();
ok('lien « Log in » → /auth?mode=signin', /href="\/auth\?mode=signin"/.test(navHtml));
ok('lien « Register » → /auth?mode=signup', /href="\/auth\?mode=signup"/.test(navHtml));
ok('visiteur : pas de bouton « Log out »', !/class="nav-logout"/.test(navHtml));

// Membre connecté : la pastille de compte remplace les deux liens et le bouton
// « Log out » (croix) ferme la rangée d'actions — donc tout à droite de la barre.
const connectedHtml = renderNav({
  session: { user: { id: 'smoke-user', email: 'smoke@letsplay.dz', user_metadata: { gamertag: 'SmokeDZ' } } },
});
ok('connecté : la pastille mène au hub /auth', /<a(?=[^>]*href="\/auth")(?=[^>]*class="nav-account connected")[^>]*>/.test(connectedHtml));
ok('connecté (desktop) : photo ou initiales dans la pastille', connectedHtml.includes('nav-account-avatar') && connectedHtml.includes('nav-account-initials'));
ok('connecté (desktop) : niveau affiché dans la pastille', /class="nav-account-level"[\s\S]*?<strong>1<\/strong>/.test(connectedHtml));
const logoutIndex = connectedHtml.search(/<button[^>]*class="nav-logout"/);
ok('connecté : bouton « Log out » présent', logoutIndex !== -1);
ok('connecté : le bouton porte le libellé « Log out »', /class="nav-logout"[^>]*aria-label="Log out"/.test(connectedHtml));
ok('connecté : icône croix (SVG) dans le bouton', /class="nav-logout-icon"/.test(connectedHtml));
ok('connecté : le bouton vient après la pastille de compte', logoutIndex > connectedHtml.indexOf('nav-account connected'));
ok('connecté : plus de lien « Log in » / « Register »', !/href="\/auth\?mode=(signin|signup)"/.test(connectedHtml));
const quizIndex = connectedHtml.indexOf('href="/quizz"');
const afterQuiz = connectedHtml.slice(quizIndex + 'href="/quizz"'.length);
const nextHref = afterQuiz.match(/href="([^"]+)"/);
ok('menu : le lien Profil vient juste après Quizz', nextHref?.[1] === '/auth' && afterQuiz.indexOf('nav-profile-link') !== -1 && afterQuiz.indexOf('nav-profile-link') < afterQuiz.indexOf('nav-actions'));
ok('menu : le lien Profil mène au hub /auth', /<a(?=[^>]*href="\/auth")(?=[^>]*class="[^"]*nav-profile-link)[^>]*>/.test(connectedHtml));
ok('menu : photo (ou initiales) du profil', connectedHtml.includes('nav-profile-avatar') && connectedHtml.includes('>SM<'));
ok('menu : niveau du profil affiché', /class="nav-profile-level"[\s\S]*?<strong>1<\/strong>/.test(connectedHtml));
const guestAfterQuiz = navHtml.slice(navHtml.indexOf('href="/quizz"') + 'href="/quizz"'.length);
ok('visiteur : le lien Profil est aussi sous Quizz et mène à la connexion', guestAfterQuiz.match(/href="([^"]+)"/)?.[1] === '/auth?mode=signin' && guestAfterQuiz.includes('nav-profile-link'));

/* ----------------------------------------- 4. Garde-fous de source */

console.log('\n[4/4] garde-fous dans le code\n');

const authSource = readFileSync(path.join(root, 'src', 'pages', 'Auth.jsx'), 'utf8');
const layoutSource = readFileSync(path.join(root, 'src', 'components', 'Layout.jsx'), 'utf8');

ok('le mode initial lit la requête', /readAuthMode\(initialMode, location\.search\)/.test(authSource));
ok(
  'l’URL est réécoutée : changer de bouton change de formulaire',
  /\[location\.state, location\.search\]/.test(authSource),
);
ok('le mode vient de l’URL, pas d’un « signin » figé', !/useState\(initialMode === 'update' \? 'signin' : initialMode\)/.test(authSource));
ok('la prop par défaut laisse l’URL décider', /initialMode = ''/.test(authSource));
ok('« Register » reste un lien vers ?mode=signup', /to="\/auth\?mode=signup"/.test(layoutSource));
ok('« Log in » reste un lien vers ?mode=signin', /to="\/auth\?mode=signin"/.test(layoutSource));

console.log(
  failures === 0
    ? '\nTout est bon : « S’inscrire » ouvre le formulaire d’inscription, « Se connecter » celui de connexion.\n'
    : `\n${failures} contrôle(s) en échec.\n`,
);

process.exit(failures === 0 ? 0 : 1);
