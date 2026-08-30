# Who’s Driving Your Bus?

Author site for Judy Mahler Steinfeld, LCSW — static HTML, CSS, and JavaScript.

**Production** (do not deploy the redesign here until it is approved): [whoisdrivingyourbus.com](https://whoisdrivingyourbus.com/) is published from `main`.

**Staging:** this feature branch’s Cloudflare Pages preview. Review there first.

## Pages

- Home, About, Framework, Book, Work With Judy, Contact
- Early Readers: `join.html`, `login.html`, `read.html` (Introduction + Chapters 1–3, signed-in only)

The sample text is **not** in this repository. It is extracted from the manuscript and written to Firestore by `scripts/seed_chapters.py`.

## Local preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

## Early Readers / Firebase

Until `js/firebase-config.js` has a real project config, join and login still work visually and show **Accounts are being connected**.

Setup steps: [docs/firebase-setup.md](docs/firebase-setup.md)

- Auth: Firebase email/password
- Profiles / mailing list: Firestore `readers/{uid}`
- Sample text: Firestore `chapters/{intro|1|2|3}`, readable only when signed in
- Judy is emailed on each new join via FormSubmit (`heyjude201@gmail.com`)

## Contact

The contact form posts to FormSubmit → `heyjude201@gmail.com`.
