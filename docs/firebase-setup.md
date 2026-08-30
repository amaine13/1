# Early Readers: Firebase setup

The public site is static HTML. Accounts, the mailing list, and Chapters 1–3 live in a Firebase project. Until the public web config is pasted into `js/firebase-config.js`, join and login still render and show **Accounts are being connected** instead of failing silently.

Do **not** commit the manuscript or chapter HTML to the repo.

## 1. Create the project

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project (Spark / free plan is enough).
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Firestore** database (production mode is fine; deploy the rules in this repo immediately).
4. Add a **Web app**. Copy the public `firebaseConfig` object.

## 2. Authorized domains

Under Authentication → Settings → Authorized domains, add:

- `whoisdrivingyourbus.com`
- `www.whoisdrivingyourbus.com`
- `localhost` (already present; keep it for local checks)

## 3. Paste the public config

Edit `js/firebase-config.js` and replace the empty strings:

```js
export const firebaseConfig = {
  apiKey: "…",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
```

These values are meant to be public. Never put a service-account private key in this file.

## 4. Deploy security rules

From a machine with the [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

The rules file is `firebase/firestore.rules`:

- `readers/{uid}` — the signed-in reader can read/write only their own profile
- `chapters/{1|2|3}` — signed-in users can read; nobody can write from the client

## 5. Seed Chapters 1–3

Keep the manuscript off the public site. On a private machine:

```bash
pip install firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
python3 scripts/seed_chapters.py \
  --manuscript /path/to/Whos_Driving_Your_Bus_MANUSCRIPT_v5.docx \
  --project YOUR_PROJECT_ID
```

Create the service account in Google Cloud → IAM → Service accounts, with permission to write Firestore. Do not commit that JSON.

`--print-only` extracts and reports word counts without writing anything.

## 6. Password reset email

Authentication → Templates → Password reset. Set the sender name to Judy / Who’s Driving Your Bus? and confirm the action URL uses your authorized domain.

## 7. What gets stored (this is the mailing list)

Each join writes `readers/{uid}`:

| Field | Meaning |
| --- | --- |
| `firstName`, `lastName`, `name` | Reader name |
| `email` | Account email |
| `consent` | Must be `true` |
| `consentAt` | ISO timestamp of the required disclaimer |
| `createdAt` | Server timestamp |
| `source` | `early-reader` |
| `feedback` | Optional notes keyed by chapter id (`1`, `2`, `3`) |

Export later from Firestore or BigQuery. No Mailchimp or CRM is required for this pass.

Judy also receives an email on every new join, via the same FormSubmit address as the contact form (`heyjude201@gmail.com`).

## 8. Local check

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/join.html`. If config is still empty, the gold banner should say accounts are being connected. After config + rules + seed, join → reading room should load Chapters 1–3.
