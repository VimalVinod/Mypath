import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as firebaseMock from './mocks/firebaseMock';

describe('Tier 4: Real-World Scenarios (TC-R01 to TC-R03)', () => {
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

  // TC-R01: Aspirant Email/Password Journey
  it('TC-R01: Aspirant Email/Password Lifecycle: Signup -> Verification -> Login -> Dashboard -> Sign Out', async () => {
    const { unmount } = render(<App />);

    // 1. Visit Landing Page and navigate to Sign Up
    await goTo('/signup');

    const emailInput = screen.queryByPlaceholderText(/email/i) || screen.queryByLabelText(/email/i);
    const passwordInputs = screen.queryAllByPlaceholderText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /sign up|create account|register/i });

    expect(emailInput).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();

    // 2. Submit Sign Up
    await userEvent.type(emailInput!, 'rahul@aspirant.in');
    await userEvent.type(passwordInputs[0], 'SuperPass2026!');
    if (passwordInputs.length > 1) {
      await userEvent.type(passwordInputs[1], 'SuperPass2026!');
    }
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(firebaseMock.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'rahul@aspirant.in',
        'SuperPass2026!'
      );
      expect(firebaseMock.sendEmailVerification).toHaveBeenCalled();
      expect(firebaseMock.signOut).toHaveBeenCalled();
    });

    // 3. Attempt premature login before verification
    await goTo('/login');
    const loginEmail = screen.getByPlaceholderText(/email|john\.wick/i);
    const loginPass = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(loginEmail, 'rahul@aspirant.in');
    await userEvent.type(loginPass, 'SuperPass2026!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Please verify your email address before logging in. A verification link has been sent to your email.'
        )
      ).toBeInTheDocument();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });

    // 4. Simulate user clicking the Firebase email verification link
    firebaseMock.verifyUserEmail('rahul@aspirant.in');
    // Also simulate Firestore user record for Rahul
    const registered = firebaseMock.mockState.getRegisteredUser('rahul@aspirant.in');
    if (registered) {
      firebaseMock.setMockDoc('users', registered.uid, {
        uid: registered.uid,
        email: 'rahul@aspirant.in',
        name: 'Rahul',
        isProfileComplete: true,
        isEmailVerified: true,
      });
    }

    // 5. Successful login after verification
    await userEvent.clear(loginEmail);
    await userEvent.type(loginEmail, 'rahul@aspirant.in');
    await userEvent.clear(loginPass);
    await userEvent.type(loginPass, 'SuperPass2026!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*Rahul/i)).toBeInTheDocument();
    });

    // 6. Inspect Dashboard controls
    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
    expect(signOutBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();

    // 7. Sign Out
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(firebaseMock.signOut).toHaveBeenCalled();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });

    // 8. Session Revocation: direct access to /dashboard is blocked
    await goTo('/dashboard');
    await waitFor(() => {
      expect(screen.queryByText(/Logged in as:/i)).not.toBeInTheDocument();
    });

    unmount();
  });

  // TC-R02: Google Onboarding, Collision Resolution, Session Persistence & Account Deletion
  it('TC-R02: Google Onboarding Lifecycle: Collision -> Recovery -> Dashboard -> Reload Persistence -> Deletion', async () => {
    // 1. Setup existing taken username
    firebaseMock.setMockDoc('usernames', 'aspirant_pro', {
      uid: 'user_existing_pro',
      createdAt: new Date().toISOString(),
    });

    // 2. Google sign in initiates
    firebaseMock.setNextGoogleUser({
      uid: 'g_flow_2',
      email: 'flow2@example.com',
      displayName: 'Frank Flow',
      emailVerified: true,
    });

    let { unmount } = render(<App />);
    await goTo('/login');

    const googleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(googleBtn);

    // 3. Routed to profile completion
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /complete your profile/i }) ||
          screen.getByText(/complete your profile/i)
      ).toBeInTheDocument();
    });

    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    // 4. Try taken username -> collides
    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'Frank Flow');
    await userEvent.type(ageInput!, '23');
    await userEvent.type(usernameInput!, 'aspirant_pro');
    await userEvent.type(passwordInput!, 'FlowPass123!');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText('Username is already taken. Please choose another.')).toBeInTheDocument();
    });

    // 5. Change to unique username and submit
    await userEvent.clear(usernameInput!);
    await userEvent.type(usernameInput!, 'frank_flow_2026');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*(Frank Flow|frank_flow_2026)/i)).toBeInTheDocument();
    });

    // 6. Simulate page reload / remounting App
    unmount();
    window.history.pushState({}, '', '/dashboard');
    const remount = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*(Frank Flow|frank_flow_2026)/i)).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Log In/i })).not.toBeInTheDocument();
    });

    // 7. Click Delete Account
    const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
    await userEvent.click(deleteBtn);
    const confirmBtn = screen.queryByRole('button', { name: /confirm|yes|proceed/i });
    if (confirmBtn) {
      await userEvent.click(confirmBtn);
    }

    await waitFor(() => {
      expect(firebaseMock.deleteDoc).toHaveBeenCalled();
      expect(firebaseMock.deleteUser).toHaveBeenCalled();
      expect(firebaseMock.getMockDoc('users', 'g_flow_2')).toBeUndefined();
      expect(firebaseMock.getMockDoc('usernames', 'frank_flow_2026')).toBeUndefined();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });

    remount.unmount();
  });

  // TC-R03: Abandoned Google Onboarding Recovery Flow
  it('TC-R03: Incomplete Google Profile Recovery: Abandon -> Email Login Blocked -> Google Resume -> Completion -> Dual Auth', async () => {
    // 1. Google signup initiated
    firebaseMock.setNextGoogleUser({
      uid: 'g_user_grace',
      email: 'grace@example.com',
      displayName: 'Grace Hopper',
      emailVerified: true,
    });

    let { unmount } = render(<App />);
    await goTo('/login');

    const googleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(googleBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /complete your profile/i }) ||
          screen.getByText(/complete your profile/i)
      ).toBeInTheDocument();
    });

    // 2. User abandons onboarding (navigates away to /login without completing)
    await goTo('/login');

    // 3. Attempts email/password login
    const loginEmail = screen.getByPlaceholderText(/email|john\.wick/i);
    const loginPass = screen.getByPlaceholderText(/password/i);
    const loginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(loginEmail, 'grace@example.com');
    await userEvent.type(loginPass, 'RandomPass123!');
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Email already exists. Please complete your profile to sign in with email.')
      ).toBeInTheDocument();
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });

    // 4. Re-enters via Google Sign In
    const retryGoogleBtn = screen.getByRole('button', { name: /google sign in/i });
    await userEvent.click(retryGoogleBtn);

    // 5. Detects incomplete profile and routes back to /complete-profile
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /complete your profile/i }) ||
          screen.getByText(/complete your profile/i)
      ).toBeInTheDocument();
    });

    // 6. Completes profile
    const nameInput = screen.queryByPlaceholderText(/name|full name/i) || screen.queryByLabelText(/name/i);
    const ageInput = screen.queryByPlaceholderText(/age/i) || screen.queryByLabelText(/age/i);
    const usernameInput = screen.queryByPlaceholderText(/username/i) || screen.queryByLabelText(/username/i);
    const passwordInput = screen.queryByPlaceholderText(/password/i) || screen.queryByLabelText(/password/i);
    const submitBtn = screen.queryByRole('button', { name: /save|complete profile|continue/i });

    await userEvent.clear(nameInput!);
    await userEvent.type(nameInput!, 'Grace Hopper');
    await userEvent.type(ageInput!, '29');
    await userEvent.type(usernameInput!, 'grace_hopper');
    await userEvent.type(passwordInput!, 'GraceSecret999!');
    await userEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*(Grace Hopper|grace_hopper)/i)).toBeInTheDocument();
    });

    // 7. Sign Out
    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(firebaseMock.mockState.currentUser).toBeNull();
    });

    // 8. Now email/password login works using the set password!
    await goTo('/login');
    const finalEmail = screen.getByPlaceholderText(/email|john\.wick/i);
    const finalPass = screen.getByPlaceholderText(/password/i);
    const finalLoginBtn = screen.getByRole('button', { name: /^log in$/i });

    await userEvent.type(finalEmail, 'grace@example.com');
    await userEvent.type(finalPass, 'GraceSecret999!');
    await userEvent.click(finalLoginBtn);

    await waitFor(() => {
      expect(screen.getByText(/Logged in as:\s*(Grace Hopper|grace_hopper)/i)).toBeInTheDocument();
    });

    unmount();
  });
});
