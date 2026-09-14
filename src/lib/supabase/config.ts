export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes('your-project-ref') || key.includes('your_key')) return null;
  return { url, key };
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://gap.invalid');
    return url.origin === 'https://gap.invalid' ? url.pathname + url.search + url.hash : '/';
  } catch { return '/'; }
}
