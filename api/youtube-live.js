const CHANNEL_ID = 'UCBi989OGXiGBjvB17Xh5GUQ';

function send(res, status, payload, cacheControl = 'no-store') {
  res.status(status).setHeader('Cache-Control', cacheControl).json(payload);
}

export default async function handler(_request, response) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return send(response, 503, { status: 'unknown', error: 'YouTube API key is not configured.' });
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
    const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await youtubeResponse.json();

    if (!youtubeResponse.ok) {
      console.error('YouTube API error:', data);
      return send(response, 502, { status: 'unknown', error: 'YouTube API request failed.' });
    }

    const live = data.items?.[0];
    return send(response, 200, live ? {
      status: 'live',
      videoId: live.id.videoId,
      title: live.snippet.title,
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
