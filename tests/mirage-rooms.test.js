import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localRoomAction,
  resetLocalRoomsForTests,
  roomAction,
  roomCode,
} from '../src/games/mirageRooms.js';

const host = { id: 'user-host-1', name: 'Amine', connected: false };
const guest = { id: 'user-guest-2', name: 'Nadia', connected: false };

test('room list returns available lobby rooms with name and password indicator', async () => {
  resetLocalRoomsForTests({ seed: true });
  const res = await roomAction('list', null, {}, host);
  assert.ok(Array.isArray(res.rooms));
  assert.ok(res.rooms.length >= 2);
  const openRoom = res.rooms.find((r) => !r.has_password);
  const lockedRoom = res.rooms.find((r) => r.has_password);
  assert.ok(openRoom?.name);
  assert.ok(lockedRoom?.name);
});

test('creating a room allows custom name and empty password, starting player as not ready', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = await roomAction(
    'create',
    null,
    { p_stage: 'desert', p_name: 'Course du Soir', p_password: '' },
    host,
  );
  assert.equal(created.name, 'Course du Soir');
  assert.equal(created.has_password, false);
  assert.equal(created.stage, 'desert');
  assert.equal(created.status, 'lobby');
  assert.equal(created.players.length, 1);
  assert.equal(created.players[0].name, 'Amine');
  assert.equal(created.players[0].ready, false);

  // Guest can join without password
  const joined = await roomAction('join', created.code, { p_password: '' }, guest);
  assert.equal(joined.players.length, 2);
  assert.equal(joined.players[1].name, 'Nadia');
  assert.equal(joined.players[1].ready, false);
});

test('creating a room with a password enforces password on join', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = await roomAction(
    'create',
    null,
    { p_stage: 'western', p_name: 'Salon Secret', p_password: 'oasis' },
    host,
  );
  assert.equal(created.name, 'Salon Secret');
  assert.equal(created.has_password, true);

  await assert.rejects(
    () => roomAction('join', created.code, { p_password: '' }, guest),
    /Mot de passe incorrect/,
  );
  await assert.rejects(
    () => roomAction('join', created.code, { p_password: 'wrong' }, guest),
    /Mot de passe incorrect/,
  );

  const joined = await roomAction('join', created.code, { p_password: 'oasis' }, guest);
  assert.equal(joined.players.length, 2);
});

test('room chat allows players to communicate and coordinate before launching', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction(
    'create',
    null,
    { p_stage: 'prairie', p_name: 'Prairie Express', p_password: '' },
    host,
  );
  localRoomAction('join', created.code, {}, guest);

  assert.throws(
    () => localRoomAction('chat', created.code, { p_message: '   ' }, host),
    /Message vide/,
  );

  const afterHostMsg = localRoomAction(
    'chat',
    created.code,
    { p_message: 'Salut Nadia, prête pour 600m ?' },
    host,
  );
  const afterGuestMsg = localRoomAction(
    'chat',
    created.code,
    { p_message: 'Oui je me mets prête !' },
    guest,
  );

  const bodies = afterGuestMsg.messages.map((m) => m.body);
  assert.ok(bodies.includes('Salut Nadia, prête pour 600m ?'));
  assert.ok(bodies.includes('Oui je me mets prête !'));
});

test('players must set ready status before host can launch the game', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction(
    'create',
    null,
    { p_stage: 'desert', p_name: 'Duel des Sables', p_password: '' },
    host,
  );
  localRoomAction('join', created.code, {}, guest);

  // Neither player is ready yet
  assert.throws(
    () => localRoomAction('start', created.code, {}, host),
    /Tous les joueurs doivent être prêts/,
  );

  // Host becomes ready, guest still not ready
  const hostReadyState = localRoomAction('ready', created.code, { p_ready: true }, host);
  assert.equal(hostReadyState.players.find((p) => p.user_id === host.id).ready, true);
  assert.equal(hostReadyState.players.find((p) => p.user_id === guest.id).ready, false);

  assert.throws(
    () => localRoomAction('start', created.code, {}, host),
    /Tous les joueurs doivent être prêts/,
  );

  // Guest becomes ready
  const allReadyState = localRoomAction('ready', created.code, { p_ready: true }, guest);
  assert.ok(allReadyState.players.every((p) => p.ready));

  // Non-host cannot start
  assert.throws(
    () => localRoomAction('start', created.code, {}, guest),
    /Seul l’hôte peut lancer la partie/,
  );

  // Host starts the game
  const started = localRoomAction('start', created.code, {}, host);
  assert.equal(started.status, 'started');
  assert.ok(started.started_at);
  assert.equal(roomCode(started.code).length, 8);
});

test('characters are shared in the lobby and locked as soon as the host starts', async () => {
  resetLocalRoomsForTests({ seed: false });
  const room = await roomAction('create', null, { p_stage: 'desert' }, host);
  await roomAction('join', room.code, {}, guest);
  await roomAction('ready', room.code, { p_ready: true }, guest);
  const cloudChoice = await roomAction('character', room.code, { p_character: 5 }, host);
  assert.equal(cloudChoice.players[0].character, 5, 'Cloud is selectable in the online lobby');
  const chosen = await roomAction('character', room.code, { p_character: 3 }, guest);
  assert.equal(chosen.players[1].character, 3);
  assert.equal(chosen.players[1].ready, false);
  assert.equal((await roomAction('get', room.code, {}, host)).players[1].character, 3);
  for (const invalid of [-1, 4, 1.5, null, '2']) {
    await assert.rejects(() => roomAction('character', room.code, { p_character: invalid }, guest), /Personnage inconnu/);
  }
  await roomAction('ready', room.code, { p_ready: true }, host);
  await roomAction('ready', room.code, { p_ready: true }, guest);
  await roomAction('start', room.code, {}, host);
  await assert.rejects(() => roomAction('character', room.code, { p_character: 0 }, guest), /verrouillé/);
  assert.equal((await roomAction('get', room.code, {}, host)).players[1].character, 3);
});

test('Cloud room powers carry their custom identity and exact 1.5 / 2.5 second durations', () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'desert' }, host);
  localRoomAction('join', created.code, {}, guest);
  localRoomAction('character', created.code, { p_character: 5 }, host);
  localRoomAction('ready', created.code, { p_ready: true }, host);
  localRoomAction('ready', created.code, { p_ready: true }, guest);
  localRoomAction('start', created.code, {}, host);

  const yellow = localRoomAction('lasso', created.code, { p_target_id: guest.id }, host);
  const slowed = yellow.players.find((player) => player.user_id === guest.id);
  assert.equal(slowed.slow_effect, 'cloud-wave');
  assert.equal(Date.parse(slowed.slowed_until) - Date.parse(yellow.server_now), 1500);

  const red = localRoomAction('pistol', created.code, { p_target_id: guest.id }, host);
  const fallen = red.players.find((player) => player.user_id === guest.id);
  assert.equal(fallen.stun_effect, 'cloud-cross');
  assert.equal(Date.parse(fallen.stunned_until) - Date.parse(red.server_now), 2500);

  const standard = localRoomAction('pistol', created.code, { p_target_id: host.id }, guest);
  const standardTarget = standard.players.find((player) => player.user_id === host.id);
  assert.equal(standardTarget.stun_effect, 'pistol', 'other characters keep the standard pistol identity');
  assert.equal(Date.parse(standardTarget.stunned_until) - Date.parse(standard.server_now), 2500);
});

test('rooms accept lane 3 for positions and finishes, but reject invalid lane indices', (t) => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'desert' }, host);
  localRoomAction('join', created.code, {}, guest);
  localRoomAction('ready', created.code, { p_ready: true }, host);
  localRoomAction('ready', created.code, { p_ready: true }, guest);
  const started = localRoomAction('start', created.code, {}, host);
  t.mock.method(Date, 'now', () => Date.parse(started.started_at) + 1000);
  const position = { p_distance: 20, p_lane: 3, p_jump: 0, p_score: 150 };
  const updated = localRoomAction('tick', created.code, position, host);
  assert.equal(updated.players.find(p => p.user_id === host.id).lane, 3);
  for (const lane of [-1, 4, 1.5, NaN, Infinity]) {
    assert.throws(() => localRoomAction('tick', created.code, { ...position, p_lane: lane }, host), /Position invalide/);
  }
  const finished = localRoomAction('finish', created.code, { ...position, p_distance: 800 }, host);
  const player = finished.players.find(p => p.user_id === host.id);
  assert.equal(player.lane, 3);
  assert.equal(player.distance, 800);
  assert.ok(player.finished_at);
});

test('pistol knocks the target off for 2.5 seconds; a shield stops the bullet', async () => {
  resetLocalRoomsForTests({ seed: false });
  const room = localRoomAction('create', null, { p_stage: 'desert', p_name: 'Duel', p_password: '' }, host);
  localRoomAction('join', room.code, {}, guest);
  localRoomAction('ready', room.code, { p_ready: true }, host);
  localRoomAction('ready', room.code, { p_ready: true }, guest);
  localRoomAction('start', room.code, {}, host);
  const shot = localRoomAction('pistol', room.code, { p_target_id: guest.id }, host);
  const target = shot.players.find(p => p.user_id === guest.id);
  const left = Date.parse(target.stunned_until) - Date.now();
  assert.ok(left > 2400 && left <= 2500, `stun ${left} ms`);
  localRoomAction('shield', room.code, {}, guest);
  const blocked = localRoomAction('pistol', room.code, { p_target_id: guest.id }, host);
  assert.equal(blocked.players.find(p => p.user_id === guest.id).shield_until, null);
  assert.throws(() => localRoomAction('pistol', room.code, { p_target_id: 'nobody' }, host));
});

test('a room can be created on the alger stage and rejects unknown maps', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'alger', p_name: 'Baie d’Alger', p_password: '' }, host);
  assert.equal(created.stage, 'alger');
  assert.equal(created.name, 'Baie d’Alger');
  assert.throws(() => localRoomAction('create', null, { p_stage: 'atlantis' }, host), /Carte inconnue/);
});

test('a room can be created on the ramparts stage', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'ramparts', p_name: 'Rush B', p_password: '' }, host);
  assert.equal(created.stage, 'ramparts');
  assert.equal(created.name, 'Rush B');
});

test('a room can be created on the infinity stage', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'infinity', p_name: 'Château Infini', p_password: '' }, host);
  assert.equal(created.stage, 'infinity');
  assert.equal(created.name, 'Château Infini');
});

test('a room can be created on the airbase stage', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'airbase', p_name: 'Sonic Boom', p_password: '' }, host);
  assert.equal(created.stage, 'airbase');
  assert.equal(created.name, 'Sonic Boom');
});

test('a room can be created on the Snake Way stage', async () => {
  resetLocalRoomsForTests({ seed: false });
  const created = localRoomAction('create', null, { p_stage: 'snakeway', p_name: 'Chemin du Serpent', p_password: '' }, host);
  assert.equal(created.stage, 'snakeway');
  assert.equal(created.name, 'Chemin du Serpent');
});
