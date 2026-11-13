import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { RPG_AVATAR_IDS } from '../src/games/rpgAvatars.js';
import { RPG_STORY_OPPONENT_CAST } from '../src/games/rpgStoryCast.js';
import { avatarDuel, RPG_AVATARS_DUEL_IDS } from '../src/games/rpgDuelAvatars.js';

const dossier = new URL('../public/sablier-story/avatars/', import.meta.url);

test('chaque adversaire du récit et chaque avatar de profil a un visage de duel', () => {
  for (const id of [...RPG_AVATAR_IDS, ...Object.values(RPG_STORY_OPPONENT_CAST)]) {
    assert.ok(avatarDuel(id, '/Let-s-Play/'), `visage absent : ${id}`);
  }
  assert.equal(avatarDuel(null), null);
  assert.equal(avatarDuel('absent'), null);
  assert.equal(avatarDuel('../salem'), null);
  assert.equal(avatarDuel('salem', '/base/'), '/base/sablier-story/avatars/avatar-salem.webp?v=duel-tetes-1');
});

test('les têtes livrées sont des WebP carrés avec canal alpha', () => {
  const fichiers = readdirSync(dossier).filter((nom) => nom.endsWith('.webp')).sort();
  assert.deepEqual(fichiers, RPG_AVATARS_DUEL_IDS.map((id) => `avatar-${id}.webp`).sort());
  for (const fichier of fichiers) {
    const octets = readFileSync(new URL(fichier, dossier));
    assert.equal(octets.toString('ascii', 0, 4), 'RIFF', fichier);
    assert.equal(octets.toString('ascii', 8, 16), 'WEBPVP8X', fichier);
    assert.equal(octets[20] & 0x10, 0x10, `${fichier} a un canal alpha`);
    assert.equal(octets.readUIntLE(24, 3) + 1, 192, fichier);
    assert.equal(octets.readUIntLE(27, 3) + 1, 192, fichier);
  }
});
