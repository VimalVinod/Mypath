import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const LoginPage: React.FC = () => {
  const { navigate, loginWithEmail, loginWithGoogle } = useApp();

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      let msg = err.message || 'Failed to authenticate.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email address or password.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      let msg = err.message || 'Google Sign-In failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Google Sign-In popup was closed.';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '1.5rem', backgroundColor: 'var(--bg-subtle)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', position: 'relative', zIndex: 1, border: '1.5px solid var(--border)' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={16} /> Back to home
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src={logoImg} alt="MyPath Logo" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Log In</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log in to discover & track your exam matches</p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div 
            style={{ 
              backgroundColor: '#FDF0ED', 
              border: '1px solid var(--error)', 
              borderRadius: '8px', 
              padding: '0.85rem 1rem', 
              marginBottom: '1.25rem', 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.6rem',
              color: 'var(--error)',
              fontSize: '0.85rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="john.wick@gmail.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your email.'); }} style={{ fontSize: '0.8rem', color: 'var(--brand-red)', fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>

            {/* Password Input with Eye Toggle */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-input" 
                placeholder="Enter your password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Divider & Google Sign-In Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
        </div>

        <button 
          className="btn btn-ghost btn-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Google Sign In
        </button>

        {/* Clear Sign Up prompt */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate('/signup'); }} 
              style={{ color: 'var(--brand-red)', fontWeight: 700, textDecoration: 'underline' }}
            >
              Sign Up Free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
