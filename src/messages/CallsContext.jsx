import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useFriends } from '../friends/FriendsContext';
import { useMessages } from './MessagesContext';
import { useLanguage } from '../i18n/LanguageContext';
import { playConnectTone, playEndTone, startRingback, startRingtone } from './callSounds';
import { sendMessage } from './messagesApi';
import { callsText, callSummaryText, describeCallError, callBlockLabel } from './callsCopy';
import {
  CALL_KINDS,
  CHANNELS_DROP_DELAY_MS,
  CHANNEL_JOIN_TIMEOUT_MS,
  CONNECT_TIMEOUT_MS,
  DISCONNECT_GRACE_MS,
  ENDED_TOAST_MS,
  END_BUSY,
  END_CANCELLED,
  END_DECLINED,
  END_FAILED,
  END_HUNG_UP,
  END_LOST,
  END_NO_ANSWER,
  INCOMING_TIMEOUT_MS,
  NOTICE_MS,
  OUTGOING_TIMEOUT_MS,
  RING_DEDUP_MS,
  RING_HOLD_MS,
  RING_IGNORE,
  RING_WAIT,
  classifyMediaError,
  createCallId,
  formatDuration,
  iceServersFromEnv,
  inboxChannelFor,
  isCallEvent,
  isEmbedded,
  makeCallEvent,
  normalizeCallKind,
  permissionFailureKind,
  ringDecision,
  turnConfigured,
} from './callsCore';

/**
 * Haut-parleur pendant l'appel. Sur téléphone, un appel vocal (micro avec
 * annulation d'écho) part dans l'écouteur : à côté d'un appel vidéo qui sort
 * du haut-parleur, on croit que « le vocal ne marche pas ». Le pont natif
 * n'existe que dans l'APK ; le navigateur ignore l'appel.
 */
function preferLoudspeaker() {
  try {
    window.LetsPlayAndroid?.setCallAudio?.(true);
  } catch (e) { /* navigateur : pas de pont */ }
}

function releaseLoudspeaker() {
  try {
    window.LetsPlayAndroid?.setCallAudio?.(false);
  } catch (e) { /* idem */ }
}

/** Refus explicite : inutile de redemander (même erreur, ou second pop-up). */
function mediaDenied(error) {
  const name = String(error?.name || '');
  return name === 'NotAllowedError' || name === 'SecurityError' || error?.code === 1;
}

/**
 * Contexte des appels vocaux / vidéo — le pendant « téléphone » de la
 * messagerie.
 * ---------------------------------------------------------------------------
 * Un appel 1-à-1 entre **amis** se joue à trois niveaux :
 *
 *   1. **Signalisation** — Supabase Realtime (Broadcast, aucune table ni
 *      serveur en plus). Invariant simple : on **écoute** uniquement son
 *      canal personnel `calls:user:{uid}` (rejoint en permanence dès la
 *      connexion) et on **envoie** toujours sur le canal du destinataire
 *      (rejoint le temps de l'échange). Chaque événement porte `{v, t,
 *      callId, from, to}` et est validé à l'arrivée : mauvais destinataire,
 *      mauvais appel, inconnu → ignoré ; le lien d'amitié et le blocage sont
 *      revérifiés côté destinataire avant toute sonnerie.
 *   2. **Médias** — WebRTC pair-à-pair (`getUserMedia` + `RTCPeerConnection`,
 *      STUN public + TURN optionnel par variables d'environnement, voir
 *      `callsCore.iceServersFromEnv`) : le son et l'image ne passent JAMAIS
 *      par un serveur.
 *   3. **État exposé** — `phase` (`idle → incoming/outgoing → connecting →
 *      active → ended → idle`), la sorte d'appel (`audio` / `video`), les
 *      flux locaux et distants (pour les `<video>`), le micro / la caméra, la
 *      durée et le motif de fin. `blockerFor(peerId)` renvoie la raison pour
 *      laquelle on ne peut PAS appeler ce joueur (hors ligne, démo, HTTPS
 *      manquant…) ou `null` — c'est lui qui graisse les boutons d'appel de
 *      l'en-tête de discussion.
 *
 * Scénario : l'appelant obtient micro/caméra (la permission est demandée
 * AVANT de sonner), joint le canal de l'ami et diffuse `ring` ; l'ami voit
 * l'appel entrant (sonnerie) et répond `accept` / `decline` / `busy` (occupé :
 * déjà en appel) ; l'appelant envoie alors l'offre SDP, les candidats ICE
 * circulent, la connexion P2P s'établit. À la fin, l'appelant dépose une
 * **trace d'appel** dans la discussion (message normal via
 * `direct_messages` : « 📞 Appel vidéo · 02:14 », « sans réponse », « refusé »,
 * « occupé ») — non-lus, temps réel et suppression fonctionnent d'eux-mêmes.
 *
 * Rien ne doit se perdre en silence — c'est ce qui fait croire que « les
 * appels ne marchent pas » :
 *   - une sonnerie reçue AVANT que la liste d'amis soit chargée est gardée et
 *     rejouée dès qu'elle arrive (`ringDecision` → `RING_WAIT`) : le pop-up
 *     d'appel entrant s'affiche au lieu de ne jamais apparaître ;
 *   - un appel impossible explique sa raison (`notice`, rendu par
 *     `CallOverlays`) au lieu de ne rien produire ;
 *   - un échec de connexion pair-à-pair pointe le relais TURN manquant ;
 *   - un ami qui semble hors ligne n'empêche plus d'appeler : la présence est
 *     une estimation, l'appel sonne et conclut « Sans réponse » le cas
 *     échéant (`warningFor` plutôt que `blockerFor`).
 *
 * Dégradations propres : personas de démo, Supabase non configuré, page non
 * sécurisée (HTTP) ou navigateur sans WebRTC → `blockerFor` l'explique et les
 * boutons sont grisés ; caméra refusée sur un appel vidéo → l'appel continue
 * en audio ; permission refusée → motif lisible dans le panneau.
 *
 * Le contexte par défaut est *inerte* (pas de provider = pas d'erreur), comme
 * les contextes amis et messages : les scripts de vérification rendent les
 * pages sans appels.
 */

const noop = () => {};
const asyncNoop = async () => {};

export const CallsContext = createContext({
  enabled: false,
  unavailableReason: 'supabase',
  blockerFor: () => 'supabase',
  warningFor: () => null,
  phase: 'idle',
  role: null,
  kind: 'audio',
  peer: null,
  micOn: true,
  camOn: false,
  connected: false,
  elapsedMs: 0,
  endReason: null,
  endDetail: null,
  notice: null,
  localStream: null,
  remoteStream: null,
  startCall: asyncNoop,
  acceptCall: asyncNoop,
  declineCall: noop,
  endCall: noop,
  toggleMic: noop,
  toggleCam: noop,
  flipCamera: asyncNoop,
  dismissNotice: noop,
});

/** Profils rendus par le contexte : { id, name, avatar } minimal et stable. */
function peerProfile(profileFor, id) {
  const profile = profileFor(id);
  if (profile?.name) return { id, name: profile.name, avatar: profile.avatar || null };
  return { id, name: String(id).slice(0, 8), avatar: null };
}

export function CallsProvider({ children }) {
  const { user, isDemo } = useAuth();
  const friends = useFriends();
  const messages = useMessages();
  const { lang } = useLanguage();
  const uid = user?.id ? String(user.id) : null;
  const mode = !uid ? 'none' : isDemo ? 'demo' : supabase ? 'supabase' : 'none';

  // WebRTC exige un contexte sécurisé (HTTPS ou localhost) et les API micro /
  // caméra. Partout ailleurs, les boutons d'appel s'expliquent au survol.
  const webrtcReady = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    return Boolean(RTCPeerConnection && navigator?.mediaDevices?.getUserMedia);
  }, []);
  const secure = useMemo(() => (typeof window === 'undefined' ? false : window.isSecureContext !== false), []);
  const enabled = mode === 'supabase' && webrtcReady && secure;
  const unavailableReason = mode === 'demo'
    ? 'demo'
    : mode !== 'supabase'
      ? 'supabase'
      : !secure
        ? 'insecure'
        : !webrtcReady
          ? 'nowebrtc'
          : null;

  /* ------------------------------- état React ------------------------------ */

  const [phase, setPhase] = useState('idle');
  const [role, setRole] = useState(null);
  const [kind, setKind] = useState('audio');
  const [peer, setPeer] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [nowTick, setNowTick] = useState(0);
  const [endReason, setEndReason] = useState(null);
  const [endDetail, setEndDetail] = useState(null);
  const [notice, setNotice] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  /* ------------------------- références de la machine ---------------------- */

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const phaseRef = useRef('idle');
  const applyPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const uidRef = useRef(uid);
  useEffect(() => { uidRef.current = uid; }, [uid]);
  /** Le début de l'appel sert de point zéro à la durée. */
  const startedAtRef = useRef(null);
  useEffect(() => { startedAtRef.current = startedAt; }, [startedAt]);

  /** L'appel courant : { callId, peerId, kind, role } — null au repos. */
  const callRef = useRef(null);
  /** Le callId de la dernière sonnerie vue (anti-rejeu réseau). */
  const lastRingRef = useRef({ callId: null, at: 0 });
  /**
   * Sonnerie arrivée AVANT que la liste d'amis soit chargée (site ouvert à
   * l'instant, connexion toute fraîche) : `{ payload, at }`. La rejeter là
   * perdrait l'appel pour de bon — l'appelé ne verrait jamais le pop-up.
   */
  const pendingRingRef = useRef(null);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const pendingIceRef = useRef([]);
  const pendingOfferRef = useRef(null);
  /** Canaux rejoints : Map(name → { channel, ready, pending, permanent }). */
  const channelsRef = useRef(new Map());
  const ownInboxRef = useRef(null);
  const soundsStopRef = useRef(null);
  const timersRef = useRef({ ring: null, incoming: null, connect: null, grace: null, ended: null, channels: null, notice: null });
  /** La trace d'appel est-elle déjà déposée pour cet appel ? */
  const summaryDoneRef = useRef(false);

  const clearTimer = useCallback((name) => {
    if (timersRef.current[name]) {
      clearTimeout(timersRef.current[name]);
      timersRef.current[name] = null;
    }
  }, []);

  const stopSounds = useCallback(() => {
    if (soundsStopRef.current) {
      try { soundsStopRef.current(); } catch (e) { /* déjà arrêté */ }
      soundsStopRef.current = null;
    }
  }, []);

  /* ------------------------------ canaux Realtime --------------------------- */

  /**
   * Rejoint un canal de signalisation et attend la confirmation `SUBSCRIBED`
   * (un `send()` sur un canal non joint serait perdu) ; renvoie le canal ou
   * null. Le canal personnel (`permanent`) n'est jamais retiré.
   *
   * Deux pièges évités ici, tous deux invisibles à l'écran :
   *   - un canal déjà en cours de jointure par un autre chemin (le canal
   *     personnel, monté par effet) n'a pas encore de promesse : on attend sa
   *     confirmation au lieu de renvoyer `null` et de perdre l'événement ;
   *   - une jointure qui échoue (réseau, délai) est OUBLIÉE : sans ça, le
   *     canal resterait en échec pour toute la session et plus aucun
   *     événement ne partirait vers cet ami.
   */
  const ensureChannel = useCallback((name, permanent = false) => {
    if (!supabase || !name) return Promise.resolve(null);
    const existing = channelsRef.current.get(name);
    if (existing) {
      if (existing.ready) return Promise.resolve(existing.channel);
      if (existing.pending) return existing.pending;
      return new Promise((resolve) => {
        const startedAt = Date.now();
        const watch = setInterval(() => {
          if (existing.ready) { clearInterval(watch); resolve(existing.channel); return; }
          if (channelsRef.current.get(name) !== existing) { clearInterval(watch); resolve(null); return; }
          if (Date.now() - startedAt > CHANNEL_JOIN_TIMEOUT_MS) { clearInterval(watch); resolve(null); }
        }, 50);
      });
    }
    // Le canal personnel n'est jamais retiré, même rejoint par un autre chemin.
    const isOwnInbox = name === inboxChannelFor(uidRef.current);
    const entry = { channel: null, ready: false, pending: null, permanent: permanent || isOwnInbox };
    const pending = new Promise((resolve) => {
      let settled = false;
      const succeed = () => {
        if (settled) return;
        settled = true;
        resolve(entry.channel);
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        if (channelsRef.current.get(name) === entry) channelsRef.current.delete(name);
        const channel = entry.channel;
        entry.channel = null;
        if (channel) {
          try { supabase?.removeChannel(channel); } catch (e) { /* déjà retiré */ }
        }
        resolve(null);
      };
      try {
        const channel = supabase.channel(name);
        entry.channel = channel;
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            entry.ready = true;
            succeed();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            fail();
          }
        });
      } catch (e) {
        fail();
      }
      setTimeout(() => {
        if (entry.ready) succeed();
        else fail();
      }, CHANNEL_JOIN_TIMEOUT_MS);
    });
    entry.pending = pending;
    channelsRef.current.set(name, entry);
    return pending;
  }, []);

  /** Envoie un événement sur le canal du destinataire (joint au besoin). */
  const sendEvent = useCallback((toUid, payload) => {
    if (!supabase || !toUid) return;
    const name = inboxChannelFor(toUid);
    ensureChannel(name).then((channel) => {
      try { channel?.send({ type: 'broadcast', event: 'call', payload }); } catch (e) { /* appel raté, pas un crash */ }
    }).catch(() => { /* idem */ });
  }, [ensureChannel]);

  /** Événement complet vers l'interlocuteur de l'appel courant. */
  const sendToPeer = useCallback((type, extra = {}) => {
    const call = callRef.current;
    if (!call || !uid) return;
    sendEvent(call.peerId, makeCallEvent(type, { callId: call.callId, from: uid, to: call.peerId, ...extra }));
  }, [uid, sendEvent]);

  /* --------------------------------- nettoyage ------------------------------ */

  const stopLocalTracks = useCallback(() => {
    const stream = localRef.current;
    localRef.current = null;
    if (stream) {
      for (const track of stream.getTracks()) {
        try { track.stop(); } catch (e) { /* déjà arrêté */ }
      }
    }
    setLocalStream(null);
    releaseLoudspeaker();
  }, []);

  const closePeerConnection = useCallback(() => {
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      try { pc.ontrack = null; pc.onicecandidate = null; pc.onconnectionstatechange = null; } catch (e) { /* ignore */ }
      try { pc.close(); } catch (e) { /* déjà fermé */ }
    }
    setRemoteStream(null);
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
  }, []);

  /** Retire les canaux rejoints pour l'appel (le canal personnel reste). */
  const dropCallChannels = useCallback(() => {
    for (const [name, entry] of [...channelsRef.current.entries()]) {
      if (entry.permanent) continue;
      channelsRef.current.delete(name);
      try { supabase?.removeChannel(entry.channel); } catch (e) { /* ignore */ }
    }
  }, []);

  /* ------------------------------- trace d'appel ---------------------------- */

  /**
   * Dépose le message « 📞 Appel vidéo · 02:14 » dans la discussion — côté
   * APPELANT seulement (les deux joueurs vivent les mêmes événements réseau :
   * sans ce garde, la trace serait en double), une seule fois par appel.
   * Best-effort : un échec ne change rien à la fin de l'appel.
   */
  const insertCallSummary = useCallback((outcome, durationMs = 0) => {
    if (mode !== 'supabase' || summaryDoneRef.current) return;
    const call = callRef.current;
    if (!call?.peerId || !uid || call.role !== 'caller') return;
    summaryDoneRef.current = true;
    const t = callsText(langRef.current);
    const body = callSummaryText(t, call.kind, outcome, formatDuration(durationMs));
    sendMessage(uid, call.peerId, body).catch(() => { /* la trace est un plus */ });
  }, [mode, uid]);

  /* ---------------------------- fin d'appel (locale) ------------------------ */

  /**
   * Termine l'appel côté machine locale : sons coupés, flux et connexions
   * fermés, canaux d'appel retirés, phase `ended` avec son motif, puis retour
   * au calme (`idle`) après un court instant. Aucun événement n'est envoyé
   * ici : chaque scénario (raccrocher, refus, expiration…) s'en charge avant.
   */
  const finish = useCallback((reason, detail = null, { silent = false } = {}) => {
    // Déjà terminé (ou déjà au repos) : rien à finir deux fois — un événement
    // « bye » et une connexion qui échoue peuvent arriver dans le même souffle.
    if (phaseRef.current === 'idle' || phaseRef.current === 'ended') return;
    for (const name of ['ring', 'incoming', 'connect', 'grace']) clearTimer(name);
    stopSounds();
    if (!silent) playEndTone();
    closePeerConnection();
    stopLocalTracks();
    // Les canaux d'appel sont quittés AVEC UN COURT DÉLAI : le « bye » ou le
    // « cancel » parti à l'instant doit atteindre le canal (joint) avant qu'on
    // ne le retire — un send sur un canal fermé serait perdu.
    clearTimer('channels');
    timersRef.current.channels = setTimeout(() => {
      timersRef.current.channels = null;
      if (mountedRef.current) dropCallChannels();
    }, CHANNELS_DROP_DELAY_MS);
    callRef.current = null;
    setConnected(false);
    setStartedAt(null);
    setEndReason(reason);
    setEndDetail(detail);
    applyPhase('ended');
    clearTimer('ended');
    timersRef.current.ended = setTimeout(() => {
      if (!mountedRef.current) return;
      applyPhase('idle');
      setEndReason(null);
      setEndDetail(null);
      setPeer(null);
      setRole(null);
    }, ENDED_TOAST_MS);
  }, [clearTimer, stopSounds, closePeerConnection, stopLocalTracks, dropCallChannels, applyPhase]);

  /**
   * Motif lisible d'un échec de connexion pair-à-pair : sans relais TURN, les
   * réseaux mobiles et les Wi-Fi fermés ne laissent pas passer les médias.
   */
  const connectFailureDetail = useCallback(() => (turnConfigured() ? null : callsText(langRef.current).hintTurn), []);

  /* ------------------------------ médias (locales) -------------------------- */

  /**
   * Demande micro (+ caméra pour un appel vidéo). La caméra est facultative :
   * si elle refuse sur un appel vidéo, on continue en audio (l'appel
   * « descend » d'un cran) plutôt que d'échouer.
   *
   * L'appel vocal ne passe pas `video: false` : sur certaines WebView Android,
   * cette contrainte fait échouer le micro alors que le même micro, demandé
   * avec la caméra, fonctionne — d'où « la vidéo marche, le vocal non ».
   * Si les contraintes de traitement (écho, bruit) sont refusées, on retente
   * un micro nu, sauf refus explicite de permission.
   */
  const acquireMedia = useCallback(async (wantedKind) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error('calls_no_media_api'), { callError: 'nowebrtc' });
    }
    const processed = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const openMic = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: processed });
      } catch (e) {
        if (mediaDenied(e)) throw e;
        return navigator.mediaDevices.getUserMedia({ audio: true });
      }
    };
    if (wantedKind !== 'video') {
      return { stream: await openMic(), kind: 'audio' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: processed,
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      return { stream, kind: 'video' };
    } catch (e) {
      // Pas de caméra (refusée, absente, occupée) : l'appel continue en audio.
      return { stream: await openMic(), kind: 'audio' };
    }
  }, []);

  /** Construit la connexion P2P de l'appel courant et branche ses événements. */
  const buildPeerConnection = useCallback((callId) => {
    const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    const pc = new RTCPeerConnection({ iceServers: iceServersFromEnv() });
    pcRef.current = pc;

    // Candidats ICE → l'ami (trickle : chaque candidat part dès qu'il sort).
    pc.onicecandidate = (event) => {
      if (callRef.current?.callId !== callId) return;
      if (event.candidate) sendToPeer('ice', { candidate: event.candidate.toJSON() });
    };

    // Les pistes de l'ami arrivent : on les expose à l'interface (<video>).
    // Certains navigateurs émettent un événement par piste, parfois avec un
    // flux différent : on accumule, sinon la voix peut être écrasée par
    // l'image (ou l'inverse) et l'appel vocal reste muet.
    const remoteMedia = { current: null };
    pc.ontrack = (event) => {
      if (callRef.current?.callId !== callId) return;
      const track = event.track;
      const incoming = event.streams?.[0];
      let media = remoteMedia.current;
      if (!media) {
        media = incoming || new MediaStream();
        remoteMedia.current = media;
      } else if (incoming && incoming !== media) {
        for (const item of incoming.getTracks()) {
          if (!media.getTracks().some((have) => have.id === item.id)) {
            try { media.addTrack(item); } catch (e) { /* déjà attachée */ }
          }
        }
      }
      if (track && !media.getTracks().some((have) => have.id === track.id)) {
        try { media.addTrack(track); } catch (e) { /* déjà attachée */ }
      }
      setRemoteStream(media);
      preferLoudspeaker();
    };

    pc.onconnectionstatechange = () => {
      if (callRef.current?.callId !== callId) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        clearTimer('connect');
        clearTimer('grace');
        preferLoudspeaker();
        if (phaseRef.current !== 'active') {
          applyPhase('active');
          setConnected(true);
          setStartedAt(Date.now());
          setNowTick(Date.now());
          stopSounds();
          playConnectTone();
        }
      } else if (state === 'disconnected') {
        // Coupure brève (changement de réseau) : on laisse une chance de
        // reprise avant de raccrocher tout le monde.
        if (phaseRef.current === 'active' && !timersRef.current.grace) {
          timersRef.current.grace = setTimeout(() => {
            timersRef.current.grace = null;
            if (callRef.current?.callId !== callId || phaseRef.current !== 'active') return;
            if (pc.connectionState !== 'connected') {
              insertCallSummary('connected', Date.now() - startedAtRef.current);
              finish(END_LOST);
            }
          }, DISCONNECT_GRACE_MS);
        }
      } else if (state === 'failed') {
        const wasActive = phaseRef.current === 'active';
        if (wasActive) insertCallSummary('connected', Date.now() - startedAtRef.current);
        finish(wasActive ? END_LOST : END_FAILED, wasActive ? null : connectFailureDetail());
      }
    };
    return pc;
  }, [clearTimer, stopSounds, sendToPeer, insertCallSummary, finish, connectFailureDetail, applyPhase]);

  /* ------------------------- réception de la signalisation ------------------ */

  /**
   * Affiche l'appel entrant (pop-up Répondre / Refuser) et met la sonnerie en
   * route. Appelée par la sonnerie reçue, ou par l'effet qui rejoue une
   * sonnerie arrivée avant que la liste d'amis soit chargée.
   */
  const startIncoming = useCallback((payload) => {
    const kind = normalizeCallKind(payload.kind);
    if (!kind) return;

    callRef.current = { callId: payload.callId, peerId: payload.from, kind, role: 'callee' };
    summaryDoneRef.current = false;
    setRole('callee');
    setKind(kind);
    setPeer(peerProfile(friends.profileFor, payload.from));
    setMicOn(true);
    setCamOn(kind === 'video');
    setEndReason(null);
    setEndDetail(null);
    setNotice(null);
    applyPhase('incoming');
    stopSounds();
    soundsStopRef.current = startRingtone();
    // Le canal de l'ami est joint dès maintenant : répondre (même pour
    // refuser) exige d'émettre sur son canal.
    ensureChannel(inboxChannelFor(payload.from));
    clearTimer('incoming');
    timersRef.current.incoming = setTimeout(() => {
      // Ignoré trop longtemps : retour au calme sans bruit (l'appelant
      // conclura « sans réponse » de son côté).
      if (phaseRef.current !== 'incoming') return;
      finish(END_NO_ANSWER, null, { silent: true });
    }, INCOMING_TIMEOUT_MS);
  }, [friends, stopSounds, ensureChannel, clearTimer, finish, applyPhase]);

  const handleSignal = useCallback((payload) => {
    const me = uid;
    if (!me) return;

    // Sonnerie entrante (on est au repos, sinon on répond « occupé »).
    if (isCallEvent(payload, 'ring', { to: me })) {
      const call = callRef.current;
      if (call && call.callId === payload.callId) return; // écho du réseau
      const settled = phaseRef.current;
      if (call || (settled !== 'idle' && settled !== 'ended')) {
        sendEvent(payload.from, makeCallEvent('reply', { callId: payload.callId, from: me, to: payload.from, result: 'busy' }));
        return;
      }
      if (!normalizeCallKind(payload.kind)) return;
      const now = Date.now();
      if (lastRingRef.current.callId === payload.callId && now - lastRingRef.current.at < RING_DEDUP_MS) return;

      // Garde-fous : seuls les amis non bloqués font sonner le téléphone —
      // mais « pas encore ami » et « liste d'amis pas encore chargée » sont
      // deux choses différentes : dans le second cas, jeter la sonnerie
      // ferait disparaître l'appel sans laisser la moindre trace à l'écran.
      const decision = ringDecision({
        from: payload.from,
        me,
        relationKind: friends.relationWith(payload.from)?.kind || null,
        blocked: Boolean(messages.isBlocked?.(payload.from)),
        friendsReady: friends.status === 'ready',
      });
      if (decision === RING_IGNORE) return;
      if (decision === RING_WAIT) {
        pendingRingRef.current = { payload, at: now };
        return;
      }

      lastRingRef.current = { callId: payload.callId, at: now };
      pendingRingRef.current = null;
      if (settled === 'ended') clearTimer('ended'); // la sonnerie remplace le toast de fin
      startIncoming(payload);
      return;
    }

    const call = callRef.current;
    if (!call || !isCallEvent(payload, payload?.t, { to: me, from: call.peerId })) return;
    if (payload.callId !== call.callId) return;

    switch (payload.t) {
      // L'appelant s'est dégonflé pendant la sonnerie : silence poli.
      case 'cancel': {
        if (phaseRef.current === 'incoming') {
          finish(END_CANCELLED, null, { silent: true });
        }
        break;
      }

      // Réponse de l'ami à notre appel.
      case 'reply': {
        if (call.role !== 'caller') return;
        if (payload.result === 'accept') {
          if (phaseRef.current !== 'outgoing') return;
          clearTimer('ring');
          stopSounds();
          applyPhase('connecting');
          clearTimer('connect');
          timersRef.current.connect = setTimeout(() => finish(END_FAILED, connectFailureDetail()), CONNECT_TIMEOUT_MS);
          const pc = pcRef.current;
          if (!pc) { finish(END_FAILED); return; }
          (async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendToPeer('sdp', { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
            } catch (e) {
              finish(END_FAILED);
            }
          })();
        } else if (payload.result === 'decline') {
          insertCallSummary('declined');
          finish(END_DECLINED);
        } else if (payload.result === 'busy') {
          insertCallSummary('busy');
          finish(END_BUSY);
        }
        break;
      }

      // Offre (côté appelé) ou réponse (côté appelant) SDP.
      case 'sdp': {
        const sdp = payload.sdp;
        if (!sdp || !sdp.type || typeof sdp.sdp !== 'string') return;
        const pc = pcRef.current;
        if (!pc) {
          // L'offre peut arriver un souffle avant que `acceptCall` ait fini de
          // construire la connexion : on la met de côté.
          pendingOfferRef.current = sdp;
          return;
        }
        (async () => {
          try {
            if (sdp.type === 'offer') {
              await pc.setRemoteDescription(sdp);
              const queued = pendingIceRef.current;
              pendingIceRef.current = [];
              for (const candidate of queued) {
                try { await pc.addIceCandidate(candidate); } catch (e) { /* candidat périmé */ }
              }
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendToPeer('sdp', { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
            } else if (sdp.type === 'answer' && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(sdp);
              const queued = pendingIceRef.current;
              pendingIceRef.current = [];
              for (const candidate of queued) {
                try { await pc.addIceCandidate(candidate); } catch (e) { /* idem */ }
              }
            }
          } catch (e) {
            finish(END_FAILED);
          }
        })();
        break;
      }

      // Candidat ICE de l'ami (à mettre de côté tant que le SDP distant
      // n'est pas posé : addIceCandidate refuse avant).
      case 'ice': {
        const candidate = payload.candidate;
        if (!candidate || typeof candidate.candidate !== 'string') return;
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) {
          pendingIceRef.current.push(candidate);
          return;
        }
        pc.addIceCandidate(candidate).catch(() => { /* candidat tardif : rien de grave */ });
        break;
      }

      // L'ami a raccroché.
      case 'bye': {
        if (phaseRef.current === 'active') insertCallSummary('connected', Date.now() - startedAtRef.current);
        finish(END_HUNG_UP);
        break;
      }
      default:
        break;
    }
  }, [uid, friends, messages, sendEvent, ensureChannel, stopSounds, clearTimer, finish, insertCallSummary, startIncoming, connectFailureDetail, applyPhase]);

  // La référence du gestionnaire évite de recréer le canal à chaque rendu.
  const signalRef = useRef(handleSignal);
  useEffect(() => { signalRef.current = handleSignal; }, [handleSignal]);

  /* ------------- sonnerie arrivée avant la liste d'amis --------------------- */

  // La liste d'amis est chargée (ou rechargée) : une sonnerie gardée au chaud
  // peut enfin être tranchée. Sans cet effet, un appel reçu dans les premières
  // secondes après l'ouverture du site ne ferait jamais apparaître le pop-up.
  useEffect(() => {
    const pending = pendingRingRef.current;
    if (!pending) return;
    if (Date.now() - pending.at > RING_HOLD_MS) { pendingRingRef.current = null; return; }
    if (friends.status !== 'ready') return;
    const settled = phaseRef.current;
    if (callRef.current || (settled !== 'idle' && settled !== 'ended')) {
      pendingRingRef.current = null;
      return;
    }
    pendingRingRef.current = null;
    try { signalRef.current(pending.payload); } catch (e) { /* événement bancal */ }
  }, [friends]);

  /* --------------------- écoute permanente (sonneries entrantes) ------------ */

  useEffect(() => {
    if (mode !== 'supabase' || !uid || !supabase || typeof window === 'undefined') return undefined;
    const name = inboxChannelFor(uid);
    let cancelled = false;
    let channel = null;
    try {
      channel = supabase
        .channel(name)
        .on('broadcast', { event: 'call' }, ({ payload }) => {
          try { signalRef.current(payload); } catch (e) { /* un événement bancal ne tue pas l'appel */ }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && !cancelled) {
            ownInboxRef.current = channelsRef.current.get(name)?.channel || channel;
            const entry = channelsRef.current.get(name);
            if (entry) { entry.ready = true; entry.permanent = true; }
          }
        });
      if (!channelsRef.current.has(name)) {
        channelsRef.current.set(name, { channel, ready: false, pending: null, permanent: true });
      }
    } catch (e) {
      channel = null;
    }
    return () => {
      cancelled = true;
      ownInboxRef.current = null;
      try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
      channelsRef.current.delete(name);
    };
  }, [mode, uid]);

  /* ------------------------------ changement de compte ---------------------- */

  // Déconnexion / autre compte pendant un appel : nettoyage strictement local
  // (l'ancien identifiant n'a plus le droit d'émettre quoi que ce soit).
  useEffect(() => {
    if (phaseRef.current !== 'idle') finish(END_HUNG_UP, null, { silent: true });
    for (const name of Object.keys(timersRef.current)) clearTimer(name);
    stopSounds();
    closePeerConnection();
    stopLocalTracks();
    dropCallChannels();
    callRef.current = null;
    pendingRingRef.current = null;
    applyPhase('idle');
    setEndReason(null);
    setEndDetail(null);
    setNotice(null);
    setPeer(null);
    setRole(null);
    summaryDoneRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  /* --------------------------------- gestes --------------------------------- */

  /**
   * Avertissement visible — « appel impossible », « connexion ratée »… Sans
   * lui, un refus du navigateur ou de la configuration ne produit qu'un
   * silence, et le joueur conclut « ça ne marche pas » sans savoir pourquoi.
   */
  const showNotice = useCallback((text) => {
    if (!text) return;
    setNotice(text);
    clearTimer('notice');
    timersRef.current.notice = setTimeout(() => {
      timersRef.current.notice = null;
      if (mountedRef.current) setNotice(null);
    }, NOTICE_MS);
  }, [clearTimer]);

  const dismissNotice = useCallback(() => {
    clearTimer('notice');
    setNotice(null);
  }, [clearTimer]);

  /**
   * Raison pour laquelle on ne peut PAS appeler `peerId`, ou null si l'appel
   * est possible. C'est la source unique des boutons d'appel (fenêtre sociale
   * et page /messages) : grisés avec infobulle explicite, jamais aveugles.
   *
   * La présence en ligne n'en fait PAS partie (voir `warningFor`) : c'est une
   * estimation, et un faux « hors ligne » rendrait l'appel impossible.
   */
  const blockerFor = useCallback((candidateId) => {
    if (!candidateId || candidateId === uid) return 'friends';
    if (!uid) return 'auth';
    if (unavailableReason) return unavailableReason;
    if (phase !== 'idle' && phase !== 'ended') return 'busy';
    if (messages.isBlocked?.(candidateId)) return 'blocked';
    if (friends.relationWith(candidateId)?.kind !== 'friend') return 'friends';
    return null;
  }, [uid, unavailableReason, phase, messages, friends]);

  /**
   * Avertissement qui n'empêche PAS d'appeler (`offline`) : l'infobulle
   * explique, le bouton reste actif, et un appel sans réponse conclut
   * « Sans réponse » — comme dans toute messagerie.
   */
  const warningFor = useCallback((candidateId) => {
    if (!candidateId || blockerFor(candidateId)) return null;
    return friends.isOnline(candidateId) ? null : 'offline';
  }, [blockerFor, friends]);

  const startCall = useCallback(async (peerId, wantedKind = 'audio') => {
    if (!enabled || !uid) return;
    if (phaseRef.current !== 'idle' && phaseRef.current !== 'ended') return;
    const blocker = blockerFor(peerId);
    if (blocker) {
      // Un clic qui ne produit rien est incompréhensible : la raison s'affiche.
      const t = callsText(langRef.current);
      showNotice(callBlockLabel(blocker, t, friends.profileFor(peerId)?.name || ''));
      return;
    }
    const wanted = normalizeCallKind(wantedKind) || 'audio';

    const callId = createCallId();
    clearTimer('ended'); // un nouvel appel remplace l'annonce de fin précédente
    clearTimer('channels'); // … et garde ses propres canaux de signalisation
    pendingRingRef.current = null;
    callRef.current = { callId, peerId, kind: wanted, role: 'caller' };
    summaryDoneRef.current = false;
    setRole('caller');
    setKind(wanted);
    setPeer(peerProfile(friends.profileFor, peerId));
    setMicOn(true);
    setCamOn(wanted === 'video');
    setConnected(false);
    setEndReason(null);
    setEndDetail(null);
    setNotice(null);
    applyPhase('outgoing');

    try {
      // 1. Micro / caméra AVANT de sonner : l'autorisation se demande une
      //    fois pour toutes, pas pendant la sonnerie de l'ami.
      const { stream, kind: actualKind } = await acquireMedia(wanted);
      if (callRef.current?.callId !== callId) {
        for (const track of stream.getTracks()) track.stop();
        releaseLoudspeaker();
        return; // annulé entre-temps (compte changé…)
      }
      localRef.current = stream;
      setLocalStream(stream);
      preferLoudspeaker();
      if (actualKind !== wanted) {
        // Pas de caméra : l'appel vidéo continue en audio.
        callRef.current.kind = 'audio';
        setKind('audio');
        setCamOn(false);
      }

      // 2. Connexion P2P prête (pistes attachées) avant l'offre.
      buildPeerConnection(callId);
      for (const track of stream.getTracks()) pcRef.current.addTrack(track, stream);

      // 3. Sonnerie chez l'ami (son canal), tonalité chez nous.
      await ensureChannel(inboxChannelFor(peerId));
      if (callRef.current?.callId !== callId) return;
      sendEvent(peerId, makeCallEvent('ring', { callId, from: uid, to: peerId, kind: callRef.current.kind }));
      soundsStopRef.current = startRingback();
      clearTimer('ring');
      timersRef.current.ring = setTimeout(() => {
        if (callRef.current?.callId !== callId || phaseRef.current !== 'outgoing') return;
        sendToPeer('cancel');
        insertCallSummary('missed');
        finish(END_NO_ANSWER);
      }, OUTGOING_TIMEOUT_MS);
    } catch (e) {
      const t = callsText(langRef.current);
      let failureKind = null;
      if (classifyMediaError(e) === 'permission') {
        try {
          const embedded = isEmbedded();
          let permissionState = null;
          try {
            if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
              const status = await navigator.permissions.query({ name: 'microphone' });
              permissionState = status?.state || null;
            }
          } catch {}
          failureKind = permissionFailureKind({ embedded, permissionState });
        } catch {}
      }
      const detail = e?.callError === 'nowebrtc' ? t.reasonNoWebRTC : describeCallError(e, t, failureKind);
      finish(END_FAILED, detail);
    }
  }, [enabled, uid, blockerFor, friends, acquireMedia, buildPeerConnection, ensureChannel, sendEvent, sendToPeer, clearTimer, insertCallSummary, finish, showNotice, applyPhase]);

  const acceptCall = useCallback(async () => {
    const call = callRef.current;
    if (!enabled || !call || call.role !== 'callee' || phaseRef.current !== 'incoming') return;
    const { callId, peerId, kind: wanted } = call;

    clearTimer('incoming');
    stopSounds();
    applyPhase('connecting');
    setEndReason(null);
    setEndDetail(null);
    clearTimer('connect');
    timersRef.current.connect = setTimeout(() => finish(END_FAILED, connectFailureDetail()), CONNECT_TIMEOUT_MS);

    try {
      // 1. Micro / caméra tout de suite (on vient d'un geste du joueur :
      //    c'est le moment que Safari exige pour la permission).
      const { stream, kind: actualKind } = await acquireMedia(wanted);
      if (callRef.current?.callId !== callId) {
        for (const track of stream.getTracks()) track.stop();
        releaseLoudspeaker();
        return;
      }
      localRef.current = stream;
      setLocalStream(stream);
      preferLoudspeaker();
      if (actualKind !== wanted) {
        callRef.current.kind = 'audio';
        setKind('audio');
        setCamOn(false);
      }
      buildPeerConnection(callId);
      for (const track of stream.getTracks()) pcRef.current.addTrack(track, stream);

      // 2. Canal de l'ami : là où partiront réponse, réponse SDP et ICE.
      await ensureChannel(inboxChannelFor(peerId));
      if (callRef.current?.callId !== callId) return;
      sendEvent(peerId, makeCallEvent('reply', { callId, from: uid, to: peerId, result: 'accept' }));

      // 3. Une offre arrivée trop tôt est traitée maintenant.
      const early = pendingOfferRef.current;
      if (early) {
        pendingOfferRef.current = null;
        signalRef.current({ v: 1, t: 'sdp', callId, from: peerId, to: uid, sdp: early });
      }
    } catch (e) {
      const t = callsText(langRef.current);
      let failureKind = null;
      if (classifyMediaError(e) === 'permission') {
        try {
          const embedded = isEmbedded();
          let permissionState = null;
          try {
            if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
              const status = await navigator.permissions.query({ name: 'microphone' });
              permissionState = status?.state || null;
            }
          } catch {}
          failureKind = permissionFailureKind({ embedded, permissionState });
        } catch {}
      }
      const detail = e?.callError === 'nowebrtc' ? t.reasonNoWebRTC : describeCallError(e, t, failureKind);
      // Pas de média = pas d'appel : on prévient l'ami (équivalent d'un refus).
      sendEvent(peerId, makeCallEvent('reply', { callId, from: uid, to: peerId, result: 'decline' }));
      finish(END_FAILED, detail);
    }
  }, [enabled, uid, acquireMedia, buildPeerConnection, ensureChannel, sendEvent, stopSounds, clearTimer, finish, connectFailureDetail, applyPhase]);

  const declineCall = useCallback(() => {
    const call = callRef.current;
    if (!call || call.role !== 'callee' || phaseRef.current !== 'incoming') return;
    sendEvent(call.peerId, makeCallEvent('reply', {
      callId: call.callId, from: uid, to: call.peerId, result: 'decline',
    }));
    finish(END_DECLINED, null, { silent: true });
  }, [uid, sendEvent, finish]);

  const endCall = useCallback(() => {
    const call = callRef.current;
    if (!call || phaseRef.current === 'idle') return;

    if (call.role === 'callee' && phaseRef.current === 'incoming') {
      // Raccrocher pendant la sonnerie = refuser.
      declineCall();
      return;
    }
    if (phaseRef.current === 'outgoing') {
      // Personne n'a répondu : on annule proprement la sonnerie chez l'ami.
      sendToPeer('cancel');
      finish(END_CANCELLED);
      return;
    }
    if (phaseRef.current === 'active') {
      sendToPeer('bye');
      insertCallSummary('connected', Date.now() - startedAtRef.current);
      finish(END_HUNG_UP);
      return;
    }
    // En pleine connexion (accepté mais pas encore établi) : on lâche l'affaire.
    sendToPeer('bye');
    finish(END_HUNG_UP);
  }, [declineCall, sendToPeer, insertCallSummary, finish]);

  const toggleMic = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return;
    const next = !tracks[0].enabled;
    for (const track of tracks) track.enabled = next;
    setMicOn(next);
  }, []);

  const toggleCam = useCallback(() => {
    const stream = localRef.current;
    if (!stream || callRef.current?.kind !== 'video') return;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return;
    const next = !tracks[0].enabled;
    for (const track of tracks) track.enabled = next;
    setCamOn(next);
  }, []);

  /**
   * Bascule vers la caméra suivante (selfie ↔ dos, sur mobile). La piste est
   * remplacée dans l'émetteur existant : pas de renégociation, l'ami ne voit
   * que l'image changer. Best-effort : en cas d'échec, on garde la caméra
   * courante.
   */
  const flipCamera = useCallback(async () => {
    const call = callRef.current;
    const stream = localRef.current;
    const pc = pcRef.current;
    if (!call || !stream || !pc || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const current = stream.getVideoTracks()[0];
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      if (cameras.length < 2 || !current) return;
      const oldTrack = current;
      const settings = typeof oldTrack.getSettings === 'function' ? oldTrack.getSettings() : {};
      const index = cameras.findIndex((device) => device.deviceId && device.deviceId === settings.deviceId);
      const next = cameras[(index + 1 + cameras.length) % cameras.length];
      const fresh = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: next.deviceId } } });
      const newTrack = fresh.getVideoTracks()[0];
      if (!newTrack) {
        for (const track of fresh.getTracks()) track.stop();
        return;
      }
      // La piste est remplacée dans l'émetteur AVANT d'arrêter l'ancienne :
      // l'ami ne voit que l'image changer, sans renégociation.
      const sender = pc.getSenders().find((item) => item.track === oldTrack)
        || pc.getSenders().find((item) => item.track?.kind === 'video');
      if (sender) {
        try { await sender.replaceTrack(newTrack); } catch (e) { /* ancien navigateur */ }
      }
      oldTrack.stop();
      stream.removeTrack(oldTrack);
      stream.addTrack(newTrack);
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch (e) {
      // Changement impossible (appareil occupé, permission…) : on continue
      // avec la caméra d'origine, sans casser l'appel.
    }
  }, []);

  /* ---------------------------------- durée ---------------------------------- */

  // Un battement par seconde pendant l'appel actif : le chrono de l'interface
  // tourne sans ré-renderer tout le contexte à chaque frame.
  useEffect(() => {
    if (phase !== 'active' || !startedAt) return undefined;
    const timer = setInterval(() => {
      if (mountedRef.current) setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, startedAt]);

  const elapsedMs = phase === 'active' && startedAt ? Math.max(0, nowTick - startedAt) : 0;

  /* --------------------------------- valeur ---------------------------------- */

  const value = useMemo(() => ({
    enabled,
    unavailableReason,
    blockerFor,
    warningFor,
    phase,
    role,
    kind,
    peer,
    micOn,
    camOn,
    connected,
    elapsedMs,
    endReason,
    endDetail,
    notice,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCam,
    flipCamera,
    dismissNotice,
  }), [
    enabled, unavailableReason, blockerFor, warningFor, phase, role, kind, peer, micOn, camOn,
    connected, elapsedMs, endReason, endDetail, notice, localStream, remoteStream,
    startCall, acceptCall, declineCall, endCall, toggleMic, toggleCam, flipCamera, dismissNotice,
  ]);

  return <CallsContext.Provider value={value}>{children}</CallsContext.Provider>;
}

export function useCalls() {
  return useContext(CallsContext);
}
