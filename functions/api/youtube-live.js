// Cloudflare Pages Function — drop-in replacement for the Vercel serverless
// function in api/youtube-live.js (same route: /api/youtube-live).
//
// Serves the YouTube "is the channel live?" badge on the home page without
// exposing the API key to the browser. `YOUTUBE_API_KEY` is a secret
// environment variable: set it in the Cloudflare dashboard
// (Pages project → Settings → Environment variables) — never as VITE_*.
//
// Test locally with:  npm run build && npx wrangler pages dev dist
const CHANNEL_ID = 'UCBi989OGXiGBjvB17Xh5GUQ';

function send(status, payload, cacheControl = 'no-store') {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl,
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
      },
    });
  }

  const apiKey = env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('YouTube API key is not configured.');
    return send(503, { status: 'unknown', error: 'Service unavailable.' });
  }

  const channelId = typeof env.YOUTUBE_CHANNEL_ID === 'string' && env.YOUTUBE_CHANNEL_ID.trim()
    ? env.YOUTUBE_CHANNEL_ID.trim()
    : CHANNEL_ID;

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    channelId,
    eventType: 'live',
    type: 'video',
    maxResults: '1',
  });

  try {
    const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await youtubeResponse.json();

    if (!youtubeResponse.ok) {
      console.error('YouTube API error:', data);
      return send(502, { status: 'unknown', error: 'YouTube API request failed.' });
    }

    const live = data.items?.[0];
    const videoId = live?.id?.videoId;
    if (live && typeof videoId !== 'string') {
      console.error('YouTube API returned an invalid live-video payload.');
      return send(502, { status: 'unknown', error: 'Invalid YouTube response.' });
    }
    return send(200, live ? {
      status: 'live',
      videoId,
      title: typeof live.snippet?.title === 'string' ? live.snippet.title : '',
    } : {
      status: 'offline',
    }, 's-maxage=60, stale-while-revalidate=300');
  } catch (error) {
    console.error('Live status check failed:', error);
    return send(502, { status: 'unknown', error: 'Unable to contact YouTube.' });
  }
}

// Configure YOUTUBE_API_KEY as a secret environment variable in the
// Cloudflare dashboard (Pages → Settings → Environment variables).
// search.list costs 100 quota units; the edge cache keeps this response
// for 60 seconds.
