import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as firebaseMock from './mocks/firebaseMock';

describe('Tier 1: Feature Coverage (TC-F01 to TC-F09)', () => {
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

  // TC-F01: Email/Password Sign-Up Happy Path
  it('TC-F01: Email/Password Sign-Up Happy Path dispatches verification link and signs out', async () => {
    render(<App />);
    await goTo('/signup');

    const emailInput = screen.queryByPlaceholderText(/email/i) || screen.queryByLabelText(/email/i);
    const passwordInputs = screen.queryAllByPlaceholderText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /sign up|create account|register/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    expect(submitBtn).toBeInTheDocument();

    await userEvent.type(emailInput!, 'aspirant@example.com');
    await userEvent.type(passwordInputs[0], 'ValidPassword123!');
    if (passwordInputs.length > 1) {
      await userEvent.type(passwordInputs[1], 'ValidPassword123!');
    }

    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(firebaseMock.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'aspirant@example.com',
        'ValidPassword123!'
      );
      expect(firebaseMock.sendEmailVerification).toHaveBeenCalled();
      expect(firebaseMock.signOut).toHaveBeenCalled();
    });

    expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
  });

  // TC-F02: Unverified Email Login Interception
  it('TC-F02: Unverified Email Login Interception re-dispatches verification link and shows exact error', async () => {
    firebaseMock.setMockUser({
      uid: 'uid-unverified-1',
      email: 'unverified@example.com',
      password: 'SecretPassword123!',
      emailVerified: false,
    });

    render(<App />);
    await goTo('/login');

    const emailInput = screen.getByPlaceholderText(/email|john\.wick/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(emailInput, 'unverified@example.com');
    await userEvent.type(passwordInput, 'SecretPassword123!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(firebaseMock.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'unverified@example.com',
        'SecretPassword123!'
      );
      expect(firebaseMock.sendEmailVerification).toHaveBeenCalled();
      expect(firebaseMock.signOut).toHaveBeenCalled();
      expect(
        screen.getByText(
          'Please verify your email address before logging in. A verification link has been sent to your email.'
        )
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
  });

  // TC-F03: Verified Email Login Happy Path
  it('TC-F03: Verified Email Login Happy Path routes to dashboard and displays user name', async () => {
    firebaseMock.setMockUser({
      uid: 'uid-verified-123',
      email: 'verified@example.com',
      password: 'CorrectPassword123!',
      emailVerified: true,
      displayName: 'Alex Verified',
    });

    firebaseMock.setMockDoc('users', 'uid-verified-123', {
      uid: 'uid-verified-123',
      email: 'verified@example.com',
      name: 'Alex Verified',
      username: 'alexverified',
      age: 26,
      isProfileComplete: true,
      isEmailVerified: true,
      authProviders: ['password'],
    });

    render(<App />);
    await goTo('/login');

    const emailInput = screen.getByPlaceholderText(/email|john\.wick/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(emailInput, 'verified@example.com');
    await userEvent.type(passwordInput, 'CorrectPassword123!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(firebaseMock.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'verified@example.com',
        'CorrectPassword123!'
      );
      expect(screen.getByText(/Logged in as:\s*Alex Verified/i)).toBeInTheDocument();
    });
  });

  // TC-F04: Google Sign-In New User Profile Enforcement Redirection
  it('TC-F04: Google Sign-In New User Profile Enforcement redirects to /complete-profile', async () => {
    firebaseMock.setNextGoogleUser({
      uid: 'google-uid-new',
      email: 'newgoogle@gmail.com',
      displayName: 'Google Newbie',
      emailVerified: true,
    });

    render(<App />);
    await goTo('/login');

    const googleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(googleBtn);

    await waitFor(() => {
      expect(firebaseMock.signInWithPopup).toHaveBeenCalled();
      expect(
        screen.getByRole('heading', { name: /complete your profile/i }) ||
          screen.getByText(/complete your profile/i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
  });

  // TC-F05: Google User Completes Profile
  it('TC-F05: Google User Completes Profile commits Firestore data and routes to dashboard', async () => {
    firebaseMock.setMockUser({
      uid: 'g_user_101',
      email: 'newgoogle@example.com',
      displayName: 'Jane Doe',
      emailVerified: true,
      providerData: [{ providerId: 'google.com', uid: 'g_user_101', email: 'newgoogle@example.com' }],
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('newgoogle@example.com') || null;

    render(<App />);
    await goTo('/complete-profile');

    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    expect(nameInput).toBeInTheDocument();
    expect(ageInput).toBeInTheDocument();
    expect(usernameInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();

    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'Jane Doe');
    await userEvent.type(ageInput!, '24');
    await userEvent.type(usernameInput!, 'janedoe24');
    await userEvent.type(passwordInput!, 'SecurePass123!');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      const userDoc = firebaseMock.getMockDoc('users', 'g_user_101');
      const usernameDoc = firebaseMock.getMockDoc('usernames', 'janedoe24');
      expect(userDoc?.isProfileComplete).toBe(true);
      expect(usernameDoc?.uid).toBe('g_user_101');
      expect(screen.getByText(/Logged in as:\s*(Jane Doe|janedoe24)/i)).toBeInTheDocument();
    });
  });

  // TC-F06: Returning Google User Direct Dashboard Entry
  it('TC-F06: Returning Google User with complete profile directs directly to dashboard', async () => {
    firebaseMock.setMockDoc('users', 'google-uid-ret', {
      uid: 'google-uid-ret',
      email: 'retgoogle@gmail.com',
      name: 'Returning Google User',
      username: 'retgoogle',
      age: 28,
      isProfileComplete: true,
      isEmailVerified: true,
      authProviders: ['google.com', 'password'],
    });
    firebaseMock.setMockDoc('usernames', 'retgoogle', { uid: 'google-uid-ret' });

    firebaseMock.setNextGoogleUser({
      uid: 'google-uid-ret',
      email: 'retgoogle@gmail.com',
      displayName: 'Returning Google User',
      emailVerified: true,
    });

    render(<App />);
    await goTo('/login');

    const googleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(googleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*Returning Google User/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: /complete your profile/i })).not.toBeInTheDocument();
  });

  // TC-F07: Temporary Testing Dummy Dashboard Display
  it('TC-F07: Temporary Testing Dummy Dashboard displays user name, Sign Out, and Delete Account buttons', async () => {
    firebaseMock.setMockUser({
      uid: 'user_f07_123',
      email: 'alex.kumar@example.com',
      displayName: 'Alex Kumar',
      emailVerified: true,
    });
    firebaseMock.setMockDoc('users', 'user_f07_123', {
      uid: 'user_f07_123',
      email: 'alex.kumar@example.com',
      name: 'Alex Kumar',
      username: 'alexkumar',
      isProfileComplete: true,
      isEmailVerified: true,
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('alex.kumar@example.com') || null;

    render(<App />);
    await goTo('/dashboard');

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*Alex Kumar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete Account/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Matched Exams/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upcoming Deadlines/i)).not.toBeInTheDocument();
  });

  // TC-F08: Sign Out Session Teardown
  it('TC-F08: Sign Out terminates session and blocks dashboard access', async () => {
    firebaseMock.setMockUser({
      uid: 'user_f08_123',
      email: 'alex.kumar@example.com',
      displayName: 'Alex Kumar',
      emailVerified: true,
    });
    firebaseMock.setMockDoc('users', 'user_f08_123', {
      uid: 'user_f08_123',
      email: 'alex.kumar@example.com',
      name: 'Alex Kumar',
      username: 'alexkumar',
      isProfileComplete: true,
      isEmailVerified: true,
    });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('alex.kumar@example.com') || null;

    render(<App />);
    await goTo('/dashboard');

    const signOutBtn = await screen.findByRole('button', { name: /Sign Out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(firebaseMock.signOut).toHaveBeenCalled();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });

    await goTo('/dashboard');
    await waitFor(() => {
      expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
    });
  });

  // TC-F09: Permanent Account Deletion
  it('TC-F09: Permanent Account Deletion deletes user from Auth and Firestore and redirects to /', async () => {
    firebaseMock.setMockUser({
      uid: 'user_f09_del',
      email: 'delete.me@example.com',
      displayName: 'Delete Target',
      emailVerified: true,
    });
    firebaseMock.setMockDoc('users', 'user_f09_del', {
      uid: 'user_f09_del',
      email: 'delete.me@example.com',
      name: 'Delete Target',
      username: 'del_target',
      isProfileComplete: true,
      isEmailVerified: true,
    });
    firebaseMock.setMockDoc('usernames', 'del_target', { uid: 'user_f09_del' });
    firebaseMock.mockState.currentUser = firebaseMock.mockState.getRegisteredUser('delete.me@example.com') || null;

    render(<App />);
    await goTo('/dashboard');

    const deleteBtn = await screen.findByRole('button', { name: /Delete Account/i });
    await userEvent.click(deleteBtn);

    const confirmBtn = screen.queryByRole('button', { name: /confirm|yes|proceed/i });
    if (confirmBtn) {
      await userEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(firebaseMock.deleteDoc).toHaveBeenCalled();
      expect(firebaseMock.deleteUser).toHaveBeenCalled();
      expect(firebaseMock.getMockDoc('users', 'user_f09_del')).toBeUndefined();
      expect(firebaseMock.getMockDoc('usernames', 'del_target')).toBeUndefined();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });
  });
});
