// Petites primitives réseau : fetch avec timeout, User-Agent et une relance.

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Let\'sPlayNewsBot/1.0';

export async function fetchText(url, { timeout = 15000, retries = 1, accept = '*/*' } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': UA, accept },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
  throw lastError;
}
