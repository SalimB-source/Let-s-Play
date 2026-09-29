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
