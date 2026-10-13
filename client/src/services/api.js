const API_BASE = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

const getHeaders = () => {
  const token = localStorage.getItem('myroute_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // --- Auth, Dual OTP & Profile ---
  sendEmailOtp: async (email, role = 'User') => {
    const res = await fetch(`${API_BASE}/auth/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    return res.json();
  },

  sendOtp: async (email, role = 'User') => {
    const res = await fetch(`${API_BASE}/auth/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    return res.json();
  },

  verifyEmailOtp: async (email, code) => {
    const res = await fetch(`${API_BASE}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    return res.json();
  },

  verifyOtp: async (email, code) => {
    const res = await fetch(`${API_BASE}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    return res.json();
  },

  sendPhoneOtp: async (phone) => {
    const res = await fetch(`${API_BASE}/auth/send-phone-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return res.json();
  },

  verifyPhoneOtp: async (phone, code) => {
    const res = await fetch(`${API_BASE}/auth/verify-phone-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });
    return res.json();
  },

  sendAadhaarOtp: async (aadhaarNumber, phone) => {
    const res = await fetch(`${API_BASE}/auth/send-aadhaar-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaarNumber, phone })
    });
    return res.json();
  },

  verifyAadhaarOtp: async (aadhaarNumber, code) => {
    const res = await fetch(`${API_BASE}/auth/verify-aadhaar-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaarNumber, code })
    });
    return res.json();
  },

  googleAuth: async (googlePayload) => {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googlePayload)
    });
    return res.json();
  },

  login: async (credentials) => {
    // Supports { email, password, role } OR { phone, password, role } OR { phone, otpCode, role }
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeof credentials === 'string' ? { email: credentials, password: arguments[1], role: arguments[2] } : credentials)
    });
    return res.json();
  },

  register: async (formData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    return res.json();
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return res.json();
  },

  updateDriverVehicle: async (vehicleData) => {
    const res = await fetch(`${API_BASE}/auth/driver-update-vehicle`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(vehicleData)
    });
    return res.json();
  },

  toggleDriverShiftStatus: async (isOnline) => {
    const res = await fetch(`${API_BASE}/auth/driver-toggle-status`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isOnline })
    });
    return res.json();
  },

  syncDriverLocation: async (locationData) => {
    const res = await fetch(`${API_BASE}/auth/driver-location`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(locationData)
    });
    return res.json();
  },

  updateDriverOnboarding: async (onboardingData) => {
    const res = await fetch(`${API_BASE}/auth/driver-onboarding`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(onboardingData)
    });
    return res.json();
  },

  // --- Cities & Transit ---
  getCities: async () => {
    const res = await fetch(`${API_BASE}/transit/cities`);
    return res.json();
  },

  getRoutes: async (city = 'delhi') => {
    const res = await fetch(`${API_BASE}/transit/routes?city=${city}`);
    return res.json();
  },

  getStops: async (city = 'delhi') => {
    const res = await fetch(`${API_BASE}/transit/stops?city=${city}`);
    return res.json();
  },

  getActiveVehicles: async (city = 'delhi') => {
    const res = await fetch(`${API_BASE}/transit/active-vehicles?city=${city}`);
    return res.json();
  },

  planTrip: async (originId, destinationId, originCoords, destCoords, city = 'delhi', originText = '', destinationText = '') => {
    const res = await fetch(`${API_BASE}/transit/plan-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originId, destinationId, originCoords, destCoords, city, originText, destinationText })
    });
    return res.json();
  },

  searchPlaces: async (q, city = 'delhi') => {
    const res = await fetch(`${API_BASE}/transit/search-places?q=${encodeURIComponent(q)}&city=${city}`);
    return res.json();
  },

  getRoadGeometry: async (coordinates) => {
    const res = await fetch(`${API_BASE}/transit/road-geometry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates })
    });
    return res.json();
  },

  // --- Fares ---
  calculateFare: async (distanceKm, isNight, city = 'delhi') => {
    const res = await fetch(`${API_BASE}/fares/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distanceKm, isNight, city })
    });
    return res.json();
  },

  getFareReports: async (city = 'delhi') => {
    const res = await fetch(`${API_BASE}/fares/reports?city=${city}`);
    return res.json();
  },

  submitFareReport: async (reportData) => {
    const res = await fetch(`${API_BASE}/fares/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reportData)
    });
    return res.json();
  },

  upvoteFareReport: async (reportId) => {
    const res = await fetch(`${API_BASE}/fares/upvote/${reportId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // --- Rewards ---
  getWallet: async () => {
    const res = await fetch(`${API_BASE}/rewards/wallet`, {
      headers: getHeaders()
    });
    return res.json();
  },

  redeemReward: async (rewardData) => {
    const res = await fetch(`${API_BASE}/rewards/redeem`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(rewardData)
    });
    return res.json();
  },

  // --- Support & SOS ---
  getSupportInfo: async () => {
    const res = await fetch(`${API_BASE}/support/info`);
    return res.json();
  },

  getTickets: async () => {
    const res = await fetch(`${API_BASE}/support/tickets`, {
      headers: getHeaders()
    });
    return res.json();
  },

  submitTicket: async (ticketData) => {
    const res = await fetch(`${API_BASE}/support/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticketData)
    });
    return res.json();
  },

  triggerSOS: async (sosData) => {
    const res = await fetch(`${API_BASE}/support/sos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sosData)
    });
    return res.json();
  }
};
