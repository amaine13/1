# Who’s Driving Your Bus?

Author site for Judy Mahler Steinfeld, LCSW — static HTML, CSS, and JavaScript at [whoisdrivingyourbus.com](https://whoisdrivingyourbus.com/).

## Pages

- Home, About, Framework, Book, Work With Judy, Contact
- Early Readers: `join.html`, `login.html`, `read.html` (Chapters 1–3, signed-in only)

The sample chapters are **not** in this repository. They are extracted from the manuscript and written to Firestore by `scripts/seed_chapters.py`.

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
- Sample text: Firestore `chapters/{1|2|3}`, readable only when signed in
- Judy is emailed on each new join via FormSubmit (`heyjude201@gmail.com`)

## Contact

The contact form posts to FormSubmit → `heyjude201@gmail.com`.
