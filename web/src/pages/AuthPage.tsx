import { useState } from 'react';
import { insforge } from '../lib/insforge';
import { useApp } from '../state/AppContext';

type Mode = 'signin' | 'signup' | 'verify' | 'forgot' | 'reset';

export default function AuthPage() {
  const { refresh } = useApp();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m); setError(null); setNotice(null); setOtp('');
  }

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
      } else if (mode === 'forgot') {
        const { error } = await insforge.auth.sendResetPasswordEmail({ email });
        if (error) throw new Error((error as any).message || 'Could not send the reset code');
        setMode('reset');
        setNotice(`If an account exists for ${email}, a 6-digit reset code is on its way.`);
      } else if (mode === 'reset') {
        const { data: ex, error: e1 } = await insforge.auth.exchangeResetPasswordToken({ email, code: otp });
        if (e1 || !(ex as any)?.token) throw new Error((e1 as any)?.message || 'Invalid or expired reset code');
        const { error: e2 } = await insforge.auth.resetPassword({ newPassword, otp: (ex as any).token });
        if (e2) throw new Error((e2 as any).message || 'Password reset failed');
        setMode('signin');
        setNotice('Password updated — sign in with your new password.');
        setPassword('');
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

  async function github() {
    setError(null);
    try {
      await insforge.auth.signInWithOAuth('github', { redirectTo: window.location.origin + '/home' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sign-in failed');
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

  const titles: Record<Mode, [string, string]> = {
    signin: ['Welcome back', 'Pick up where your pipeline left off.'],
    signup: ['Create your Seerist account', 'Set up your team in about two minutes.'],
    verify: ['Verify your email', `One quick step — we sent a code to ${email || 'your inbox'}.`],
    forgot: ['Reset your password', "Enter your email and we'll send a 6-digit reset code."],
    reset: ['Choose a new password', 'Enter the code from your email and a new password.'],
  };

  return (
    <div className="auth-wrap">
      <div className="auth-story">
        <div className="row" style={{ marginBottom: 26 }}>
          <span style={{ background: '#fff', borderRadius: 11, padding: 5, display: 'inline-flex' }}>
            <img src="/logo.svg" alt="Seerist" width={34} height={34} style={{ display: 'block' }} />
          </span>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 20, color: '#fff' }}>Seerist</span>
        </div>
        <h2>Every bid should win you something.</h2>
        <p>Seerist turns freelance-platform bidding into a triple-outcome channel: win the contract, drive a product signup, or build brand awareness — at zero ad spend. Then deliver the work with AI and a mandatory human QA gate.</p>
        <div className="auth-points">
          <div className="auth-point"><div className="dot">🔭</div><div><b>Capture & score while you browse</b><span>One click on any Upwork job. AI fit scores always come with plain-language reasoning.</span></div></div>
          <div className="auth-point"><div className="dot">✍️</div><div><b>Policy-safe proposals in seconds</b><span>Product mentions follow a curated per-platform policy. You review, you approve, you click Submit.</span></div></div>
          <div className="auth-point"><div className="dot">🤖</div><div><b>Seven AI employees, one audit log</b><span>From The Scout to a bounded-autonomy CEO — every action logged, money moves always need your approval.</span></div></div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <h1>{titles[mode][0]}</h1>
          <p className="auth-sub">{titles[mode][1]}</p>

          {error && <div className="error-box mb">{error}</div>}
          {notice && <div className="info-box mb">{notice}</div>}

          {(mode === 'signin' || mode === 'signup') && (
            <>
              <button className="btn github" style={{ width: '100%', justifyContent: 'center' }} onClick={() => void github()}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                Continue with GitHub
              </button>
              <div className="auth-divider">or with email</div>
            </>
          )}

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <div className="field">
                <label>Your name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
              </div>
            )}
            {mode !== 'verify' && (
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" disabled={mode === 'reset'} />
              </div>
            )}
            {(mode === 'signin' || mode === 'signup') && (
              <div className="field">
                <label className="spread"><span>Password</span>{mode === 'signin' && <a onClick={() => switchMode('forgot')} style={{ cursor: 'pointer', fontWeight: 500 }}>Forgot?</a>}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
              </div>
            )}
            {(mode === 'verify' || mode === 'reset') && (
              <div className="field">
                <label>6-digit code</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="123456" inputMode="numeric" />
                {mode === 'verify' && <span className="help">Didn't get it? <a onClick={resend} style={{ cursor: 'pointer' }}>Resend code</a></span>}
              </div>
            )}
            {mode === 'reset' && (
              <div className="field">
                <label>New password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
              </div>
            )}
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
              {busy ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> :
                mode === 'signup' ? 'Create account' :
                mode === 'verify' ? 'Verify & continue' :
                mode === 'forgot' ? 'Send reset code' :
                mode === 'reset' ? 'Set new password' : 'Sign in'}
            </button>
          </form>

          <div className="auth-toggle">
            {mode === 'signin' && <>New to Seerist? <a onClick={() => switchMode('signup')} style={{ cursor: 'pointer' }}>Create an account</a></>}
            {mode === 'signup' && <>Already have an account? <a onClick={() => switchMode('signin')} style={{ cursor: 'pointer' }}>Sign in</a></>}
            {(mode === 'forgot' || mode === 'reset' || mode === 'verify') && <a onClick={() => switchMode('signin')} style={{ cursor: 'pointer' }}>← Back to sign in</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
