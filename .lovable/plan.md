# Run CheckingCheckout on Lovable hosting (instead of Vercel)

## Step 0: bring in your newest code
- Your push worked. GitHub now has commits up to "Improve web loading states" (May 9).
- The Jun 4 commit ("Remove extra newline…") is still missing, because your computer's copy wasn't fully up to date. To include it, run `git pull` in your main repo, then push again.
- The push replaced the earlier history, so Lovable may not pick it up on its own. First I'll check whether this project matches GitHub. If it doesn't, I'll copy the newest pushed files in directly, and every step below uses that code.

## What I will do
1. **Remove Vercel-only parts:** the Vercel build add-on, Vercel visitor stats and the Vercel routing file. Lovable hosting already opens every page link correctly.
2. **Keep the same look and features.** Screens stay the same, and your current database stays connected.
3. **Fix email sending for the published site.** Right now emails use a shortcut that only works while developing. I'll send them through your server functions instead.
4. **Billing setup:** I'll ask for your Polar organization ID in a secure form. It's a public value, not a password.
5. **Check it works:** I'll sign in on the preview and open the dashboard, reservations, calendar and reports.
6. **Publish on Lovable:** you get a `*.lovable.app` web address. You can connect `app.checkingcheckout.com` later.

## Technical details
- Diff the project against GitHub `main` (86476ec). If they differ, copy over every source file except `.git`.
- `vite.config.ts`: remove `vite-plugin-vercel` and the `/api/resend` dev proxy.
- `src/App.tsx`: remove `@vercel/analytics`.
- `package.json`: remove both Vercel packages.
- Delete `vercel.json`.
- Move the `/api/resend` callers (forgot-password, OTP/phone verification, user-credentials dialog) to edge functions.
- Add `VITE_POLAR_ORGANIZATION_ID`.
- Remove the browser-side use of `VITE_SUPABASE_SERVICE_ROLE_KEY` (`createAdminClient`).
