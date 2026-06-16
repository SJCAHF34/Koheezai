# Koheez.ai — Microsoft Teams App Package

This folder builds the Microsoft Teams app package (`.zip`) that lets staff run
Koheez.ai inside Microsoft Teams with single sign-on (SSO) via Microsoft Entra.

## Files

- `manifest.json` — Teams app manifest (v1.19) with `{{PLACEHOLDER}}` tokens.
- `color.png` — 192×192 color icon.
- `outline.png` — 32×32 transparent outline icon.
- `build-package.mjs` — substitutes env values into the manifest and produces
  `dist/koheez-teams.zip`.

## Required values

These come from your Microsoft Entra app registration and hosting domain. Set
them as environment variables before building:

| Variable             | Meaning                                                        |
| -------------------- | ------------------------------------------------------------- |
| `AAD_APP_CLIENT_ID`  | Entra application (client) ID.                                 |
| `TEAMS_APP_ID`       | A GUID identifying this Teams app (can equal the client ID).   |
| `APP_DOMAIN`         | Public domain the app is served from (e.g. `koheez.aidshealth.org`). |

The same `AAD_APP_CLIENT_ID`, `AAD_TENANT_ID`, and `APP_DOMAIN` must also be set
on the **server** so backend SSO token validation works.

## One-time Microsoft Entra setup

1. **Register an app** in Entra admin center (single tenant).
2. **Expose an API**: set the Application ID URI to
   `api://APP_DOMAIN/AAD_APP_CLIENT_ID` and add a scope named `access_as_user`
   (admin + user consent).
3. **Pre-authorize the Teams clients** for that scope by adding these client IDs:
   - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams desktop/mobile)
   - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web)
4. **Add a SPA / web redirect** for `https://APP_DOMAIN/auth-end.html` if you use
   the popup fallback.
5. No client secret is required for this SSO flow.

## Build

```bash
AAD_APP_CLIENT_ID=... TEAMS_APP_ID=... APP_DOMAIN=koheez.aidshealth.org \
  node teams/build-package.mjs
```

The package is written to `teams/dist/koheez-teams.zip`. Upload it in the Teams
admin center (or "Upload a custom app") to install.
