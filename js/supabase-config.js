/**
 * Public Supabase config for Early Reader accounts.
 *
 * Paste Project URL and anon public key from
 * Supabase → Project Settings → API.
 * Until both are real values, join/login still render and show
 * “accounts are being connected”.
 *
 * Never put the service_role key in this file.
 */
export const supabaseConfig = {
  url: '',
  anonKey: ''
};

const PLACEHOLDERS = new Set([
  '',
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY',
  'REPLACE_ME'
]);

export function isAccountsConfigured() {
  return Boolean(
    supabaseConfig.url &&
      supabaseConfig.anonKey &&
      !PLACEHOLDERS.has(supabaseConfig.url) &&
      !PLACEHOLDERS.has(supabaseConfig.anonKey) &&
      supabaseConfig.url.indexOf('https://') === 0
  );
}
