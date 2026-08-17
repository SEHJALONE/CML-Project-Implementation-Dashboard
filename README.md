# Charger Manufacturing Line — Dashboard (team-shared setup)

This folder is ready to deploy to Vercel as-is. It contains:

- `index.html` — the dashboard itself (unchanged behavior if deployed alone,
  but now also talks to a shared backend when one is available).
- `api/state.js` — a small serverless function that stores the dashboard's
  data in a shared Redis database, so everyone who opens the link sees the
  same data, and edits save for the whole team instead of just one browser.

## How it works

- Loading the page: the dashboard fetches `/api/state`. If your team backend
  has data, that becomes the source of truth (overriding whatever was baked
  into the file). It also quietly re-checks every 20 seconds, so if a
  teammate saves a change while you're looking at the page, yours updates
  automatically (it won't interrupt you if you're mid-edit — it just tries
  again on the next check).
- Saving an edit: same as before (still saved to your own browser instantly),
  plus a PUT to `/api/state` in the background. The small status label next
  to "Discard my local changes" tells you which happened: **Saved for the
  team** or **Saved on this device only** (shown if the backend couldn't be
  reached — e.g. you're offline, or the backend isn't set up yet).
- No backend deployed: everything above fails silently and the dashboard
  behaves exactly like the plain static file always did.

## One-time setup (about 5 minutes)

1. **Push this folder to GitHub.** Create a new repository and upload
   `index.html`, the `api` folder, and this `README.md` — either by dragging
   them into GitHub's web uploader, or with `git`:
   ```
   git init
   git add .
   git commit -m "Charger line dashboard"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. **Import it into Vercel.** Go to [vercel.com](https://vercel.com), sign in
   (GitHub sign-in is simplest), click **Add New → Project**, and import the
   repository you just created. No build settings are needed — click
   **Deploy**. You'll get a live URL immediately, but the team-sync features
   won't work yet (no database attached).

3. **Add the shared database.** In your new Vercel project, open the
   **Storage** tab (or the **Marketplace**) and add **Upstash for Redis**:
   - Click **Install** / **Connect**.
   - Sign in or create a free Upstash account when prompted (Upstash's free
     tier is more than enough for this — the whole dashboard's data is one
     small JSON document).
   - Choose **Create new database**, pick a region close to your team, and
     confirm.
   - Vercel automatically adds the connection details as environment
     variables on your project — you don't need to copy/paste anything.

4. **Redeploy.** Adding the integration usually triggers a redeploy on its
   own; if not, go to the **Deployments** tab and click **Redeploy** on the
   latest one, so the new environment variables take effect.

5. **Test it.** Open your live URL, make a small edit anywhere (e.g. type
   into a Key Deliverable cell), and check the status label shows **Saved
   for the team**. Then open the same URL in a different browser (or send it
   to a teammate) — your edit should be there.

## Inviting your team

In Vercel, go to your account or team settings → **Members** → **Invite**,
and add teammates by email if you want them to be able to redeploy or change
settings. For just *using* the dashboard, they don't need a Vercel account
at all — anyone with the live URL can view and edit it, the same way the
Upstash-backed saving works for anyone who has the link.

## Good to know

- **No login/access control.** Anyone with the link can edit the shared
  data — there's no password or user accounts. That matches how you'd been
  sharing the file already; just be mindful of who you send the link to. If
  you'd like a simple shared password gate later, that's a small addition —
  just ask.
- **Last save wins.** If two people edit the exact same field at the exact
  same moment, whoever's save lands second overwrites the first. For a small
  team editing a project tracker, this is rarely an issue in practice, but
  it's not the same as real-time co-editing (like a Google Doc) — there's no
  conflict merging.
- **"Save shareable HTML" and "Export JSON" still work** — they now export
  whatever the shared/team copy currently holds, which is a handy way to
  keep an offline backup or snapshot of a milestone.
