# Early Readers: Supabase setup

The public site is static HTML. Accounts, reader names/emails, and the sample (Introduction + Chapters 1–3) live in a Supabase project. Until the public URL and anon key are pasted into `js/supabase-config.js`, join and login still render and show **Accounts are being connected**.

Do **not** commit the manuscript, chapter HTML, or the `service_role` key.

## 1. Create the project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and sign in (GitHub is fine).
2. **New project**. Name it something like `whoisdrivingyourbus`. Pick a nearby region. Set a database password and save it.
3. Wait until the project is ready (green).

## 2. Create the tables

1. Left sidebar → **SQL Editor** → **New query**.
2. Paste everything in `supabase/schema.sql` from this repo.
3. Click **Run**. You should see success, no red errors.

That creates:

- `readers` — one row per Early Reader (this is the mailing list)
- `chapters` — Introduction + Chapters 1–3, readable only when signed in

## 3. Email / password sign-in

1. **Authentication** → **Providers** → **Email**.
2. Leave Email enabled.
3. Turn **Confirm email** **off** (so Join goes straight to the reading room).
4. Save.

Then **Authentication** → **URL Configuration**:

- Site URL: `https://whoisdrivingyourbus.com`
- Redirect URLs: add `https://whoisdrivingyourbus.com/login.html` and `https://whoisdrivingyourbus.com/**`

## 4. Copy the public keys

**Project Settings** (gear) → **API**:

- Project URL → looks like `https://xxxx.supabase.co`
- `anon` `public` key → a long JWT

These two values are meant to be public. Never copy the `service_role` key into the website.

Send those two values, or paste them into `js/supabase-config.js`:

```js
export const supabaseConfig = {
  url: 'https://xxxx.supabase.co',
  anonKey: 'eyJ…'
};
```

## 5. Seed the Introduction and Chapters 1–3

Keep the manuscript off the public site. On a private computer:

```bash
export SUPABASE_URL=https://xxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ…   # the secret service_role key
python3 scripts/seed_chapters.py \
  --manuscript /path/to/Whos_Driving_Your_Bus_MANUSCRIPT_v5.docx
```

`--print-only` extracts and reports word counts without writing anything.

The `service_role` key is under Project Settings → API. Do not commit it.

## 6. What gets stored

Each join writes a `readers` row (name, email, consent time, `source = early-reader`) and Judy also gets a FormSubmit email at `heyjude201@gmail.com`.

## 7. Check

After the public keys are on the live site, open https://whoisdrivingyourbus.com/join and create a test account. You should land on the reading room. If the chapters are not seeded yet, the room opens but the text will say they are not available yet.
