// =============================================================================
// Supabase Edge Function — `mobile-push`
// =============================================================================
// Relais léger vers l'API Expo Push (https://exp.host/--/api/v2/push/send) :
//   1. Webhook Database sur `public.direct_messages` (INSERT) → alerte message
//   2. Webhook Database sur `public.friendships` (INSERT / UPDATE) → alerte ami
//   3. Appel éditorial `{ type: 'news', slug, titles: { fr, en, ar }, bodies }`
//      → alerte actu dans la langue de chaque abonné.
//
// Sécurisé par un en-tête `x-webhook-secret` comparé à `MOBILE_PUSH_SECRET`.
// =============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const COPY = {
  fr: {
    newMessage: (sender: string) => `Nouveau message de ${sender}`,
    friendRequest: (sender: string) => `${sender} vous a envoyé une demande d'ami`,
    friendAccepted: (sender: string) => `${sender} a accepté votre demande d'ami`,
    newsDefault: "Nouvelle actu sur Let's Play",
  },
  en: {
    newMessage: (sender: string) => `New message from ${sender}`,
    friendRequest: (sender: string) => `${sender} sent you a friend request`,
    friendAccepted: (sender: string) => `${sender} accepted your friend request`,
    newsDefault: "New story on Let's Play",
  },
  ar: {
    newMessage: (sender: string) => `رسالة جديدة من ${sender}`,
    friendRequest: (sender: string) => `أرسل لك ${sender} طلب صداقة`,
    friendAccepted: (sender: string) => `قبل ${sender} طلب صداقتك`,
    newsDefault: 'خبر جديد على Let’s Play',
  },
} as const;

type Lang = keyof typeof COPY;
const pickLang = (raw?: string | null): Lang =>
  raw === 'en' || raw === 'ar' ? raw : 'fr';

async function sendExpoBatch(messages: Record<string, unknown>[]) {
  if (messages.length === 0) return { sent: 0 };
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }
  let sent = 0;
  for (const chunk of chunks) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });
    if (res.ok) sent += chunk.length;
  }
  return { sent };
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get('MOBILE_PUSH_SECRET');
  if (!expectedSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_webhook_secret' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (req.headers.get('x-webhook-secret') !== expectedSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_supabase_env' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const payload = await req.json();

  // 1. Message direct entrant
  if (payload?.table === 'direct_messages' && payload?.type === 'INSERT' && payload?.record) {
    const record = payload.record;
    const recipientId = record.recipient_id as string;
    const senderId = record.sender_id as string;

    const [{ data: tokens }, { data: senderProfile }] = await Promise.all([
      admin
        .from('push_tokens')
        .select('expo_push_token, lang')
        .eq('user_id', recipientId)
        .eq('notify_messages', true),
      admin
        .from('profiles')
        .select('username, display_name')
        .eq('id', senderId)
        .maybeSingle(),
    ]);

    const senderName =
      senderProfile?.username || senderProfile?.display_name || senderId.slice(0, 8);

    const notifications = (tokens ?? []).map((row) => {
      const lang = pickLang(row.lang);
      return {
        to: row.expo_push_token,
        sound: 'default',
        title: COPY[lang].newMessage(senderName),
        body: String(record.body ?? '').slice(0, 140),
        data: { tab: 'messages', peerId: senderId },
      };
    });

    const result = await sendExpoBatch(notifications);
    return Response.json({ ok: true, ...result });
  }

  // 2. Demande d'ami ou acceptation
  if (payload?.table === 'friendships' && payload?.record) {
    const record = payload.record;
    const isNewRequest = payload.type === 'INSERT' && record.status === 'pending';
    const isAccepted =
      payload.type === 'UPDATE' &&
      payload.old_record?.status === 'pending' &&
      record.status === 'accepted';

    if (!isNewRequest && !isAccepted) {
      return Response.json({ ok: true, sent: 0 });
    }

    const targetUserId = isNewRequest ? record.addressee_id : record.requester_id;
    const actorUserId = isNewRequest ? record.requester_id : record.addressee_id;

    const [{ data: tokens }, { data: actorProfile }] = await Promise.all([
      admin
        .from('push_tokens')
        .select('expo_push_token, lang')
        .eq('user_id', targetUserId)
        .eq('notify_friends', true),
      admin
        .from('profiles')
        .select('username, display_name')
        .eq('id', actorUserId)
        .maybeSingle(),
    ]);

    const actorName =
      actorProfile?.username || actorProfile?.display_name || String(actorUserId).slice(0, 8);

    const notifications = (tokens ?? []).map((row) => {
      const lang = pickLang(row.lang);
      return {
        to: row.expo_push_token,
        sound: 'default',
        title: "Let's Talk",
        body: isNewRequest
          ? COPY[lang].friendRequest(actorName)
          : COPY[lang].friendAccepted(actorName),
        data: { tab: 'messages', subTab: 'friends' },
      };
    });

    const result = await sendExpoBatch(notifications);
    return Response.json({ ok: true, ...result });
  }

  // 3. Diffusion d'une actualité majeure
  if (payload?.type === 'news' && payload?.slug) {
    const { data: tokens } = await admin
      .from('push_tokens')
      .select('expo_push_token, lang')
      .eq('notify_news', true);

    const notifications = (tokens ?? []).map((row) => {
      const lang = pickLang(row.lang);
      const title = payload.titles?.[lang] || payload.titles?.fr || COPY[lang].newsDefault;
      const body = payload.bodies?.[lang] || payload.bodies?.fr || '';
      return {
        to: row.expo_push_token,
        sound: 'default',
        title,
        body: String(body).slice(0, 160),
        data: { tab: 'news', slug: payload.slug },
      };
    });

    const result = await sendExpoBatch(notifications);
    return Response.json({ ok: true, ...result });
  }

  return Response.json({ ok: true, sent: 0 });
});
