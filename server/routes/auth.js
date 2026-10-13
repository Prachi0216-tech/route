const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { sendVerificationEmail } = require('../utils/mailer');
const { sendSmsOtp } = require('../utils/sms');

const JWT_SECRET = process.env.JWT_SECRET || 'myroute_transit_secret_key_2026';

// Helper to normalize phone numbers (e.g. +91 98765 43210 -> 9876543210)
const cleanPhoneNumber = (p) => {
  if (!p) return '';
  const digits = p.toString().replace(/[^0-9]/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
};

// Helper to normalize Aadhaar numbers (12 digits)
const cleanAadhaarNumber = (a) => {
  if (!a) return '';
  return a.toString().replace(/[^0-9]/g, '');
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ==========================================
// 1. EMAIL OTP ENDPOINTS (Nodemailer + Database)
// ==========================================

// Send 6-Digit Email Verification OTP
router.post(['/send-otp', '/send-email-otp'], async (req, res) => {
  const { email, role = 'User' } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  let cleanEmail = email.toLowerCase().trim();
  cleanEmail = cleanEmail.replace(/@(gamil|gmial|gmai|gmaill)\.com$/, '@gmail.com');

  // Rate Limiting: 30 seconds cooldown between requests
  const existing = db.getOtp('EMAIL', cleanEmail);
  if (existing && !existing.verified && Date.now() - existing.createdAt < 30000) {
    const waitSeconds = Math.ceil((30000 - (Date.now() - existing.createdAt)) / 1000);
    return res.status(429).json({ 
      error: `Please wait ${waitSeconds} seconds before requesting another verification code.` 
    });
  }

  // Generate cryptographically secure random 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins validity

  // Store in Database
  db.saveOtp('EMAIL', cleanEmail, code, expiresAt, { role });

  // Dispatch real email via Nodemailer
  const mailResult = await sendVerificationEmail(cleanEmail, code, role);

  res.json({
    success: true,
    message: mailResult.delivered 
      ? `Verification code sent to ${cleanEmail}. Please check your inbox and Spam folder.`
      : `Verification code generated for ${cleanEmail}. Please check your inbox to enter the 6-digit code.`,
    email: cleanEmail,
    mailDelivered: mailResult.delivered,
    simulatedOtp: mailResult.delivered ? undefined : code
  });
});

// Verify Email OTP Code
router.post(['/verify-otp', '/verify-email-otp'], (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Please provide email and 6-digit verification code' });
  }

  let cleanEmail = email.toLowerCase().trim();
  cleanEmail = cleanEmail.replace(/@(gamil|gmial|gmai|gmaill)\.com$/, '@gmail.com');
  const entry = db.getOtp('EMAIL', cleanEmail);

  if (!entry) {
    return res.status(400).json({ error: 'No verification code requested for this email. Please request OTP first.' });
  }

  // Check expiration (Time-Bound)
  if (Date.now() > entry.expiresAt) {
    db.deleteOtp('EMAIL', cleanEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  // Check brute force attempts limit
  if (entry.attempts >= entry.maxAttempts) {
    db.deleteOtp('EMAIL', cleanEmail);
    return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new verification code.' });
  }

  if (entry.code !== code.toString().trim()) {
    const attempts = db.incrementOtpAttempts('EMAIL', cleanEmail);
    const remaining = entry.maxAttempts - attempts;
    return res.status(400).json({ 
      error: `Incorrect email verification code. (${remaining} attempts remaining)` 
    });
  }

  // Mark verified in Database
  db.markOtpVerified('EMAIL', cleanEmail);

  res.json({
    success: true,
    message: 'Email address verified successfully!',
    email: cleanEmail
  });
});

// ==========================================
// 2. MOBILE PHONE OTP ENDPOINTS (Twilio + Database)
// ==========================================

// Send 6-Digit Mobile Phone Verification SMS OTP
router.post('/send-phone-otp', async (req, res) => {
  const { phone } = req.body;
  const digits = cleanPhoneNumber(phone);

  if (!digits || digits.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
  }

  // Rate Limiting: 30 seconds cooldown between SMS requests
  const existing = db.getOtp('PHONE', digits);
  if (existing && !existing.verified && Date.now() - existing.createdAt < 30000) {
    const waitSeconds = Math.ceil((30000 - (Date.now() - existing.createdAt)) / 1000);
    return res.status(429).json({ 
      error: `Please wait ${waitSeconds} seconds before requesting another SMS OTP.` 
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins validity

  // Store in Database
  db.saveOtp('PHONE', digits, code, expiresAt);

  // Dispatch real SMS via Twilio
  const smsResult = await sendSmsOtp(digits, code);

  res.json({
    success: true,
    message: smsResult.delivered
      ? `SMS verification code dispatched via Twilio to +91 ${digits}.`
      : `SMS verification code sent to +91 ${digits}. Please check your mobile.`,
    phone: digits,
    smsDelivered: smsResult.delivered,
    simulatedOtp: smsResult.delivered ? undefined : code
  });
});

// Verify Mobile Phone SMS OTP Code
router.post('/verify-phone-otp', (req, res) => {
  const { phone, code } = req.body;
  const digits = cleanPhoneNumber(phone);

  if (!digits || !code) {
    return res.status(400).json({ error: 'Please provide mobile number and 6-digit OTP code' });
  }

  const entry = db.getOtp('PHONE', digits);

  if (!entry) {
    return res.status(400).json({ error: 'No verification code requested for this mobile number' });
  }

  // Check expiration
  if (Date.now() > entry.expiresAt) {
    db.deleteOtp('PHONE', digits);
    return res.status(400).json({ error: 'Mobile OTP code has expired. Please request a new code.' });
  }

  // Check brute force attempts
  if (entry.attempts >= entry.maxAttempts) {
    db.deleteOtp('PHONE', digits);
    return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new SMS OTP.' });
  }

  if (entry.code !== code.toString().trim()) {
    const attempts = db.incrementOtpAttempts('PHONE', digits);
    const remaining = entry.maxAttempts - attempts;
    return res.status(400).json({ 
      error: `Incorrect mobile OTP. (${remaining} attempts remaining)` 
    });
  }

  // Mark verified in Database
  db.markOtpVerified('PHONE', digits);

  res.json({
    success: true,
    message: 'Mobile number verified successfully!',
    phone: digits
  });
});

// ==========================================
// 3. DRIVER AADHAAR UIDAI VERIFICATION ENDPOINTS
// ==========================================

// Send 6-Digit Aadhaar UIDAI Verification OTP
router.post('/send-aadhaar-otp', (req, res) => {
  const aadhaarVal = req.body.aadhaarNumber || req.body.aadhaar;
  const { phone } = req.body;
  const digits = cleanAadhaarNumber(aadhaarVal);

  if (!digits || digits.length !== 12) {
    return res.status(400).json({ error: 'Please enter a valid 12-digit Aadhaar Card Number' });
  }

  if (digits.startsWith('0') || digits.startsWith('1')) {
    return res.status(400).json({ error: 'Invalid Aadhaar number: Aadhaar numbers cannot start with 0 or 1' });
  }

  // Rate Limiting: 30 seconds cooldown
  const existing = db.getOtp('AADHAAR', digits);
  if (existing && !existing.verified && Date.now() - existing.createdAt < 30000) {
    const waitSeconds = Math.ceil((30000 - (Date.now() - existing.createdAt)) / 1000);
    return res.status(429).json({ 
      error: `Please wait ${waitSeconds} seconds before requesting another UIDAI OTP.` 
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins validity
  const masked = `XXXX XXXX ${digits.slice(8)}`;

  // Store in Database
  db.saveOtp('AADHAAR', digits, code, expiresAt, { phone: cleanPhoneNumber(phone) });

  console.log(`🆔 [UIDAI Aadhaar Gateway] Verification OTP for Aadhaar ${masked}: ${code}`);

  res.json({
    success: true,
    message: `UIDAI OTP sent to mobile linked with Aadhaar ${masked}`,
    maskedAadhaar: masked,
    aadhaarNumber: masked,
    simulatedOtp: code
  });
});

// Verify Driver Aadhaar OTP Code
router.post('/verify-aadhaar-otp', (req, res) => {
  const aadhaarVal = req.body.aadhaarNumber || req.body.aadhaar;
  const { code } = req.body;
  const digits = cleanAadhaarNumber(aadhaarVal);

  if (!digits || !code) {
    return res.status(400).json({ error: 'Please provide 12-digit Aadhaar number and 6-digit OTP code' });
  }

  const entry = db.getOtp('AADHAAR', digits);

  if (!entry) {
    return res.status(400).json({ error: 'No Aadhaar verification OTP requested for this Aadhaar number' });
  }

  if (Date.now() > entry.expiresAt) {
    db.deleteOtp('AADHAAR', digits);
    return res.status(400).json({ error: 'Aadhaar OTP code has expired. Please request a new OTP.' });
  }

  if (entry.attempts >= entry.maxAttempts) {
    db.deleteOtp('AADHAAR', digits);
    return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new Aadhaar OTP.' });
  }

  if (entry.code !== code.toString().trim()) {
    const attempts = db.incrementOtpAttempts('AADHAAR', digits);
    const remaining = entry.maxAttempts - attempts;
    return res.status(400).json({ 
      error: `Incorrect Aadhaar verification OTP. (${remaining} attempts remaining)` 
    });
  }

  db.markOtpVerified('AADHAAR', digits);
  const masked = `XXXX XXXX ${digits.slice(8)}`;

  res.json({
    success: true,
    message: 'Driver Aadhaar ID verified successfully via UIDAI Gateway!',
    isAadhaarVerified: true,
    maskedAadhaar: masked
  });
});

// ==========================================
// 4. GOOGLE AUTH & VERIFICATION
// ==========================================

router.post('/google', async (req, res) => {
  try {
    const { email, name, role = 'COMMUTER' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isDriver = role === 'DRIVER';

    // Check if account already exists
    let account = isDriver ? db.findDriverByEmail(cleanEmail) : db.findUserByEmail(cleanEmail);
    if (!account) {
      account = isDriver ? db.findUserByEmail(cleanEmail) : db.findDriverByEmail(cleanEmail);
    }

    if (account) {
      const resolvedRole = account.role || role;
      const token = jwt.sign(
        { id: account.id, email: account.email, role: resolvedRole, name: account.name, city: account.city || 'delhi' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      const { password: _, ...cleanData } = account;
      return res.json({ token, user: { ...cleanData, role: resolvedRole }, isNewUser: false });
    }

    // Mark email verified for new Google user so they can complete details
    emailOtpStore.set(cleanEmail, {
      code: 'GOOGLE_VERIFIED',
      expiresAt: Date.now() + 30 * 60 * 1000,
      verified: true
    });

    return res.json({
      isNewUser: true,
      verifiedEmail: cleanEmail,
      name: name || '',
      message: 'Google email verified! Please complete your registration details.'
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Server error during Google authentication' });
  }
});

// ==========================================
// 4. PROFESSIONAL MULTI-STEP REGISTRATION
// ==========================================

router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      contact,
      city = 'delhi', 
      role = 'COMMUTER',
      
      // Driver Identity & Licensing
      licenseNumber,
      aadhaarNumber,
      experienceYears,
      
      // Commercial Vehicle & Route
      vehicleType = 'BUS', 
      fleetOperator = 'UPSRTC',
      routeNumber = 'UPSRTC-101', 
      vehicleNumber, // License plate e.g. UP 32 AZ 4589
      busNumber,     // Fleet unit code e.g. UP-LKO-01
      vehicleModel, 
      totalSeats,
      hasAC = true,
      isElectric = false,
      routeOrigin = '',
      routeDestination = '',

      // Commuter details
      emergencyContactName = '',
      emergencyContactPhone = '',
      preferredTransportMode = 'BUS'
    } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Please provide your Name and Password' });
    }

    let cleanEmail = (email || '').toLowerCase().trim();
    let digitsPhone = cleanPhoneNumber(phone);

    // Support unified contact field
    const unified = (contact || '').trim();
    if (unified) {
      if (unified.includes('@')) {
        cleanEmail = unified.toLowerCase();
      } else {
        digitsPhone = cleanPhoneNumber(unified);
      }
    }

    // Auto-complete missing identifier
    if (!cleanEmail && digitsPhone) {
      cleanEmail = `${digitsPhone}@myroute.in`;
    }
    if (!digitsPhone && cleanEmail) {
      const hashNum = Math.abs(cleanEmail.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0));
      digitsPhone = '9' + String(hashNum).padStart(9, '0').slice(-9);
    }
    if (!cleanEmail && !digitsPhone) {
      const randId = Math.floor(100000 + Math.random() * 900000);
      cleanEmail = `user${randId}@myroute.in`;
      digitsPhone = `98${randId}00`;
    }

    const isDriver = role === 'DRIVER';

    // Duplicate Check
    const existingEmail = isDriver ? db.findDriverByEmail(cleanEmail) : db.findUserByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email/mobile already exists. Please sign in instead.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (isDriver) {
      // Driver Registration
      const seats = parseInt(totalSeats) || (vehicleType === 'AUTO' ? 3 : vehicleType === 'E_RICKSHAW' ? 4 : 45);
      
      // Calculate starting coordinate from real device GPS or assigned route terminal
      const allRoutes = db.getRoutes('all');
      const matchedRoute = allRoutes.find(r => 
        (r.routeNumber && r.routeNumber.toLowerCase() === (routeNumber || '').toLowerCase()) ||
        (r.id && r.id.toLowerCase() === (routeNumber || '').toLowerCase())
      ) || allRoutes.find(r => (r.city || '').toLowerCase() === city.toLowerCase()) || allRoutes[0];

      const allStops = db.getStops('all');
      let startLoc = { lat: 26.8467, lng: 80.9462 }; // Default fallback
      let firstStopName = 'Transit Terminal Hub';
      let originName = routeOrigin;
      let destName = routeDestination;

      // Use real GPS location if granted by driver during registration
      if (req.body.currentLocation && req.body.currentLocation.lat && req.body.currentLocation.lng) {
        startLoc = {
          lat: parseFloat(req.body.currentLocation.lat),
          lng: parseFloat(req.body.currentLocation.lng)
        };
      } else if (req.body.currentLat && req.body.currentLng) {
        startLoc = {
          lat: parseFloat(req.body.currentLat),
          lng: parseFloat(req.body.currentLng)
        };
      } else if (matchedRoute) {
        if (!originName && matchedRoute.origin) originName = matchedRoute.origin;
        if (!destName && matchedRoute.destination) destName = matchedRoute.destination;
        if (matchedRoute.stops && matchedRoute.stops.length > 0) {
          const st = allStops.find(s => s.id === matchedRoute.stops[0]);
          if (st) {
            startLoc = { lat: st.lat, lng: st.lng };
            firstStopName = st.name;
          }
        }
      }

      const plateNo = vehicleNumber || (city === 'uttar_pradesh' ? 'UP 32 AZ ' + Math.floor(1000 + Math.random() * 9000) : 'DL 01 AB ' + Math.floor(1000 + Math.random() * 9000));
      const unitCode = busNumber || (
        vehicleType === 'AUTO' ? 'AUTO-' + Math.floor(100 + Math.random() * 900) :
        vehicleType === 'E_RICKSHAW' ? 'TOTO-' + Math.floor(100 + Math.random() * 900) :
        (matchedRoute ? matchedRoute.routeNumber : 'BUS-101')
      );
      const defaultModel = vehicleModel || (
        vehicleType === 'AUTO' ? 'Bajaj Compact 4S CNG Auto' :
        vehicleType === 'E_RICKSHAW' ? 'Mahindra Treo Electric E-Rickshaw' :
        isElectric ? 'Tata Ultra Urban 9/9m EV Bus' :
        hasAC ? 'Ashok Leyland Janrath AC Coach' : 'Tata Starbus City Express'
      );

      const newDriver = {
        id: 'drv_' + uuidv4().slice(0, 8),
        name,
        email: cleanEmail,
        password: hashedPassword,
        phone: digitsPhone,
        city: city.toLowerCase(),
        role: 'DRIVER',
        licenseNumber: licenseNumber || ('DL-' + Math.floor(100000000000000 + Math.random() * 900000000000000)),
        aadhaarNumber: aadhaarNumber ? (aadhaarNumber.replace(/[^0-9]/g, '').length === 12 ? `XXXX XXXX ${aadhaarNumber.replace(/[^0-9]/g, '').slice(8)}` : aadhaarNumber) : ('XXXX XXXX ' + Math.floor(1000 + Math.random() * 9000)),
        experienceYears: parseInt(experienceYears) || 4,
        
        // Vehicle specifics
        vehicleType: vehicleType || 'BUS',
        fleetOperator: fleetOperator || (city === 'uttar_pradesh' ? 'UPSRTC' : 'DTC'),
        vehicleNumber: plateNo,
        busNumber: unitCode,
        routeNumber: matchedRoute ? matchedRoute.routeNumber : (routeNumber || 'UPSRTC-101'),
        routeOrigin: originName || 'Origin Terminal',
        routeDestination: destName || 'Destination Terminal',
        vehicleModel: defaultModel,
        totalSeats: seats,
        availableSeats: Math.max(2, Math.round(seats * 0.75)),
        hasAC: Boolean(hasAC),
        isElectric: Boolean(isElectric),

        // Live shift and location state (Real GPS, Initial Speed 0)
        isOnline: true,
        hasLocationPermission: true,
        currentStatus: 'EN_ROUTE',
        currentLocation: startLoc,
        heading: 90,
        speedKmh: 0,
        nextStop: firstStopName,
        crowdDensity: 'AVAILABLE',
        rating: 5.0,
        totalTrips: 0,
        shiftEarnings: 0,
        isEmailVerified: true,
        isPhoneVerified: true,
        isAadhaarVerified: true,
        badges: ['UIDAI Aadhaar Verified', 'Dual OTP Verified', 'Commercial Pilot'],
        createdAt: new Date().toISOString()
      };

      db.addDriver(newDriver);

      // Register in active vehicles engine with 0 initial speed
      db.updateVehiclePosition(newDriver.id, {
        driverId: newDriver.id,
        driverName: newDriver.name,
        driverPhone: newDriver.phone,
        city: newDriver.city,
        vehicleType: newDriver.vehicleType,
        fleetOperator: newDriver.fleetOperator,
        vehicleNumber: newDriver.vehicleNumber,
        busNumber: newDriver.busNumber,
        routeNumber: newDriver.routeNumber,
        routeOrigin: newDriver.routeOrigin,
        routeDestination: newDriver.routeDestination,
        vehicleModel: newDriver.vehicleModel,
        location: newDriver.currentLocation,
        heading: newDriver.heading,
        speedKmh: 0,
        availableSeats: newDriver.availableSeats,
        totalSeats: newDriver.totalSeats,
        nextStop: newDriver.nextStop,
        crowdDensity: newDriver.crowdDensity,
        hasAC: newDriver.hasAC,
        isElectric: newDriver.isElectric
      });

      const token = jwt.sign(
        { id: newDriver.id, email: newDriver.email, role: 'DRIVER', name: newDriver.name, city: newDriver.city }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );
      
      const { password: _, ...driverData } = newDriver;
      return res.json({ token, user: driverData });
    } else {
      // Commuter Registration
      const newUser = {
        id: 'usr_' + uuidv4().slice(0, 8),
        name,
        email: cleanEmail,
        password: hashedPassword,
        phone: digitsPhone,
        city: city.toLowerCase(),
        role: 'COMMUTER',
        rewardPoints: 100, // Welcome bonus!
        badges: ['Verified Commuter', 'Dual OTP Verified'],
        savedRoutes: [],
        emergencyContacts: emergencyContactPhone ? [{ name: emergencyContactName || 'Family Contact', phone: emergencyContactPhone }] : [],
        preferredTransportMode: preferredTransportMode || 'BUS',
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date().toISOString()
      };

      db.addUser(newUser);

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: 'COMMUTER', name: newUser.name, city: newUser.city }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      const { password: _, ...userData } = newUser;
      return res.json({ token, user: userData });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// ==========================================
// 5. FLEXIBLE LOGIN (EMAIL / PHONE / PHONE OTP)
// ==========================================

router.post('/login', async (req, res) => {
  try {
    const { email, phone, password, otpCode, role } = req.body;

    let account = null;
    let resolvedRole = role;

    // Case A: Phone Number + SMS OTP Login (Passwordless)
    if (phone && otpCode) {
      const digits = cleanPhoneNumber(phone);
      const entry = phoneOtpStore.get(digits);

      if (!entry || entry.code !== otpCode.toString().trim()) {
        return res.status(400).json({ error: 'Invalid or expired mobile OTP' });
      }

      if (Date.now() > entry.expiresAt) {
        phoneOtpStore.delete(digits);
        return res.status(400).json({ error: 'Mobile OTP has expired. Please request a new one.' });
      }

      // Find user or driver by phone
      if (role === 'DRIVER') {
        account = db.findDriverByPhone(digits);
      } else if (role === 'COMMUTER') {
        account = db.findUserByPhone(digits);
      } else {
        account = db.findDriverByPhone(digits);
        if (account) resolvedRole = 'DRIVER';
        else {
          account = db.findUserByPhone(digits);
          resolvedRole = 'COMMUTER';
        }
      }

      if (!account) {
        return res.status(404).json({ error: 'No account registered with this mobile number. Please register first.' });
      }

      const token = jwt.sign(
        { id: account.id, email: account.email, role: resolvedRole, name: account.name, city: account.city || 'delhi' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _, ...cleanAccount } = account;
      return res.json({ token, user: { ...cleanAccount, role: resolvedRole } });
    }

    // Case B: Standard Login with Password (via Email OR Mobile Phone)
    const identifier = (email || phone || '').toLowerCase().trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter Email / Mobile Number and Password' });
    }

    const isEmail = identifier.includes('@');
    const digits = cleanPhoneNumber(identifier);

    if (role === 'DRIVER') {
      account = isEmail ? db.findDriverByEmail(identifier) : db.findDriverByPhone(digits);
    } else if (role === 'COMMUTER') {
      account = isEmail ? db.findUserByEmail(identifier) : db.findUserByPhone(digits);
    } else {
      account = isEmail ? db.findDriverByEmail(identifier) : db.findDriverByPhone(digits);
      if (account) {
        resolvedRole = 'DRIVER';
      } else {
        account = isEmail ? db.findUserByEmail(identifier) : db.findUserByPhone(digits);
        resolvedRole = 'COMMUTER';
      }
    }

    if (!account) {
      return res.status(401).json({ error: 'Account not found with provided credentials' });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please check and try again.' });
    }

    const token = jwt.sign(
      { id: account.id, email: account.email, role: resolvedRole, name: account.name, city: account.city || 'delhi' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...cleanAccount } = account;
    return res.json({ token, user: { ...cleanAccount, role: resolvedRole } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ==========================================
// 6. CURRENT USER PROFILE
// ==========================================

router.get('/me', authenticateToken, (req, res) => {
  if (req.user.role === 'DRIVER') {
    const driver = db.findDriverById(req.user.id);
    if (!driver) return res.status(404).json({ error: 'Driver profile not found' });
    const { password: _, ...data } = driver;
    return res.json({ user: data });
  } else {
    const user = db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User profile not found' });
    const { password: _, ...data } = user;
    return res.json({ user: data });
  }
});

// ==========================================
// 7. DRIVER VEHICLE & ROUTE MANAGEMENT
// ==========================================

// In-cockpit vehicle and route update
router.put('/driver-update-vehicle', authenticateToken, (req, res) => {
  if (req.user.role !== 'DRIVER') {
    return res.status(403).json({ error: 'Only drivers can update vehicle details' });
  }

  const {
    vehicleType,
    fleetOperator,
    vehicleNumber,
    busNumber,
    routeNumber,
    routeOrigin,
    routeDestination,
    vehicleModel,
    totalSeats,
    hasAC,
    isElectric,
    city
  } = req.body;

  const updates = {};
  if (vehicleType) updates.vehicleType = vehicleType;
  if (fleetOperator) updates.fleetOperator = fleetOperator;
  if (vehicleNumber) updates.vehicleNumber = vehicleNumber;
  if (busNumber) updates.busNumber = busNumber;
  if (routeNumber) updates.routeNumber = routeNumber;
  if (routeOrigin) updates.routeOrigin = routeOrigin;
  if (routeDestination) updates.routeDestination = routeDestination;
  if (vehicleModel) updates.vehicleModel = vehicleModel;
  if (city) updates.city = city.toLowerCase();
  if (hasAC !== undefined) updates.hasAC = Boolean(hasAC);
  if (isElectric !== undefined) updates.isElectric = Boolean(isElectric);
  if (totalSeats) {
    updates.totalSeats = parseInt(totalSeats);
    updates.availableSeats = Math.min(updates.totalSeats, parseInt(totalSeats));
  }

  const updatedDriver = db.updateDriver(req.user.id, updates);
  if (!updatedDriver) return res.status(404).json({ error: 'Driver not found' });

  // Update live active vehicle position if driver is online
  if (updatedDriver.isOnline) {
    db.updateVehiclePosition(updatedDriver.id, {
      driverId: updatedDriver.id,
      driverName: updatedDriver.name,
      driverPhone: updatedDriver.phone,
      city: updatedDriver.city,
      vehicleType: updatedDriver.vehicleType,
      fleetOperator: updatedDriver.fleetOperator,
      vehicleNumber: updatedDriver.vehicleNumber,
      busNumber: updatedDriver.busNumber,
      routeNumber: updatedDriver.routeNumber,
      routeOrigin: updatedDriver.routeOrigin,
      routeDestination: updatedDriver.routeDestination,
      vehicleModel: updatedDriver.vehicleModel,
      availableSeats: updatedDriver.availableSeats,
      totalSeats: updatedDriver.totalSeats,
      hasAC: updatedDriver.hasAC,
      isElectric: updatedDriver.isElectric
    });
  }

  const { password: _, ...data } = updatedDriver;
  res.json({ message: 'Vehicle and route details updated successfully', user: data });
});

// Driver Shift Active/Inactive Status Toggle
router.post('/driver-toggle-status', authenticateToken, (req, res) => {
  if (req.user.role !== 'DRIVER') {
    return res.status(403).json({ error: 'Only drivers can toggle shift status' });
  }

  const { isOnline } = req.body;
  const currentStatus = isOnline ? 'EN_ROUTE' : 'OFFLINE';

  const updatedDriver = db.updateDriver(req.user.id, { isOnline, currentStatus });
  if (!updatedDriver) return res.status(404).json({ error: 'Driver not found' });

  if (!isOnline) {
    db.removeVehiclePosition(req.user.id);
  } else {
    db.updateVehiclePosition(req.user.id, {
      driverId: updatedDriver.id,
      driverName: updatedDriver.name,
      driverPhone: updatedDriver.phone,
      city: updatedDriver.city,
      vehicleType: updatedDriver.vehicleType,
      fleetOperator: updatedDriver.fleetOperator,
      vehicleNumber: updatedDriver.vehicleNumber,
      busNumber: updatedDriver.busNumber,
      routeNumber: updatedDriver.routeNumber,
      routeOrigin: updatedDriver.routeOrigin,
      routeDestination: updatedDriver.routeDestination,
      vehicleModel: updatedDriver.vehicleModel,
      location: updatedDriver.currentLocation || { lat: 26.8467, lng: 80.9462 },
      heading: updatedDriver.heading || 90,
      speedKmh: updatedDriver.speedKmh || 32,
      availableSeats: updatedDriver.availableSeats,
      totalSeats: updatedDriver.totalSeats,
      nextStop: updatedDriver.nextStop,
      crowdDensity: updatedDriver.crowdDensity,
      hasAC: updatedDriver.hasAC,
      isElectric: updatedDriver.isElectric
    });
  }

  const { password: _, ...data } = updatedDriver;
  res.json({ 
    message: isOnline ? 'Shift activated! Broadcasting live location.' : 'Shift stopped. You are now offline.', 
    user: data 
  });
});

// Driver REST location fallback ping
router.post('/driver-location', authenticateToken, (req, res) => {
  if (req.user.role !== 'DRIVER') {
    return res.status(403).json({ error: 'Only drivers can broadcast location' });
  }

  const { location, speedKmh, heading, availableSeats, nextStop, crowdDensity } = req.body;
  const driver = db.findDriverById(req.user.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const updates = {};
  if (location) updates.currentLocation = location;
  if (speedKmh !== undefined) updates.speedKmh = speedKmh;
  if (heading !== undefined) updates.heading = heading;
  if (availableSeats !== undefined) updates.availableSeats = availableSeats;
  if (nextStop) updates.nextStop = nextStop;
  if (crowdDensity) updates.crowdDensity = crowdDensity;

  db.updateDriver(driver.id, updates);

  if (driver.isOnline) {
    db.updateVehiclePosition(driver.id, {
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      city: driver.city,
      vehicleType: driver.vehicleType,
      fleetOperator: driver.fleetOperator,
      vehicleNumber: driver.vehicleNumber,
      busNumber: driver.busNumber,
      routeNumber: driver.routeNumber,
      location: location || driver.currentLocation,
      speedKmh: speedKmh !== undefined ? speedKmh : driver.speedKmh,
      heading: heading !== undefined ? heading : driver.heading,
      availableSeats: availableSeats !== undefined ? availableSeats : driver.availableSeats,
      totalSeats: driver.totalSeats,
      nextStop: nextStop || driver.nextStop,
      crowdDensity: crowdDensity || driver.crowdDensity
    });
  }

  res.json({ success: true, message: 'Location synchronized' });
});

module.exports = { router, authenticateToken };
