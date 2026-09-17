const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const CHANNEL_HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || '@letsplay.officiel';

function json(res, status, payload, cacheControl = 'no-store') {
  res.status(status).setHeader('Cache-Control', cacheControl).json(payload);
}

export default async function handler(_req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return json(res, 500, { error: 'YouTube API is not configured.' });
  }

  if (!CHANNEL_ID) {
    return json(res, 500, { error: 'YouTube channel ID is not configured.' });
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
    const response = await fetch(`${YOUTUBE_API_URL}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API error:', data);
      return json(res, 502, { error: 'YouTube API request failed.' });
    }

    const item = data.items?.[0];
    if (!item) {
      return json(res, 200, {
        isLive: false,
        channelHandle: CHANNEL_HANDLE,
      }, 's-maxage=60, stale-while-revalidate=300');
    }

    return json(res, 200, {
      isLive: true,
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
      channelHandle: CHANNEL_HANDLE,
      detectedAt: new Date().toISOString(),
    }, 's-maxage=60, stale-while-revalidate=300');
  } catch (error) {
    console.error('YouTube live detection failed:', error);
    return json(res, 502, { error: 'Unable to contact YouTube.' });
  }
}

// The endpoint intentionally uses search.list with eventType=live. Its response
// is cached at Vercel's edge for 60 seconds to keep API quota usage controlled.
// YouTube assigns 100 quota units to each search.list request.
//--------------------------------------------------------------------------
// Setup variables in Vercel:
//   YOUTUBE_API_KEY=Google Cloud API key with YouTube Data API v3 enabled
//   YOUTUBE_CHANNEL_ID=numeric ID of the Let's Play Official channel
//   YOUTUBE_CHANNEL_HANDLE=@letsplay.officiel (optional, display/fallback only)
