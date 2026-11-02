# Run CheckingCheckout on Lovable hosting (instead of Vercel)

## What I found
- This Lovable project already holds the newest code from your GitHub repo (`github-showcase-connect`). The latest commit "feat: added loading for currency" matches here and on GitHub.
- The preview opens your real sign-in page ("Welcome To Checking & Checkout") with no errors. It talks to your existing database.
- Some setup is still left over from Vercel hosting: a Vercel build add-on, Vercel visitor stats, and a Vercel routing file.
- The email step (Resend) depends on a shortcut that only works while developing, so it would stop working once the app is published.
- The billing (Polar) organization ID isn't set, so the upgrade/checkout button won't work yet.
- Your main repo, `kalanakt/app.checkingcheckout.com`, is private, so I can't read it. Its newest changes (up to Jun 4) aren't here yet. Lovable can only sync with the repo it created (`github-showcase-connect`), not one that already existed.

## Step 0 — bring in your newest code (you do this)
Pick one of these:
- **A (best):** On your computer, open your main project folder and run `git push https://github.com/eradharmarathne/github-showcase-connect.git main --force`. Lovable picks up the changes automatically.
- **B:** Make `kalanakt/app.checkingcheckout.com` public for a moment and tell me. I'll copy the newest files in here myself.

## What I will do
1. **Remove Vercel-only parts** so the app builds cleanly on Lovable:
   - Take out the Vercel build add-on and visitor stats.
   - Delete the Vercel routing file. Lovable hosting already sends every page link to the app.
2. **Keep the same look and features.** No screens change, and your database stays the one you use now.
3. **Fix email sending for the published site.** Emails will go through your server functions instead of the dev-only shortcut, so they still send after publishing.
4. **Set up billing.** I'll ask you for your Polar organization ID in a secure form. It's a public value, not a password.
5. **Check it works.** I'll sign in on the preview, then open the dashboard, reservations, calendar and reports to confirm they load.
6. **Publish on Lovable.** Once the checks pass, you click Publish and get a `*.lovable.app` web address. You can add your own domain later, such as `app.checkingcheckout.com`.

## After this
- Going forward, edit the app here in Lovable or push changes to the `main` branch on GitHub. Both stay in sync.
- When you're ready, point your domain at Lovable and switch off the Vercel deployment.

## Technical details
- `vite.config.ts`: remove `vite-plugin-vercel`, and drop the `/api/resend` dev proxy once its callers move over.
- `src/App.tsx`: remove the `@vercel/analytics` component. `package.json`: remove `@vercel/analytics` and `vite-plugin-vercel`.
- Delete `vercel.json`.
- Find the callers of `/api/resend` (forgot-password, OTP/phone verification, user-credentials dialog) and route them through the existing edge functions (`send-user-credentials`, `send-phone-otp`, etc.). Edge functions would be added only where none exists.
- Add `VITE_POLAR_ORGANIZATION_ID` as a publishable env value.
- Security cleanup: stop reading `VITE_SUPABASE_SERVICE_ROLE_KEY` in browser code (`createAdminClient` in `client.ts`). Admin work stays inside edge functions.
- Supabase project, migrations and RLS stay as they are.
