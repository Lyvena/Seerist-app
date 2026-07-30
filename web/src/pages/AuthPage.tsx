import { useState } from 'react';
import { insforge } from '../lib/insforge';
import { useApp } from '../state/AppContext';

type Mode = 'signin' | 'signup' | 'verify';

export default function AuthPage() {
  const { refresh } = useApp();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === 'signup') {
        const { data, error } = await insforge.auth.signUp({ email, password, name: name || undefined });
        if (error) throw new Error((error as any).message || 'Sign up failed');
        if ((data as any)?.requireEmailVerification) {
          setMode('verify');
          setNotice(`We emailed a 6-digit code to ${email}. Enter it below to verify your account.`);
        } else {
          await refresh();
        }
      } else if (mode === 'verify') {
        const { error } = await insforge.auth.verifyEmail({ email, otp });
        if (error) throw new Error((error as any).message || 'Verification failed');
        await refresh();
      } else {
        const { error } = await insforge.auth.signInWithPassword({ email, password });
        if (error) throw new Error((error as any).message || 'Sign in failed');
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true); setError(null);
    try {
      await insforge.auth.resendVerificationEmail({ email });
      setNotice(`A fresh code is on its way to ${email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-hero">
          <svg width="44" height="44" viewBox="0 0 32 32" style={{ marginBottom: 10 }}>
            <rect width="32" height="32" rx="8" fill="#0b1220" />
            <circle cx="16" cy="16" r="8" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="16" cy="16" r="3" fill="#38bdf8" />
          </svg>
          <h1>{mode === 'signup' ? 'Create your Seerist account' : mode === 'verify' ? 'Verify your email' : 'Welcome back to Seerist'}</h1>
          <p className="auth-sub">
            {mode === 'verify'
              ? 'One quick step to secure your account.'
              : 'Win the work. Deliver with AI. Grow the product — all from one console.'}
          </p>
        </div>

        {error && <div className="error-box mb">{error}</div>}
        {notice && <div className="info-box mb">{notice}</div>}

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div className="field">
              <label>Your name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" disabled={mode === 'verify'} />
          </div>
          {mode !== 'verify' && (
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
          )}
          {mode === 'verify' && (
            <div className="field">
              <label>6-digit code</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="123456" inputMode="numeric" />
              <span className="help">Didn't get it? <a onClick={resend} style={{ cursor: 'pointer' }}>Resend code</a></span>
            </div>
          )}
          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? <span className="spinner" /> : mode === 'signup' ? 'Create account' : mode === 'verify' ? 'Verify & continue' : 'Sign in'}
          </button>
        </form>

        {mode !== 'verify' && (
          <div className="auth-toggle">
            {mode === 'signin' ? (
              <>New to Seerist? <a onClick={() => { setMode('signup'); setError(null); }} style={{ cursor: 'pointer' }}>Create an account</a></>
            ) : (
              <>Already have an account? <a onClick={() => { setMode('signin'); setError(null); }} style={{ cursor: 'pointer' }}>Sign in</a></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
