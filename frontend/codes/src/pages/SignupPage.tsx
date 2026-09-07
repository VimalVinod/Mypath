import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const SignupPage: React.FC = () => {
  const { navigate, signupWithEmail, loginWithGoogle } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Password confirmation check (TC-B01)
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    // 2. Weak password check (TC-B02)
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    // 3. Email format check (TC-B03)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail(email.trim(), password);
      setSuccessMsg('Account created! A verification link has been sent to your email. Please verify before logging in.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      let msg = err.message || 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Email already in use. Please log in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
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
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', position: 'relative', zIndex: 1, border: '1.5px solid var(--border)' }}>
        <button 
          onClick={() => navigate('/')} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={16} /> Back to home
        </button>

        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src={logoImg} alt="MyPath Logo" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Create Account</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sign up to start your exam preparation journey</p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div 
            role="alert"
            style={{ 
              backgroundColor: '#FDF0ED', 
              border: '1px solid var(--error, #EF4444)', 
              borderRadius: '8px', 
              padding: '0.85rem 1rem', 
              marginBottom: '1.25rem', 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.6rem',
              color: 'var(--error, #EF4444)',
              fontSize: '0.85rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div 
            style={{ 
              backgroundColor: '#ECFDF5', 
              border: '1px solid #10B981', 
              borderRadius: '8px', 
              padding: '0.85rem 1rem', 
              marginBottom: '1.25rem', 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.6rem',
              color: '#065F46',
              fontSize: '0.85rem'
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input 
              id="email-input"
              type="email" 
              className="form-input" 
              placeholder="Enter your email" 
              value={email} 
              onChange={e => { setEmail(e.target.value); setErrorMsg(null); }} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                id="password-input"
                type={showPassword ? 'text' : 'password'} 
                className="form-input" 
                placeholder="Enter your password" 
                value={password} 
                onChange={e => { setPassword(e.target.value); setErrorMsg(null); }} 
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password-input">Confirm Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                id="confirm-password-input"
                type={showConfirmPassword ? 'text' : 'password'} 
                className="form-input" 
                placeholder="Confirm your password" 
                value={confirmPassword} 
                onChange={e => { setConfirmPassword(e.target.value); setErrorMsg(null); }} 
                required 
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            style={{ marginTop: '0.5rem' }} 
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Divider & Google Sign-In */}
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

        {/* Existing account link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate('/login'); }} 
              style={{ color: 'var(--brand-red)', fontWeight: 700, textDecoration: 'underline' }}
            >
              Log In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
