---
name: Replit lockfile breaks external Docker builds
description: Why npm ci fails in Docker/CI outside Replit and how to fix the lockfile URLs
---

When a project's dependencies are installed inside Replit, `package-lock.json`
records some `resolved` URLs pointing at Replit's internal package proxy, e.g.
`http://package-firewall.replit.local/npm/<pkg>/-/<file>.tgz`.

Outside Replit (Aptible, GitHub Actions, any external Docker build) that host does
not resolve, so `npm ci` fails with `ENOTFOUND package-firewall.replit.local`.

**Fix:** rewrite those URLs to the public registry before install. In the Dockerfile,
after copying `package*.json` and before installing:

```
RUN sed -i 's#http://package-firewall.replit.local/npm/#https://registry.npmjs.org/#g' package-lock.json
```

**Why:** The internal-proxy URL maps 1:1 onto the public registry path, so a plain
prefix swap is safe and keeps the lockfile's pinned versions/integrity intact.

**How to apply:** Any time you build a Replit project's Docker image somewhere that
isn't Replit. Only some entries are affected (often native packages like sharp);
grep the lockfile for `package-firewall.replit.local` to confirm before/after.
