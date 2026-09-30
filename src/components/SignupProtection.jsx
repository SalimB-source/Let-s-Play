import { useEffect, useRef, useState } from 'react';

// Turnstile is loaded only on the registration form. Keeping the loader here
// avoids adding the third-party script to every page of the SPA and makes the
// CAPTCHA optional for local/demo builds that do not have a public site key.
const TURNSTILE_SCRIPT_ID = 'lets-play-turnstile-script';
let turnstileLoader;

function loadTurnstile() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('turnstile-requires-browser'));
  }
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileLoader) return turnstileLoader;

  turnstileLoader = new Promise((resolve, reject) => {
    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    const script = existing || document.createElement('script');
    let settled = false;
    let timeoutId;

    const finish = () => {
      if (settled) return;
      if (window.turnstile) {
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(window.turnstile);
      }
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      turnstileLoader = undefined;
      reject(new Error('turnstile-script-failed'));
    };

    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    timeoutId = window.setTimeout(fail, 10000);
    if (!existing) {
      script.id = TURNSTILE_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      document.head.appendChild(script);
    } else {
      // A script tag may have been inserted by another component before this
      // hook mounted. Give its global a chance to appear before declaring it
      // broken; the normal load event handles the usual path.
      finish();
      window.setTimeout(finish, 1000);
    }
  });

  return turnstileLoader;
}

/**
 * Render the Cloudflare Turnstile challenge used by Supabase Auth.
 *
 * The widget is deliberately fail-closed when a site key is configured: a
 * configured deployment must never silently fall back to an unprotected
 * registration form because the challenge script was blocked or expired.
 * Without VITE_TURNSTILE_SITE_KEY the component renders nothing, which keeps
 * local development and builds without the provider usable until the provider
 * is configured in Supabase as well.
 */
export default function SignupProtection({
  siteKey,
  label,
  instructions,
  loadingLabel,
  errorLabel,
  resetSignal = 0,
  onTokenChange,
}) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onTokenChangeRef.current?.('');
      setStatus('idle');
      return undefined;
    }

    let active = true;
    setStatus('loading');
    onTokenChangeRef.current?.('');

    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;
        try {
          widgetIdRef.current = turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action: 'signup',
            theme: 'auto',
            size: 'flexible',
            callback: (token) => {
              if (!active) return;
              setStatus('solved');
              onTokenChangeRef.current?.(token || '');
            },
            'expired-callback': () => {
              if (!active) return;
              setStatus('ready');
              onTokenChangeRef.current?.('');
            },
            'timeout-callback': () => {
              if (!active) return;
              setStatus('ready');
              onTokenChangeRef.current?.('');
            },
            'error-callback': () => {
              if (!active) return;
              setStatus('error');
              onTokenChangeRef.current?.('');
            },
          });
          setStatus('ready');
        } catch (error) {
          setStatus('error');
          onTokenChangeRef.current?.('');
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
        onTokenChangeRef.current?.('');
      });

    return () => {
      active = false;
      onTokenChangeRef.current?.('');
      if (widgetIdRef.current !== null && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          // The provider may already have removed an expired widget.
        }
      }
      widgetIdRef.current = null;
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [siteKey, resetSignal]);

  if (!siteKey) return null;

  return (
    <div className="auth-protection" aria-live="polite">
      <p className="auth-protection-label">{label}</p>
      {instructions && <p className="auth-protection-hint">{instructions}</p>}
      <div ref={containerRef} className="auth-turnstile" />
      {status === 'loading' && <p className="auth-protection-status">{loadingLabel}</p>}
      {status === 'error' && <p className="auth-protection-status auth-protection-status-error">{errorLabel}</p>}
    </div>
  );
}
