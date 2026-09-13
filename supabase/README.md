# Early Reader setup (application + admin + feedback)

No reader accounts. No manuscript on the website.
The private Google Doc is shared manually after admin approval.

## 1. Configure keys
Paste into `assets/js/supabase-config.js`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (anon/public only — never service_role)

## 2. Run SQL
In Supabase SQL Editor, run:
`supabase/early-reader-setup.sql`

## 3. Create first admin
1. Auth → Users → Add user (email + password)
2. Copy the user UUID
3. Run:
```sql
insert into public.admin_users (id, email)
values ('PASTE-AUTH-USER-UUID-HERE', 'you@example.com')
on conflict (id) do update set email = excluded.email;
```

## 4. Auth URL settings
- Site URL: `https://whoisdrivingyourbus.com`
- Redirect URLs include: `https://whoisdrivingyourbus.com/admin.html`

## 5. Public pages
- `/join.html` — Request Early Reader Access
- `/feedback.html` — feedback after reading the Google Doc
- `/admin.html` — private admin dashboard (not linked in public nav)

## Optional cleanup
If you previously ran the old reader-auth / manuscript SQL, unused tables may exist
(`reader_profiles`, `reader_content`, `reader_progress`, `reader_feedback`).
They are commented at the bottom of `early-reader-setup.sql` — only drop if empty/unused.
