# Cloudflare Free Upgrades

## Enabled in code

- R2-ready media/profile storage through `R2_*` environment variables.
- Optional Cloudflare Web Analytics beacon through `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN`.
- Optional Turnstile protection for the public contact form through `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- Cloudflare-friendly headers:
  - `no-store` for dynamic API routes.
  - cache hints for sitemap, manifest, and blog pages.
  - baseline security headers.

## Recommended dashboard setup

1. R2 custom domain
   - Attach `media.tungjpstore.net` to bucket `tung-profile-media`.
   - Set `R2_PUBLIC_URL=https://media.tungjpstore.net` in Vercel.
   - Disable `r2.dev` after the custom domain is active.

2. Turnstile
   - Create one widget for `profile.tungjpstore.net`.
   - Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to Vercel.
   - Redeploy production.

3. Web Analytics
   - Create a Cloudflare Web Analytics site for `profile.tungjpstore.net`.
   - Add `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` to Vercel.
   - Redeploy production.

4. Cache Rules
   - Keep `/api/*` bypassed from cache.
   - Cache static/blog paths conservatively.
   - Cache R2 media aggressively once the custom domain is active.
