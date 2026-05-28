import { useState } from 'react';
import { apiFetch, withApiBase } from '../lib/apiBase';

const AUTH_LOGIN_URL = withApiBase('/api/auth/login');

export default function AuthLoginGate({ onLoginSuccess }) {
  const [accessId, setAccessId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch(AUTH_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessId: String(accessId || '').trim(),
          password
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Login failed (${res.status})`);
      }
      onLoginSuccess?.(data?.user || { accessId: String(accessId || '').trim().toLowerCase() });
    } catch (err) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-void text-ivory">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,0.09),transparent_28%)]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[560px] items-center px-4 py-8">
        <section className="w-full rounded-3xl border border-gold/25 bg-onyx/80 p-6 shadow-2xl shadow-black/50">
          <p className="text-xs uppercase tracking-[0.34em] text-gold/70">GrahaPath Access</p>
          <h1 className="mt-3 font-serif text-2xl text-gold">Private Login</h1>
          <p className="mt-2 text-sm text-ivory/70">
            Enter your access ID and password provided by admin.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="text"
              value={accessId}
              onChange={(e) => setAccessId(e.target.value)}
              placeholder="Access ID"
              className="w-full rounded-xl border border-gold/25 bg-black/35 px-3 py-2.5 text-sm text-cream outline-none"
              autoComplete="username"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-gold/25 bg-black/35 px-3 py-2.5 text-sm text-cream outline-none"
              autoComplete="current-password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-gold/45 bg-gold/15 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/20 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {error ? (
            <p className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
