import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as firebaseMock from './mocks/firebaseMock';

// Polyfill DOM globals for JSDOM
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
});

// Mock Firebase SDKs
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => firebaseMock);
vi.mock('firebase/firestore', () => firebaseMock);

// Mock the project's internal firebase export module
vi.mock('../firebase', () => firebaseMock);
vi.mock('./firebase', () => firebaseMock);
vi.mock('../../firebase', () => firebaseMock);
