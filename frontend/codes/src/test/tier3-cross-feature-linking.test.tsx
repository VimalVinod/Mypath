import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as firebaseMock from './mocks/firebaseMock';

describe('Tier 3: Cross-Feature Linking & Persistence (TC-C01 to TC-C05)', () => {
  beforeEach(() => {
    firebaseMock.resetFirebaseMockState();
    window.history.pushState({}, '', '/');
    localStorage.clear();
    sessionStorage.clear();
  });

  const goTo = async (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    if (path === '/login') {
      const loginBtn = screen.queryByRole('button', { name: /log in/i }) || screen.queryByText(/log in/i);
      if (loginBtn && !screen.queryByRole('heading', { name: /Log In/i })) {
        fireEvent.click(loginBtn);
      }
    } else if (path === '/signup') {
      if (!screen.queryByRole('heading', { name: /sign up|create account/i })) {
        const toLogin = screen.queryByRole('button', { name: /log in/i }) || screen.queryByText(/log in/i);
        if (toLogin) fireEvent.click(toLogin);
        const signUpLink = screen.queryByText(/sign up free/i) || screen.queryByText(/sign up/i);
        if (signUpLink) fireEvent.click(signUpLink);
      }
    }
  };

  // TC-C01: Google Sign-In with Existing Email (Automatic Account Linking)
  it('TC-C01: Google Sign-In with Existing Email links Google provider automatically without creating duplicate user', async () => {
    // Precondition: Existing email/password user with complete profile
    firebaseMock.setMockUser({
      uid: 'user_alex_1',
      email: 'alex@example.com',
      password: 'OriginalPass123!',
      displayName: 'Alex Smith',
      emailVerified: true,
      providerData: [{ providerId: 'password', uid: 'user_alex_1', email: 'alex@example.com' }],
    });

    firebaseMock.setMockDoc('users', 'user_alex_1', {
      uid: 'user_alex_1',
      email: 'alex@example.com',
      name: 'Alex Smith',
      username: 'alexsmith',
      age: 25,
      isProfileComplete: true,
      isEmailVerified: true,
      authProviders: ['password'],
    });
    firebaseMock.setMockDoc('usernames', 'alexsmith', { uid: 'user_alex_1' });

    // Google popup returns same email
    firebaseMock.setNextGoogleUser({
      uid: 'g_alex_popup',
      email: 'alex@example.com',
      displayName: 'Alex Smith Google',
      emailVerified: true,
    });

    render(<App />);
    await goTo('/login');

    const googleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(googleBtn);

    await waitFor(() => {
      // User must be linked to user_alex_1 and route directly to dashboard
      expect(screen.getByText(/Logged in as:\s*Alex Smith/i)).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /complete your profile/i })).not.toBeInTheDocument();
    });

    // Check that user document has both providers
    const userDoc = firebaseMock.getMockDoc('users', 'user_alex_1');
    expect(userDoc?.authProviders).toContain('google.com');
  });

  // TC-C02: Incomplete Google Profile Blocked on Email Login
  it('TC-C02: Incomplete Google Profile Blocked on Email Login displays exact required message', async () => {
    // Precondition: User initiated Google login but abandoned before completing profile
    firebaseMock.setMockUser({
      uid: 'user_carol_incomplete',
      email: 'carol@example.com',
      displayName: 'Carol Incomplete',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'user_carol_incomplete', email: 'carol@example.com' }],
    });

    firebaseMock.setMockDoc('users', 'user_carol_incomplete', {
      uid: 'user_carol_incomplete',
      email: 'carol@example.com',
      name: 'Carol Incomplete',
      isProfileComplete: false,
      isEmailVerified: true,
      authProviders: ['google.com'],
    });

    render(<App />);
    await goTo('/login');

    const emailInput = screen.getByPlaceholderText(/email|john\.wick/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(emailInput, 'carol@example.com');
    await userEvent.type(passwordInput, 'AnyPassword123!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Email already exists. Please complete your profile to sign in with email.')
      ).toBeInTheDocument();
      expect(firebaseMock.mockState.currentUser).toBeNull();
      expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
    });
  });

  // TC-C03: Completed Google User Can Now Sign In via Email
  it('TC-C03: Completed Google User can authenticate via Email/Password using profile-set password', async () => {
    // User who signed up via Google, completed profile and set password 'DanPass123!'
    firebaseMock.setMockUser({
      uid: 'user_dan',
      email: 'dan@example.com',
      password: 'DanPass123!',
      displayName: 'Dan Miller',
      emailVerified: true,
      providerData: [
        { providerId: 'google.com', uid: 'user_dan', email: 'dan@example.com' },
        { providerId: 'password', uid: 'user_dan', email: 'dan@example.com' },
      ],
    });

    firebaseMock.setMockDoc('users', 'user_dan', {
      uid: 'user_dan',
      email: 'dan@example.com',
      name: 'Dan Miller',
      username: 'danmiller',
      age: 30,
      isProfileComplete: true,
      isEmailVerified: true,
      authProviders: ['google.com', 'password'],
    });
    firebaseMock.setMockDoc('usernames', 'danmiller', { uid: 'user_dan' });

    render(<App />);
    await goTo('/login');

    const emailInput = screen.getByPlaceholderText(/email|john\.wick/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(emailInput, 'dan@example.com');
    await userEvent.type(passwordInput, 'DanPass123!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(firebaseMock.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'dan@example.com',
        'DanPass123!'
      );
      expect(screen.getByText(/Logged in as:\s*Dan Miller/i)).toBeInTheDocument();
    });
  });

  // TC-C04: Cascading Account Deletion Releases Username
  it('TC-C04: Cascading Account Deletion releases username so subsequent user can claim it', async () => {
    // 1. User Alpha registers with username 'alpha_warrior'
    firebaseMock.setMockUser({
      uid: 'user_alpha_10',
      email: 'alpha@example.com',
      displayName: 'Alpha Warrior',
      emailVerified: true,
    });
    firebaseMock.setMockDoc('users', 'user_alpha_10', {
      uid: 'user_alpha_10',
      email: 'alpha@example.com',
      name: 'Alpha Warrior',
      username: 'alpha_warrior',
      isProfileComplete: true,
      isEmailVerified: true,
    });
    firebaseMock.setMockDoc('usernames', 'alpha_warrior', { uid: 'user_alpha_10' });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('alpha@example.com') || null;

    const { unmount } = render(<App />);
    await goTo('/dashboard');

    // Delete User Alpha's account
    const deleteBtn = await screen.findByRole('button', { name: /Delete Account/i });
    await userEvent.click(deleteBtn);
    const confirmBtn = screen.queryByRole('button', { name: /confirm|yes|proceed/i });
    if (confirmBtn) {
      await userEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(firebaseMock.getMockDoc('usernames', 'alpha_warrior')).toBeUndefined();
    });

    unmount();

    // 2. User Beta signs up with Google and attempts to claim 'alpha_warrior'
    firebaseMock.setMockUser({
      uid: 'user_beta_20',
      email: 'beta@example.com',
      displayName: 'Beta Warrior',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'user_beta_20', email: 'beta@example.com' }],
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('beta@example.com') || null;

    render(<App />);
    await goTo('/complete-profile');

    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'Beta Warrior');
    await userEvent.type(ageInput!, '21');
    await userEvent.type(usernameInput!, 'alpha_warrior');
    await userEvent.type(passwordInput!, 'BetaPass123!');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Username is already taken. Please choose another.')).not.toBeInTheDocument();
      expect(firebaseMock.getMockDoc('usernames', 'alpha_warrior')?.uid).toBe('user_beta_20');
      expect(screen.getByText(/Logged in as:\s*(Beta Warrior|alpha_warrior)/i)).toBeInTheDocument();
    });
  });

  // TC-C05: Stale Session Deletion Re-authentication Handling
  it('TC-C05: Stale Session Deletion Re-authentication handles auth/requires-recent-login safely', async () => {
    firebaseMock.setMockUser({
      uid: 'user_c05_stale',
      email: 'stale@example.com',
      displayName: 'Stale User',
      emailVerified: true,
    });
    firebaseMock.setMockDoc('users', 'user_c05_stale', {
      uid: 'user_c05_stale',
      email: 'stale@example.com',
      name: 'Stale User',
      username: 'staleuser',
      isProfileComplete: true,
      isEmailVerified: true,
    });
    firebaseMock.setMockDoc('usernames', 'staleuser', { uid: 'user_c05_stale' });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('stale@example.com') || null;

    firebaseMock.setNextDeleteUserError({
      code: 'auth/requires-recent-login',
      message: 'This operation is sensitive and requires recent authentication. Log in again before retrying.',
    });

    render(<App />);
    await goTo('/dashboard');

    const deleteBtn = await screen.findByRole('button', { name: /Delete Account/i });
    await userEvent.click(deleteBtn);
    const confirmBtn = screen.queryByRole('button', { name: /confirm|yes|proceed/i });
    if (confirmBtn) {
      await userEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(
        screen.getByText(/requires recent authentication|re-login before deleting/i)
      ).toBeInTheDocument();
      // Ensure Firestore records were not partially deleted
      expect(firebaseMock.getMockDoc('users', 'user_c05_stale')).toBeDefined();
      expect(firebaseMock.getMockDoc('usernames', 'staleuser')).toBeDefined();
    });
  });
});
