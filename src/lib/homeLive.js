/** Ne jamais afficher de lecteur pour une réponse incertaine ou mal formée. */
export function confirmedLiveVideoId(data) {
  return data?.status === 'live' && typeof data.videoId === 'string'
    && /^[A-Za-z0-9_-]{11}$/.test(data.videoId) ? data.videoId : null;
}

/** Navigation explicite : respecte la préférence de réduction des animations. */
export function scrollToHomeLive(event) {
  const section = document.getElementById('live');
  if (!section) return;
  event.preventDefault();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
  section.focus({ preventScroll: true });
}
