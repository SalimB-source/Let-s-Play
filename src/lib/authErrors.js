import { supabaseHost } from './supabase';

// Supabase Auth answers in English and, when the project cannot be reached,
// with a bare "Failed to fetch" — impossible for a reader to act on. The form
// maps the few cases that call for a different reaction (confirm the email,
// wait for the rate limit, check the project settings) and keeps the original
// message in parentheses, so nothing is hidden while debugging.

function isNetworkFailure(error) {
  const message = error?.message || '';
  // AuthRetryableFetchError reports status 0; browsers surface the same
  // failure as a TypeError ("Failed to fetch" / "Load failed" / "NetworkError").
  return error?.status === 0
    || /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(message);
}

export function describeAuthError(error, t, fallback) {
  const message = error?.message || '';
  const code = error?.code || '';
  const details = message ? ` — ${message}` : '';

  if (isNetworkFailure(error)) {
    const target = supabaseHost ? ` (${supabaseHost})` : '';
    return `${t.errNetwork}${target}${details}`;
  }

  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return `${t.errEmailNotConfirmed}${details}`;
  }

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return `${t.errInvalidCredentials}${details}`;
  }

  if (
    code === 'over_email_send_rate_limit'
    || code === 'over_request_rate_limit'
    || /rate limit/i.test(message)
  ) {
    return `${t.errRateLimited}${details}`;
  }

  return message || fallback;
}
