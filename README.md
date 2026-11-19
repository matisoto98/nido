# Nido 🪺

Your home's shared space: shopping list, pantry, meal plan, shared expenses (Splitwise-style), recurring bills with PDF records, chore rota, calendar and a notes board.

It's a web app you install on your phone's home screen. Everyone signs in with their email, with no passwords and no extra accounts.

**Live app:** https://matisoto98.github.io/nido/

---

## Install on your phone

- **iPhone:** open the link in **Safari** → **Share** → **Add to Home Screen**.
- **Android:** open it in Chrome → menu (⋮) → **Install app**.

## Invite your housemates

1. In Nido, go to **People** and type each person's email under their name.
2. Send them the link. They enter their email, get a 6-digit code, and they're in, already linked to their name.

---

## One-time setup (Supabase, free)

Nido stores its data in a free Supabase project. Only people whose email is on your home's member list can read or change it.

1. **Create a project.** Sign up at [supabase.com](https://supabase.com) → **New project**. Pick a region close to you (e.g. *West EU (Paris)* or *Central EU (Frankfurt)*) and any database password.
2. **Create the database.** Open **SQL Editor** → **New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), then click **Run**.
3. **Send codes instead of links.** Go to **Authentication** → **Emails** (email templates). In **both** the **Magic link** and the **Confirm signup** templates, replace the body with:

   ```html
   <h2>Your Nido sign-in code</h2>
   <p>Enter this code in Nido:</p>
   <h1 style="letter-spacing:6px">{{ .Token }}</h1>
   <p>Didn't ask for this? You can ignore this email.</p>
   ```

   (Codes work inside the home-screen app; plain links would open Safari instead.)
4. **Set the app address.** Go to **Authentication** → **URL Configuration**: set **Site URL** to `https://matisoto98.github.io/nido/` and add the same URL under **Redirect URLs**.
5. **Connect the app.** Go to **Project Settings** → **API keys** (or **Data API**). Copy the **Project URL** and the **anon / publishable** key into [`config.js`](config.js). Both are safe to publish; the security rules in step 2 protect the data.

### Moving data over from the Claude version

On the first sign-in, choose **Start a new home** and pick the `nido-data.json` export under **Import data**.

### Good to know

- Supabase's built-in email sender is meant for light use and only sends a few emails per hour. That's fine for a household signing in once per device. If codes stop arriving, connect a free SMTP sender (e.g. Resend) under **Authentication** → **Emails** → **SMTP settings**.
- Free Supabase projects pause after a week with no activity. Opening Nido regularly keeps it awake; if it pauses, click **Restore** in the Supabase dashboard.
- Edits sync live between phones. If two people change things at the same moment, both changes are kept.
- The app keeps working offline with the last data it saw, and saves when you're back online.

## Files

| File | What it is |
|---|---|
| `index.html`, `app.js`, `styles.css` | The app |
| `config.js` | Your Supabase URL and public key |
| `manifest.webmanifest`, `sw.js`, `icons/` | Home-screen install, offline support and icons |
| `supabase/schema.sql` | Database tables, security rules and file storage |
