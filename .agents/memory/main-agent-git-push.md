---
name: Main-agent git push method
description: How to push to GitHub from the main agent when the git pane and destructive git ops are blocked
---

The main agent cannot run destructive git ops (`git commit`, `git push --force`,
`git reset`, `git fetch --prune`, etc.), and Replit's git pane may be unreliable.

**What works:** a plain (non-force) push to an explicit URL using an inline
credential helper that reads a token from the environment:

```
git -c credential.helper='!f(){ echo username=x-access-token; echo "password=$GH_PAT"; };f' \
  push https://github.com/<owner>/<repo>.git main
```

**Why:** plain pushes aren't blocked; the helper injects the token without storing
it. Local commits happen automatically via the auto-checkpoint when the agent yields
control — so to push a new edit, make the edit, end the turn (checkpoint commits it),
then push on the next turn.

**How to apply:** Always redact tokens in output (`sed -E 's/ghp_[A-Za-z0-9]+/[REDACTED]/g'`).
The token needs both `repo` and `workflow` scopes to push `.github/workflows/*` files.
GitHub Actions can be driven via the REST API with the same token: list runs
`/actions/runs`, jobs `/actions/runs/{id}/jobs`, logs `/actions/runs/{id}/logs`,
re-run `POST /actions/runs/{id}/rerun`, secrets `/actions/secrets`.
