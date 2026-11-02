# Run CheckingCheckout on Lovable hosting (instead of Vercel)

## Step 0: your newest code (checked)
- Lovable and GitHub now match. The May 9 "Improve web loading states" changes are in this project, and the preview builds without errors.
- The only thing still missing is the Jun 4 commit, "Remove extra newline before closing statement". It's a tiny formatting tidy-up and doesn't change how the app works. To include it anyway, run `git pull` in your main repo, then push again.

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
