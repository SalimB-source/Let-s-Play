# Let’s Play security checklist

## Changes applied in this review

The Vercel configuration now sends baseline browser-hardening headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`. The `/api/youtube-live` function now accepts only `GET`, returns generic configuration errors instead of exposing deployment details, aborts upstream requests after eight seconds, and validates the shape of the YouTube response before returning it.

## Required deployment checks

1. **Keep secrets server-side.** Store `YOUTUBE_API_KEY` and all news-bot/LLM credentials only in Vercel and GitHub Actions secret stores. Never use `VITE_` for a private credential. The Supabase publishable/anon key is designed to be public, but a `service_role` key must never be bundled into the browser.
2. **Rotate credentials if exposed.** If a private key has ever appeared in a local `.env`, build artifact, issue, log, or commit, revoke it at the provider and create a replacement. Review Git history and Vercel deployment logs after rotation.
3. **Verify Supabase RLS in the live project.** Run `supabase/schema.sql` in the intended Supabase project and confirm that every application table has RLS enabled. Test as both `anon` and `authenticated`: users must not read or write another user’s profile, comments, progression, friendships, messages, blocks, or reports. Confirm that direct messages require an accepted friendship and that account deletion is callable only by an authenticated user.
4. **Restrict authentication settings.** In Supabase Authentication, use the production site URL and exact redirect URLs; disable unused providers; enable email confirmation; configure a custom SMTP provider if reliable delivery matters; and use a sufficiently long minimum password length. Do not add wildcard redirect URLs in production.
5. **Protect the deployment pipeline.** Enable branch protection for the production branch, require pull-request review and passing checks, keep GitHub Actions permissions least-privilege, and review third-party Actions before upgrading them. Keep LLM/API values in repository secrets, not repository variables.
6. **Protect the hosting project.** Require Vercel team MFA, limit project-member access, review environment-variable scope (Preview/Production), and ensure Preview deployments do not contain production-only credentials unless deliberately required.
7. **Add abuse monitoring.** Keep the existing database rate limits, and monitor authentication failures, comment/message abuse, API error rates, and YouTube quota usage. Add provider-side alerts where available.
8. **Validate headers after deployment.** Run `curl -I https://your-domain.example/` and confirm the five headers above are present. If the site must be embedded by a trusted parent, replace `X-Frame-Options: SAMEORIGIN` with an explicitly designed CSP `frame-ancestors` policy rather than weakening it broadly.

## Review notes

No private-key pattern was found in tracked files, and the production dependency audit reported no high-severity vulnerabilities at review time. The application already has substantial Supabase RLS and trigger-based authorization for social features; the most important remaining risk is configuration drift—especially deploying the SQL schema incompletely or exposing a privileged Supabase key.

This checklist is guidance, not a substitute for a penetration test or provider-side configuration review.
