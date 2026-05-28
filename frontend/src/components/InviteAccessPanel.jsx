import { useEffect, useMemo, useState } from 'react';
import { apiFetch, withApiBase } from '../lib/apiBase';

const ACCESS_REQUEST_URL = withApiBase('/api/access/request');
const ACCESS_STATUS_URL = withApiBase('/api/access/status');
const ADMIN_PENDING_URL = withApiBase('/api/admin/access/pending');
const ADMIN_APPROVE_URL = withApiBase('/api/admin/access/approve');
const ADMIN_AUTH_USERS_URL = withApiBase('/api/admin/auth/users');
const ADMIN_AUTH_UPSERT_URL = withApiBase('/api/admin/auth/users/upsert');
const ADMIN_AUTH_ACTIVE_URL = withApiBase('/api/admin/auth/users/active');

const ACCESS_EMAIL_KEY = 'gp_access_email';
const ACCESS_ADMIN_KEY = 'gp_access_admin_key';

function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export default function InviteAccessPanel() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusTone, setStatusTone] = useState('neutral');
  const [checking, setChecking] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminPending, setAdminPending] = useState([]);
  const [adminStatus, setAdminStatus] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [approvingEmail, setApprovingEmail] = useState('');
  const [authUsers, setAuthUsers] = useState([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [savingAccessId, setSavingAccessId] = useState('');
  const [authForm, setAuthForm] = useState({
    accessId: '',
    password: '',
    displayName: '',
    assignedProfileHash: '',
    role: 'user',
    insightsLimit: '55'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedEmail = sanitizeEmail(window.localStorage.getItem(ACCESS_EMAIL_KEY));
    const storedAdmin = String(window.localStorage.getItem(ACCESS_ADMIN_KEY) || '').trim();
    if (storedEmail) setEmail(storedEmail);
    if (storedAdmin) setAdminKey(storedAdmin);
  }, []);

  const badgeClass = useMemo(() => {
    if (statusTone === 'success') return 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100';
    if (statusTone === 'warn') return 'border-amber-300/35 bg-amber-500/10 text-amber-100';
    if (statusTone === 'error') return 'border-red-300/35 bg-red-500/10 text-red-100';
    return 'border-blue-300/30 bg-blue-500/10 text-blue-100';
  }, [statusTone]);

  function persistAccessEmail(nextEmail) {
    const clean = sanitizeEmail(nextEmail);
    if (typeof window === 'undefined') return;
    if (clean) window.localStorage.setItem(ACCESS_EMAIL_KEY, clean);
    else window.localStorage.removeItem(ACCESS_EMAIL_KEY);
  }

  function persistAdminKey(nextKey) {
    if (typeof window === 'undefined') return;
    const clean = String(nextKey || '').trim();
    if (clean) window.localStorage.setItem(ACCESS_ADMIN_KEY, clean);
    else window.localStorage.removeItem(ACCESS_ADMIN_KEY);
  }

  async function checkStatus() {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      setStatusTone('warn');
      setStatusMsg('Enter your email first.');
      return;
    }
    setChecking(true);
    try {
      const res = await apiFetch(`${ACCESS_STATUS_URL}?email=${encodeURIComponent(cleanEmail)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Status check failed (${res.status}).`);
      persistAccessEmail(cleanEmail);
      if (data?.approved) {
        setStatusTone('success');
        setStatusMsg(`Approved: ${cleanEmail}. You can use chart + chat now.`);
      } else {
        setStatusTone('warn');
        setStatusMsg(`Not approved yet for ${cleanEmail}. Submit request or wait for review.`);
      }
    } catch (error) {
      setStatusTone('error');
      setStatusMsg(error?.message || 'Could not check access status.');
    } finally {
      setChecking(false);
    }
  }

  async function submitRequest(e) {
    e.preventDefault();
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      setStatusTone('warn');
      setStatusMsg('Email is required.');
      return;
    }
    setRequesting(true);
    try {
      const res = await apiFetch(ACCESS_REQUEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: String(name || '').trim(),
          phone: String(phone || '').trim(),
          note: String(note || '').trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Request failed (${res.status}).`);
      persistAccessEmail(cleanEmail);
      setStatusTone('success');
      setStatusMsg('Request submitted. You will be approved manually.');
    } catch (error) {
      setStatusTone('error');
      setStatusMsg(error?.message || 'Could not submit request.');
    } finally {
      setRequesting(false);
    }
  }

  async function loadPending() {
    const key = String(adminKey || '').trim();
    if (!key) {
      setAdminStatus('Enter admin key first.');
      return;
    }
    setAdminLoading(true);
    setAdminStatus('');
    try {
      const res = await apiFetch(ADMIN_PENDING_URL, {
        headers: { 'x-admin-key': key }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Pending fetch failed (${res.status}).`);
      setAdminPending(Array.isArray(data?.pending) ? data.pending : []);
      persistAdminKey(key);
      setAdminStatus(`Loaded ${Number(data?.count || 0)} pending request(s).`);
    } catch (error) {
      setAdminStatus(error?.message || 'Could not load pending requests.');
    } finally {
      setAdminLoading(false);
    }
  }

  async function approve(emailToApprove) {
    const clean = sanitizeEmail(emailToApprove);
    const key = String(adminKey || '').trim();
    if (!clean || !key) return;
    setApprovingEmail(clean);
    setAdminStatus('');
    try {
      const res = await apiFetch(ADMIN_APPROVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key
        },
        body: JSON.stringify({
          email: clean,
          approvedBy: 'manual-admin'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Approve failed (${res.status}).`);
      setAdminPending((prev) => prev.filter((row) => sanitizeEmail(row?.email) !== clean));
      setAdminStatus(`Approved ${clean}.`);
    } catch (error) {
      setAdminStatus(error?.message || 'Approval failed.');
    } finally {
      setApprovingEmail('');
    }
  }

  async function loadAuthUsers() {
    const key = String(adminKey || '').trim();
    if (!key) {
      setAuthStatus('Enter admin key first.');
      return;
    }
    setAuthLoading(true);
    setAuthStatus('');
    try {
      const res = await apiFetch(ADMIN_AUTH_USERS_URL, {
        headers: { 'x-admin-key': key }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `User list failed (${res.status}).`);
      setAuthUsers(Array.isArray(data?.users) ? data.users : []);
      persistAdminKey(key);
      setAuthStatus(`Loaded ${Array.isArray(data?.users) ? data.users.length : 0} auth user(s).`);
    } catch (error) {
      setAuthStatus(error?.message || 'Could not load auth users.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function createOrResetAuthUser() {
    const key = String(adminKey || '').trim();
    const accessId = String(authForm.accessId || '').trim().toLowerCase();
    const password = String(authForm.password || '');
    const displayName = String(authForm.displayName || '').trim();
    const assignedProfileHash = String(authForm.assignedProfileHash || '').trim();
    const role = String(authForm.role || 'user').toLowerCase() === 'admin' ? 'admin' : 'user';
    const insightsLimit = Number(authForm.insightsLimit || 55);
    if (!key) {
      setAuthStatus('Enter admin key first.');
      return;
    }
    if (!accessId || !password) {
      setAuthStatus('Access ID and password are required.');
      return;
    }
    setSavingAccessId(accessId);
    setAuthStatus('');
    try {
      const res = await apiFetch(ADMIN_AUTH_UPSERT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key
        },
        body: JSON.stringify({
          accessId,
          password,
          displayName: displayName || undefined,
          assignedProfileHash: assignedProfileHash || undefined,
          role,
          insightsLimit: Number.isFinite(insightsLimit) ? insightsLimit : 55
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `User upsert failed (${res.status}).`);
      setAuthStatus(`Saved auth user ${accessId}.`);
      setAuthForm((prev) => ({ ...prev, password: '' }));
      await loadAuthUsers();
    } catch (error) {
      setAuthStatus(error?.message || 'Could not save auth user.');
    } finally {
      setSavingAccessId('');
    }
  }

  async function setAuthUserActive(accessId, active) {
    const key = String(adminKey || '').trim();
    const clean = String(accessId || '').trim().toLowerCase();
    if (!key || !clean) return;
    setSavingAccessId(clean);
    setAuthStatus('');
    try {
      const res = await apiFetch(ADMIN_AUTH_ACTIVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key
        },
        body: JSON.stringify({ accessId: clean, active })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Status update failed (${res.status}).`);
      setAuthStatus(`${clean} is now ${active ? 'active' : 'inactive'}.`);
      await loadAuthUsers();
    } catch (error) {
      setAuthStatus(error?.message || 'Could not update user status.');
    } finally {
      setSavingAccessId('');
    }
  }

  return (
    <section className="mb-6 rounded-3xl border border-blue-300/25 bg-blue-900/10 p-4 sm:p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-blue-200/80">Invite-only access</p>
      <p className="mt-2 text-sm text-ivory/75">
        If chart/chat is gated, set your approved email first. Then all API calls automatically include it.
      </p>

      <form onSubmit={submitRequest} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-xl border border-blue-200/30 bg-black/35 px-3 py-2 text-sm text-cream outline-none"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          className="rounded-xl border border-blue-200/30 bg-black/35 px-3 py-2 text-sm text-cream outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="rounded-xl border border-blue-200/30 bg-black/35 px-3 py-2 text-sm text-cream outline-none"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="rounded-xl border border-blue-200/30 bg-black/35 px-3 py-2 text-sm text-cream outline-none"
        />
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={checkStatus}
            disabled={checking}
            className="rounded-full border border-blue-200/45 bg-blue-300/10 px-4 py-2 text-xs font-semibold text-blue-100 disabled:opacity-55"
          >
            {checking ? 'Checking...' : 'Check approval status'}
          </button>
          <button
            type="submit"
            disabled={requesting}
            className="rounded-full border border-emerald-200/45 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-55"
          >
            {requesting ? 'Submitting...' : 'Request access'}
          </button>
        </div>
      </form>

      {statusMsg ? <p className={`mt-3 rounded-xl border px-3 py-2 text-xs ${badgeClass}`}>{statusMsg}</p> : null}

      <div className="mt-4 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={() => setAdminOpen((prev) => !prev)}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/85"
        >
          {adminOpen ? 'Hide admin approvals' : 'Show admin approvals'}
        </button>

        {adminOpen ? (
          <div className="mt-3 rounded-2xl border border-amber-200/20 bg-black/30 p-3">
            <div className="flex flex-wrap gap-2">
              <input
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin key"
                className="min-w-[220px] flex-1 rounded-xl border border-amber-200/30 bg-black/40 px-3 py-2 text-xs text-cream outline-none"
              />
              <button
                type="button"
                onClick={loadPending}
                disabled={adminLoading}
                className="rounded-full border border-amber-200/45 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-100 disabled:opacity-55"
              >
                {adminLoading ? 'Loading...' : 'Load pending'}
              </button>
              <button
                type="button"
                onClick={loadAuthUsers}
                disabled={authLoading}
                className="rounded-full border border-amber-200/45 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-100 disabled:opacity-55"
              >
                {authLoading ? 'Loading users...' : 'Load auth users'}
              </button>
            </div>

            {adminStatus ? <p className="mt-2 text-xs text-amber-100/85">{adminStatus}</p> : null}

            <div className="mt-3 space-y-2">
              {adminPending.length === 0 ? (
                <p className="text-xs text-ivory/55">No pending requests loaded.</p>
              ) : (
                adminPending.map((row) => {
                  const rowEmail = sanitizeEmail(row?.email);
                  return (
                    <div
                      key={rowEmail}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-cream">{rowEmail}</p>
                        <p className="text-ivory/65">
                          {row?.name || 'No name'} {row?.phone ? `· ${row.phone}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => approve(rowEmail)}
                        disabled={approvingEmail === rowEmail}
                        className="rounded-full border border-emerald-200/45 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-100 disabled:opacity-55"
                      >
                        {approvingEmail === rowEmail ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/85">
                Auth users (create/reset)
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={authForm.accessId}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, accessId: e.target.value }))}
                  placeholder="Access ID"
                  className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-cream outline-none"
                />
                <input
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  type="password"
                  className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-cream outline-none"
                />
                <input
                  value={authForm.displayName}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Display name (optional)"
                  className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-cream outline-none"
                />
                <input
                  value={authForm.assignedProfileHash}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, assignedProfileHash: e.target.value }))}
                  placeholder="Assigned profileHash (optional)"
                  className="sm:col-span-2 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-cream outline-none"
                />
                <select
                  value={authForm.role}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-cream outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  value={authForm.insightsLimit}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, insightsLimit: e.target.value }))}
                  placeholder="Insights limit (default 55)"
                  className="rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs text-cream outline-none"
                />
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={createOrResetAuthUser}
                  disabled={Boolean(savingAccessId)}
                  className="rounded-full border border-emerald-200/45 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-100 disabled:opacity-55"
                >
                  {savingAccessId ? 'Saving...' : 'Create / reset auth user'}
                </button>
              </div>
              {authStatus ? <p className="mt-2 text-xs text-emerald-100/85">{authStatus}</p> : null}

              <div className="mt-3 space-y-2">
                {authUsers.length === 0 ? (
                  <p className="text-xs text-ivory/55">No auth users loaded.</p>
                ) : (
                  authUsers.map((u) => {
                    const id = String(u?.accessId || '').toLowerCase();
                    const isActive = u?.active !== false;
                    return (
                      <div
                        key={id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-cream">{id}</p>
                          <p className="text-ivory/65">
                            {u?.displayName || 'No display name'} · {u?.role || 'user'} · {isActive ? 'active' : 'inactive'}
                          </p>
                          {u?.assignedProfileHash ? (
                            <p className="mt-0.5 break-all text-[10px] text-ivory/45">
                              profileHash: {u.assignedProfileHash}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-[10px] text-ivory/45">
                            insights: {Number(u?.insightsUsed || 0)} / {Number(u?.insightsLimit || 55)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAuthUserActive(id, !isActive)}
                          disabled={savingAccessId === id}
                          className="rounded-full border border-blue-200/45 bg-blue-300/10 px-3 py-1 text-[11px] font-semibold text-blue-100 disabled:opacity-55"
                        >
                          {savingAccessId === id ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
