# Nido 🪺

Your home's shared space: shopping list, pantry, meal plan, shared expenses (Splitwise-style), recurring bills with PDF records, chore rota, calendar and a notes board.

It's a web app you install on your phone's home screen. Everyone has their own Nido account (email + password).

**Live app:** https://matisoto98.github.io/nido/

---

## Install on your phone

- **iPhone:** open the link in **Safari** → **Share** → **Add to Home Screen**.
- **Android:** open it in Chrome → menu (⋮) → **Install app**.

## Roles

- **Admin** (whoever created the home): invites and removes people, changes roles, and sees the **People → Activity** page: who's online, when everyone was last active, and a log of every action ("Santiago got “Huevos”", "Aldo added the expense …").
- **User**: everything else — lists, money, chores, calendar, notes.

A home always keeps at least one admin.

## Invite your housemates

1. In Nido, go to **People** and type each person's email under their name.
2. Send them the link. They tap **Create account** with that same email, confirm it from the email Supabase sends, and sign in. They're already linked to their name.

---

## One-time setup (Supabase, free)

Nido stores its data in a free Supabase project. Only people whose email is on your home's member list can read or change it.

1. **Create a project.** Sign up at [supabase.com](https://supabase.com) → **New project**. Pick a region close to you (e.g. *West EU (Paris)* or *Central EU (Frankfurt)*) and any database password.
2. **Create the database.** Open **SQL Editor** → **New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), then click **Run**. Do the same with [`supabase/002_roles_activity.sql`](supabase/002_roles_activity.sql).
3. **Set the app address.** Go to **Authentication** → **URL Configuration**: set **Site URL** to `https://matisoto98.github.io/nido/` and add the same URL under **Redirect URLs**.
4. **Connect the app.** Go to **Project Settings** → **API keys** (or **Data API**). Copy the **Project URL** and the **anon / publishable** key into [`config.js`](config.js). Both are safe to publish; the security rules in step 2 protect the data.

### Moving data over from the Claude version

On the first sign-in, choose **Start a new home** and pick the `nido-data.json` export under **Import data**.

### Good to know

- Supabase's built-in email sender only sends a few emails per hour (confirmations and password resets). If several people sign up at once and an email doesn't arrive, wait an hour and use **Send the confirmation email again**. To lift the limit, connect your own sender under **Authentication** → **Emails** → **SMTP settings**.
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
