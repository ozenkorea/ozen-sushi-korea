# Menu storage migration

After activation, menus live in `data/menu-items.json`; menu photos live in `public/images/menu/`.
Public menus use only `data/menu-public.json` (published rows only) and are rendered during the Vercel build and make no Supabase requests.
The complete owner file and dated backup remain local until the repository is confirmed private.
Do not commit hidden menus or original Storage URLs into a public repository.
No Supabase records, accounts, or original uploads were deleted.

## One-time owner login setup

0. Set the repository to **Private**, confirm visibility, then import the complete
   owner file and backup. The write API refuses a public repository.
1. In the **ozenkorea** GitHub account, register an OAuth application:
   - Name: Ozen Menu Manager
   - Homepage: `https://ozenlondon.ca`
   - Authorization callback: `https://ozenlondon.ca/api/owner/callback`
2. Add these server-only environment variables in the existing Vercel project:
   - `OZEN_GITHUB_CLIENT_ID`: OAuth application's Client ID.
   - `OZEN_GITHUB_CLIENT_SECRET`: generated Client Secret.
   - `OZEN_SESSION_SECRET`: cryptographically random secret, at least 32 characters.
3. Redeploy, open `/admin`, and choose GitHub login. Only the repository owner
   account `ozenkorea` with push permission is accepted. Do not put secrets in
   `NEXT_PUBLIC_` variables, the repository, screenshots, or chat.

The app requests `repo` to save the private repository. Server code only
writes the fixed menu JSON path and content-addressed WebP photos in this repo.
Access tokens remain encrypted in Secure, HttpOnly, SameSite=Lax cookies for
at most seven hours. OAuth uses state and PKCE. All writes check the origin,
current GitHub identity, repository permission, and menu version. Concurrent
changes fail instead of silently overwriting data.

## Publishing

Each save, delete, or reorder makes one Git commit. The existing Git-connected
Vercel project builds and publishes it. Changes usually take 1–3 minutes but
are not live until deployment succeeds. A failed deployment retains the last
successful menu; check Vercel deployment status before telling guests it is live.
New photos are compressed in the browser to WebP within 800x600, without cropping.

Keep Supabase intact until owner login and a real edit/photo upload have been
verified. No paid subscription is created by this migration. GitHub and Vercel
quotas and commercial hosting eligibility still apply independently.
