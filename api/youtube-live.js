const CHANNEL_ID = 'UCBi989OGXiGBjvB17Xh5GUQ';

function send(res, status, payload, cacheControl = 'no-store') {
  res.status(status).setHeader('Cache-Control', cacheControl).json(payload);
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { error: 'Method not allowed.' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('YouTube API key is not configured.');
    return send(response, 503, { status: 'unknown', error: 'Service unavailable.' });
  }

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    channelId: CHANNEL_ID,
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
      return send(response, 502, { status: 'unknown', error: 'YouTube API request failed.' });
    }

    const live = data.items?.[0];
    const videoId = live?.id?.videoId;
    if (live && typeof videoId !== 'string') {
      console.error('YouTube API returned an invalid live-video payload.');
      return send(response, 502, { status: 'unknown', error: 'Invalid YouTube response.' });
    }
    return send(response, 200, live ? {
      status: 'live',
      videoId,
      title: typeof live.snippet?.title === 'string' ? live.snippet.title : '',
    } : {
      status: 'offline',
    }, 's-maxage=60, stale-while-revalidate=300');
  } catch (error) {
    console.error('Live status check failed:', error);
    return send(response, 502, { status: 'unknown', error: 'Unable to contact YouTube.' });
  }
}

// Configure YOUTUBE_API_KEY as a secret in Vercel.
// search.list costs 100 quota units; Vercel caches this response for 60 seconds.
