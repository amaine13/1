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
  url: 'https://fzpuuabczowjmywqdipw.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cHV1YWJjem93am15d3FkaXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjIwMjgsImV4cCI6MjEwMzY5ODAyOH0._aPDE4W2z92Es-FzSXrFCAjve09ZOlcXGw5d9nankQg'
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
