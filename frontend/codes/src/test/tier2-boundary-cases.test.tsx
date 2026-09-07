import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as firebaseMock from './mocks/firebaseMock';

describe('Tier 2: Boundary & Corner Cases (TC-B01 to TC-B09)', () => {
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

  // TC-B01: Password Confirmation Mismatch Validation
  it('TC-B01: Password Confirmation Mismatch Validation displays exact error "Passwords do not match."', async () => {
    render(<App />);
    await goTo('/signup');

    const emailInput = screen.queryByPlaceholderText(/email/i) || screen.queryByLabelText(/email/i);
    const passwordInputs = screen.queryAllByPlaceholderText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /sign up|create account|register/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2);
    expect(submitBtn).toBeInTheDocument();

    await userEvent.type(emailInput!, 'user@example.com');
    await userEvent.type(passwordInputs[0], 'PasswordOne123!');
    await userEvent.type(passwordInputs[1], 'PasswordTwo456!');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      expect(firebaseMock.createUserWithEmailAndPassword).not.toHaveBeenCalled();
      expect(emailInput).toHaveValue('user@example.com');
    });
  });

  // TC-B02: Weak Password Validation (< 6 chars)
  it('TC-B02: Weak Password Validation (< 6 chars) halts submission and informs user', async () => {
    render(<App />);
    await goTo('/signup');

    const emailInput = screen.queryByPlaceholderText(/email/i) || screen.queryByLabelText(/email/i);
    const passwordInputs = screen.queryAllByPlaceholderText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /sign up|create account|register/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);

    await userEvent.type(emailInput!, 'weak@example.com');
    await userEvent.type(passwordInputs[0], '123');
    if (passwordInputs.length > 1) {
      await userEvent.type(passwordInputs[1], '123');
    }
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(
        screen.getByText(/at least 6 characters|weak password/i)
      ).toBeInTheDocument();
      expect(firebaseMock.sendEmailVerification).not.toHaveBeenCalled();
    });
  });

  // TC-B03: Invalid Email Format Handling
  it('TC-B03: Invalid Email Format Handling rejects malformed email', async () => {
    render(<App />);
    await goTo('/signup');

    const emailInput = screen.queryByPlaceholderText(/email/i) || screen.queryByLabelText(/email/i);
    const passwordInputs = screen.queryAllByPlaceholderText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /sign up|create account|register/i });

    expect(emailInput).toBeInTheDocument();

    await userEvent.type(emailInput!, 'not-an-email');
    if (passwordInputs.length > 0) {
      await userEvent.type(passwordInputs[0], 'ValidPassword123!');
    }
    if (passwordInputs.length > 1) {
      await userEvent.type(passwordInputs[1], 'ValidPassword123!');
    }
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(firebaseMock.sendEmailVerification).not.toHaveBeenCalled();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });
  });

  // TC-B04: Profile Completion Age Boundaries
  it('TC-B04: Profile Completion Age Boundaries validates negative, zero, and out-of-range ages', async () => {
    firebaseMock.setMockUser({
      uid: 'g_user_age_test',
      email: 'age_test@example.com',
      displayName: 'Age Tester',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'g_user_age_test', email: 'age_test@example.com' }],
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('age_test@example.com') || null;

    render(<App />);
    await goTo('/complete-profile');

    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    expect(ageInput).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();

    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'Age Tester');
    await userEvent.type(usernameInput!, 'agetester99');
    await userEvent.type(passwordInput!, 'AgePass123!');

    // Test negative age
    await userEvent.clear(ageInput!);
    await userEvent.type(ageInput!, '-5');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/valid age/i)).toBeInTheDocument();
      expect(firebaseMock.getMockDoc('users', 'g_user_age_test')?.isProfileComplete).not.toBe(true);
    });

    // Test zero age
    await userEvent.clear(ageInput!);
    await userEvent.type(ageInput!, '0');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/valid age/i)).toBeInTheDocument();
    });

    // Test extreme age > 120
    await userEvent.clear(ageInput!);
    await userEvent.type(ageInput!, '150');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/valid age/i)).toBeInTheDocument();
    });

    // Test valid age
    await userEvent.clear(ageInput!);
    await userEvent.type(ageInput!, '24');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(firebaseMock.getMockDoc('users', 'g_user_age_test')?.isProfileComplete).toBe(true);
    });
  });

  // TC-B05: Profile Completion Username Format Boundaries
  it('TC-B05: Profile Completion Username Format Boundaries enforces length and allowed characters', async () => {
    firebaseMock.setMockUser({
      uid: 'g_user_user_test',
      email: 'user_test@example.com',
      displayName: 'User Tester',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'g_user_user_test', email: 'user_test@example.com' }],
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('user_test@example.com') || null;

    render(<App />);
    await goTo('/complete-profile');

    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    expect(usernameInput).toBeInTheDocument();

    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'User Tester');
    await userEvent.type(ageInput!, '25');
    await userEvent.type(passwordInput!, 'UserPass123!');

    // Test empty username
    await userEvent.clear(usernameInput!);
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });

    // Test too short username (< 3 chars)
    await userEvent.type(usernameInput!, 'ab');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });

    // Test spaces in username
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'user name with space');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/alphanumeric characters and underscores/i)).toBeInTheDocument();
    });

    // Test invalid special characters
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'user@invalid!');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText(/alphanumeric characters and underscores/i)).toBeInTheDocument();
    });

    // Test valid format
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'valid_user_99');
    await userEvent.click(submitBtn!);
    await waitFor(() => {
      expect(firebaseMock.getMockDoc('usernames', 'valid_user_99')?.uid).toBe('g_user_user_test');
    });
  });

  // TC-B06: Duplicate Username Collision
  it('TC-B06: Duplicate Username Collision displays exact error "Username is already taken. Please choose another."', async () => {
    firebaseMock.setMockDoc('usernames', 'champion2026', {
      uid: 'existing_champion_user',
      createdAt: new Date().toISOString(),
    });

    firebaseMock.setMockUser({
      uid: 'g_user_collision_test',
      email: 'collision_test@example.com',
      displayName: 'Collision Candidate',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'g_user_collision_test', email: 'collision_test@example.com' }],
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('collision_test@example.com') || null;

    render(<App />);
    await goTo('/complete-profile');

    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'Collision Candidate');
    await userEvent.type(ageInput!, '22');
    await userEvent.type(passwordInput!, 'ValidPass123!');

    // Enter taken username
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'champion2026');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText('Username is already taken. Please choose another.')).toBeInTheDocument();
      expect(firebaseMock.getMockDoc('users', 'g_user_collision_test')?.isProfileComplete).not.toBe(true);
    });

    // Change to unique username
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'champion2026_unique');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Username is already taken. Please choose another.')).not.toBeInTheDocument();
      expect(firebaseMock.getMockDoc('usernames', 'champion2026_unique')?.uid).toBe('g_user_collision_test');
    });
  });

  // TC-B07: Google Sign-In Popup Closed by User
  it('TC-B07: Google Sign-In Popup Closed by User displays exact alert and recovers loading state', async () => {
    firebaseMock.setNextPopupError({
      code: 'auth/popup-closed-by-user',
      message: 'The popup has been closed by the user before finalizing the operation.',
    });

    render(<App />);
    await goTo('/login');

    const googleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByText('Google Sign-In popup was closed.')).toBeInTheDocument();
      expect(googleBtn).not.toBeDisabled();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });
  });

  // TC-B08: Unauthorized Dashboard Access Redirect
  it('TC-B08: Unauthorized Dashboard Access Redirect redirects unauthenticated visitors to /login', async () => {
    firebaseMock.mockState.currentUser = null;

    render(<App />);
    await goTo('/dashboard');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Log In/i })).toBeInTheDocument();
      expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sign Out/i })).not.toBeInTheDocument();
    });
  });

  // TC-B09: Direct URL Guard for Unverified Users
  it('TC-B09: Direct URL Guard for Unverified Users blocks access and displays verification notice', async () => {
    firebaseMock.setMockUser({
      uid: 'uid-unverified-direct',
      email: 'direct_unverified@example.com',
      emailVerified: false,
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('direct_unverified@example.com') || null;

    render(<App />);
    await goTo('/dashboard');

    await waitFor(() => {
      expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Log In/i })).toBeInTheDocument();
      expect(
        screen.getByText(
          'Please verify your email address before logging in. A verification link has been sent to your email.'
        )
      ).toBeInTheDocument();
    });
  });
});
