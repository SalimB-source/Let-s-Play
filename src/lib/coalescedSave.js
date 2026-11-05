/**
 * Sérialise les écritures par compte. Pendant une écriture, conserve seulement
 * le dernier instantané en attente. Les comptes ne partagent jamais de file.
 * Pas de minuterie : l'écriture démarre aussitôt, la copie locale restant la
 * source de travail si la page se ferme ou si le réseau échoue.
 */
export function createCoalescedSave(write) {
  const queues = new Map();
  return (key, value) => new Promise((resolve) => {
    let queue = queues.get(key);
    if (!queue) {
      queue = { pending: null, running: false };
      queues.set(key, queue);
    }
    if (queue.pending) {
      queue.pending.value = value;
      queue.pending.waiters.push(resolve);
    } else {
      queue.pending = { value, waiters: [resolve] };
    }
    if (queue.running) return;
    queue.running = true;
    const drain = async () => {
      while (queue.pending) {
        const next = queue.pending;
        queue.pending = null;
        let result;
        try { result = await write(key, next.value); } catch { result = null; }
        for (const done of next.waiters) done(result);
      }
      queue.running = false;
      queues.delete(key);
    };
    void drain();
  });
}
