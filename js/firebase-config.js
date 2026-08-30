/**
 * Public Firebase web config for Early Reader accounts.
 *
 * Paste the values from Firebase Console → Project settings → Your apps.
 * Until apiKey and projectId are real values, the join/login UI still
 * renders and shows a clear “accounts are being connected” state.
 *
 * Never put a service-account private key in this file.
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

const PLACEHOLDERS = new Set([
  '',
  'YOUR_API_KEY',
  'YOUR_PROJECT_ID',
  'REPLACE_ME'
]);

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      !PLACEHOLDERS.has(firebaseConfig.apiKey) &&
      !PLACEHOLDERS.has(firebaseConfig.projectId)
  );
}
