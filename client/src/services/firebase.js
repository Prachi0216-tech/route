import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber
} from 'firebase/auth';
import { api } from './api';

// Optional Firebase configuration loaded from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyMyRouteTransit2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "myroute-transit.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "myroute-transit",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "myroute-transit.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1029384756:web:abcdef123456"
};

// Check if valid production Firebase configuration is present
export const isRealFirebaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    !import.meta.env.VITE_FIREBASE_API_KEY.includes('DemoKey')
  );
};

// Initialize Firebase App
let firebaseApp = null;
let auth = null;

try {
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(firebaseApp);
} catch (err) {
  console.warn('Firebase initialized in local dev mode:', err.message);
}

export { auth };

/**
 * Initialize invisible/visible reCAPTCHA verifier for Phone OTP
 */
export const initPhoneRecaptcha = (containerId = 'recaptcha-container') => {
  if (!auth) return null;
  try {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired, please try again.');
        }
      });
    }
    return window.recaptchaVerifier;
  } catch (err) {
    console.warn('Could not initialize reCAPTCHA verifier:', err);
    return null;
  }
};

/**
 * Send Phone Verification OTP using Firebase Phone Auth (with backend gateway fallback)
 */
export const sendPhoneOtp = async (phoneNumber, containerId = 'recaptcha-container') => {
  const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
  const formattedPhone = cleanDigits.startsWith('91') && cleanDigits.length > 10 
    ? `+${cleanDigits}` 
    : `+91${cleanDigits.slice(-10)}`;

  if (isRealFirebaseConfigured() && auth) {
    try {
      const appVerifier = initPhoneRecaptcha(containerId);
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      window.confirmationResult = confirmationResult;
      return {
        success: true,
        method: 'FIREBASE_SMS',
        message: `SMS OTP code dispatched to ${formattedPhone}`,
        phone: cleanDigits.slice(-10)
      };
    } catch (firebaseErr) {
      console.warn('Firebase Phone Auth returned an error, falling back to MyRoute SMS Gateway:', firebaseErr);
    }
  }

  // Fallback to high-reliability MyRoute Notification OTP gateway
  const res = await api.sendPhoneOtp(cleanDigits.slice(-10));
  return {
    ...res,
    method: 'MYROUTE_GATEWAY'
  };
};

/**
 * Verify Phone OTP code
 */
export const verifyPhoneOtp = async (phoneNumber, otpCode) => {
  const cleanDigits = phoneNumber.replace(/[^0-9]/g, '').slice(-10);

  // If Firebase confirmationResult exists on window, verify against Firebase first
  if (window.confirmationResult && isRealFirebaseConfigured()) {
    try {
      const result = await window.confirmationResult.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      return {
        success: true,
        user: result.user,
        firebaseToken: idToken,
        message: 'Phone number verified successfully via Firebase Auth!'
      };
    } catch (firebaseErr) {
      console.warn('Firebase Phone confirmation failed, validating against Gateway:', firebaseErr);
    }
  }

  // Verify against backend Gateway
  const res = await api.verifyPhoneOtp(cleanDigits, otpCode);
  return res;
};

/**
 * Send Email Verification OTP (Firebase / MyRoute Mail Service)
 */
export const sendEmailVerificationCode = async (email, role = 'User') => {
  const cleanEmail = email.toLowerCase().trim();
  const res = await api.sendEmailOtp(cleanEmail, role);
  return res;
};

/**
 * Verify Email Verification Code
 */
export const verifyEmailVerificationCode = async (email, code) => {
  const cleanEmail = email.toLowerCase().trim();
  const res = await api.verifyEmailOtp(cleanEmail, code);
  return res;
};
