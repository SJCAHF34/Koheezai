---
name: CSP frame-ancestors vs Replit preview
description: Why frame-ancestors CSP must be production-only in this app
---

# CSP frame-ancestors must be gated to production

Setting `Content-Security-Policy: frame-ancestors ...` (to allow Microsoft Teams
to embed the app) must only be applied when `NODE_ENV === "production"`.

**Why:** In dev the app is shown inside the Replit preview, which frames it from
replit.dev/replit.com origins. A restrictive `frame-ancestors` that lists only
`'self'` + Teams hosts will block the Replit preview iframe and the user sees a
blank/blocked preview. Teams embedding can only be tested on the real production
domain anyway, so dev gains nothing from the header.

**How to apply:** Guard the CSP middleware with `if (isProduction)` in
`server/index.ts`. Same idea applies to any future framing/security headers.
