/**
 * Static regression check for signup anti-abuse controls.
 *
 * The CAPTCHA is optional until the deployment is configured, but once a
 * Turnstile site key exists the browser must render the challenge and pass its
 * one-time token to Supabase Auth. This check keeps the client wiring,
 * deployment variable and provider documentation from drifting apart.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(path.join(root, ...parts), 'utf8');
const auth = read('src', 'pages', 'Auth.jsx');
const protection = read('src', 'components', 'SignupProtection.jsx');
const supabase = read('src', 'lib', 'supabase.js');
const workflow = read('.github', 'workflows', 'deploy.yml');
const readme = read('README.md');

const checks = [
  ['le formulaire contient un honeypot hors écran', auth.includes('name="website"') && auth.includes('auth-honeypot')],
  ['le formulaire exige le CAPTCHA lorsqu’une site key existe', auth.includes('turnstileSiteKey && !captchaToken')],
  ['le jeton est envoyé à Supabase signUp', auth.includes('...(captchaToken ? { captchaToken } : {})')],
  ['le jeton est invalidé après chaque tentative', auth.includes('Turnstile tokens are single-use')],
  ['le widget est rendu avec la site key', protection.includes('turnstile.render') && protection.includes('sitekey: siteKey')],
  ['le widget expire et efface le jeton', protection.includes("'expired-callback'") && protection.includes("onTokenChangeRef.current?.('')")],
  ['la variable publique est lue au build', supabase.includes('VITE_TURNSTILE_SITE_KEY')],
  ['Pages transmet la variable publique', workflow.includes('VITE_TURNSTILE_SITE_KEY')],
  ['la documentation rappelle la configuration serveur Supabase', readme.includes('Authentication → CAPTCHA')],
];

let failures = 0;
for (const [label, passed] of checks) {
  if (!passed) failures += 1;
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${label}`);
}

if (failures) {
  console.error(`\n${failures} contrôle(s) anti-bot en échec.`);
  process.exit(1);
}
console.log('\nProtection des inscriptions : câblage client, déploiement et documentation cohérents.');
