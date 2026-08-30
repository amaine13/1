# Who’s Driving Your Bus?

Author site for Judy Mahler Steinfeld, LCSW — static HTML, CSS, and JavaScript.

**Live:** [whoisdrivingyourbus.com](https://whoisdrivingyourbus.com/) publishes from `main`.

## Pages

- Home, About, Framework, Book, Work With Judy, Contact
- Early Readers: `join.html`, `login.html`, `read.html` (Introduction + Chapters 1–3, signed-in only)

The sample text is **not** in this repository. It is extracted from the manuscript and written to Supabase by `scripts/seed_chapters.py`.

## Local preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

## Early Readers / Supabase

Until `js/supabase-config.js` has a real project URL and anon key, join and login still work visually and show **Accounts are being connected**.

Setup steps: [docs/supabase-setup.md](docs/supabase-setup.md)

- Auth: Supabase email/password
- Profiles / mailing list: `readers` table
- Sample text: `chapters` (`intro`, `1`, `2`, `3`), readable only when signed in
- Judy is emailed on each new join via FormSubmit (`heyjude201@gmail.com`)

## Contact

The contact form posts to FormSubmit → `heyjude201@gmail.com`.
