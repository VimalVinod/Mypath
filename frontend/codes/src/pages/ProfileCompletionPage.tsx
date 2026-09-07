import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';

export const ProfileCompletionPage: React.FC = () => {
  const { currentUser, completeGoogleProfile } = useApp();

  const [name, setName] = useState(currentUser?.displayName || '');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Name validation
    if (!name.trim()) {
      setErrorMsg('Name is required.');
      return;
    }

    // 2. Age validation (TC-B04: <= 0, > 120, non-integer)
    const parsedAge = Number(age);
    if (!age.trim() || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120 || !Number.isInteger(parsedAge)) {
      setErrorMsg('Please enter a valid age between 1 and 120.');
      return;
    }

    // 3. Username validation (TC-B05: empty, < 3 chars, allowed chars)
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setErrorMsg('Username is required.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setErrorMsg('Username must only contain alphanumeric characters and underscores.');
      return;
    }

    // 4. Password validation
    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    // 5. Submit profile completion (TC-B06: handles duplicate username)
    setLoading(true);
    try {
      await completeGoogleProfile({
        name: name.trim(),
        age: parsedAge,
        username: trimmedUsername,
        password
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backgroundColor: 'var(--bg-subtle)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', border: '1.5px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src={logoImg} alt="MyPath Logo" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Complete Your Profile</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Please set your username, age, and password to finish registration.
          </p>
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

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">Full Name</label>
            <input 
              id="name-input"
              aria-label="Full Name"
              type="text" 
              className="form-input" 
              placeholder="Enter your full name" 
              value={name} 
              onChange={e => { setName(e.target.value); setErrorMsg(null); }} 
            />
          </div>

          {/* Age */}
          <div className="form-group">
            <label className="form-label" htmlFor="age-input">Age</label>
            <input 
              id="age-input"
              aria-label="Age"
              type="number" 
              className="form-input" 
              placeholder="Enter your age" 
              value={age} 
              onChange={e => { setAge(e.target.value); setErrorMsg(null); }} 
            />
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username-input">Username</label>
            <input 
              id="username-input"
              aria-label="Username"
              type="text" 
              className="form-input" 
              placeholder="Choose a user handle" 
              value={username} 
              onChange={e => { setUsername(e.target.value); setErrorMsg(null); }} 
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">Password</label>
            <input 
              id="password-input"
              aria-label="Password"
              type="password" 
              className="form-input" 
              placeholder="Set your account password" 
              value={password} 
              onChange={e => { setPassword(e.target.value); setErrorMsg(null); }} 
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            style={{ marginTop: '0.75rem' }} 
            disabled={loading}
          >
            {loading ? 'Saving Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletionPage;
