import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrivingFeedbackAudio, drivingFeedbackEvent } from '../src/games/drivingFeedbackAudio.js';
const session = (checkpoint = 0, faults = [], status = 'active') => ({ checkpoint, faults, status });
test('validation fires on stage advancement, including the last stage, not idle telemetry', () => {
  assert.equal(drivingFeedbackEvent(session(), session(1)), 'success');
  assert.equal(drivingFeedbackEvent(session(2), session(3, [], 'completed')), 'success');
  assert.equal(drivingFeedbackEvent(session(1), session(1)), null);
  assert.equal(drivingFeedbackEvent(session(3, [], 'completed'), session(3, [], 'completed')), null);
});
test('new faults play an error, old faults do not repeat; error wins over simultaneous validation', () => {
  assert.equal(drivingFeedbackEvent(session(), session(0, ['fault'])), 'error');
  assert.equal(drivingFeedbackEvent(session(0, ['fault']), session(0, ['fault'])), null);
  assert.equal(drivingFeedbackEvent(session(), session(1, ['fault'])), 'error');
  assert.equal(drivingFeedbackEvent(null, session()), null);
});
function fakeContext() {
  const notes = [];
  return { state: 'running', currentTime: 5, destination: {}, notes, closed: false,
    createOscillator() { const note = { frequency: { setValueAtTime: value => { note.hz = value; } }, connect() {}, disconnect() {}, start() {}, stop() {} }; notes.push(note); return note; },
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; },
    close() { this.closed = true; return Promise.resolve(); },
  };
}
test('success and error have distinct tones; the current mute preference is respected', () => {
  const context = fakeContext(); let enabled = true;
  const audio = createDrivingFeedbackAudio({ createContext: () => context, isEnabled: () => enabled });
  audio.unlock(); audio.play('success');
  assert.deepEqual(context.notes.map(note => note.hz), [659.25, 880]);
  enabled = false; audio.play('error'); assert.equal(context.notes.length, 2);
  enabled = true; audio.play('error');
  assert.deepEqual(context.notes.slice(2).map(note => note.hz), [220, 164.81]);
  audio.play(null); assert.equal(context.notes.length, 4);
  audio.dispose(); assert.equal(context.closed, true);
});
test('missing audio support or blocked audio never breaks an exercise', () => {
  const audio = createDrivingFeedbackAudio({ createContext: () => { throw Error('blocked'); }, isEnabled: () => true });
  assert.doesNotThrow(() => { audio.unlock(); audio.play('error'); audio.dispose(); });
});
