import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Phone, 
  Bus, 
  MapPin, 
  Gauge, 
  Mail, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Truck, 
  Car, 
  BatteryCharging,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { useTheme } from '../context/ThemeContext';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  initialTab = 'login', 
  initialRole = 'COMMUTER' 
}) {
  const { login, register } = useAuth();
  const { cities, currentCity } = useCity();
  const { isDark } = useTheme();

  // Active Tab: 'login' | 'register'
  const [activeTab, setActiveTab] = useState(initialTab === 'register' ? 'register' : 'login');
  
  // Selected Role: 'COMMUTER' (Passenger) | 'DRIVER' (Commercial Pilot)
  const [role, setRole] = useState(initialRole === 'DRIVER' ? 'DRIVER' : 'COMMUTER');

  // Common UI State
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LOGIN FORM STATE ---
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // --- REGISTER FORM STATE ---
  const [registerData, setRegisterData] = useState({
    name: '',
    contact: '', // Mobile Number or Email
    password: '',
    city: currentCity || 'uttar_pradesh',
    
    // Driver specifics
    vehicleType: 'BUS', // 'BUS' | 'AUTO' | 'E_RICKSHAW'
    vehicleNumber: '',
    licenseNumber: ''
  });

  // Sync modal when opened or props change
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab === 'register' ? 'register' : 'login');
      setRole(initialRole === 'DRIVER' ? 'DRIVER' : 'COMMUTER');
      setError('');
      setLoading(false);
      setShowPassword(false);
    }
  }, [isOpen, initialTab, initialRole]);

  if (!isOpen) return null;

  // 1-Click Quick Demo Accounts for fast testing
  const fillDemoAccount = (demoType) => {
    setError('');
    if (demoType === 'COMMUTER') {
      setRole('COMMUTER');
      setLoginIdentifier('gaurav.passenger@myroute.in');
      setLoginPassword('passenger123');
    } else if (demoType === 'DRIVER_UP') {
      setRole('DRIVER');
      setLoginIdentifier('ramesh.upsrtc@myroute.in');
      setLoginPassword('driver123');
    } else if (demoType === 'DRIVER_DTC') {
      setRole('DRIVER');
      setLoginIdentifier('rajesh.dtc@myroute.in');
      setLoginPassword('driver123');
    }
  };

  // --- HANDLE LOGIN SUBMIT ---
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setError('Please enter your Email or Mobile Number');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your Password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const isEmail = loginIdentifier.includes('@');
      const res = await login({
        email: isEmail ? loginIdentifier.trim() : undefined,
        phone: !isEmail ? loginIdentifier.trim() : undefined,
        password: loginPassword,
        role
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Invalid login credentials. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    }
    setLoading(false);
  };

  // --- HANDLE REGISTER SUBMIT ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!registerData.name.trim()) {
      setError('Please enter your Full Name');
      return;
    }
    if (!registerData.contact.trim()) {
      setError('Please enter your Mobile Number or Email');
      return;
    }
    if (!registerData.password || registerData.password.length < 4) {
      setError('Password must be at least 4 characters long');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const isEmail = registerData.contact.includes('@');
      const payload = {
        name: registerData.name.trim(),
        email: isEmail ? registerData.contact.trim() : undefined,
        phone: !isEmail ? registerData.contact.trim() : undefined,
        contact: registerData.contact.trim(),
        password: registerData.password,
        city: registerData.city,
        role
      };

      if (role === 'DRIVER') {
        payload.vehicleType = registerData.vehicleType;
        payload.vehicleNumber = registerData.vehicleNumber.trim() || (registerData.city === 'uttar_pradesh' ? 'UP 32 AZ 4589' : 'DL 01 AB 1234');
        payload.licenseNumber = registerData.licenseNumber.trim() || ('DL-' + Math.floor(100000000 + Math.random() * 900000000));
        payload.fleetOperator = registerData.city === 'uttar_pradesh' ? 'UPSRTC' : 'DTC';
      }

      const res = await register(payload);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during registration.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header Bar */}
        <div className={`flex items-center justify-between p-4 sm:p-5 border-b ${
          role === 'DRIVER'
            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/20'
            : isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${
              role === 'DRIVER'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
            }`}>
              {role === 'DRIVER' ? <Gauge className="w-5 h-5 text-amber-400" /> : <Bus className="w-5 h-5 text-sky-500" />}
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>{activeTab === 'login' ? 'Sign In' : 'Create Account'}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  role === 'DRIVER' ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-white'
                }`}>
                  {role === 'DRIVER' ? 'Driver' : 'Passenger'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeTab === 'login' ? 'Welcome back to MyRoute Transit' : 'Enter basic details to get started instantly'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Sign In vs Register) */}
        <div className="px-4 sm:px-6 pt-4">
          <div className={`grid grid-cols-2 p-1 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError('');
              }}
              className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError('');
              }}
              className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Role Switcher (Passenger vs Driver) */}
        <div className="px-4 sm:px-6 pt-3">
          <div className={`grid grid-cols-2 p-1 rounded-2xl border ${isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-100/70 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                setRole('COMMUTER');
                setError('');
              }}
              className={`py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                role === 'COMMUTER'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-black'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>👤 Passenger</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('DRIVER');
                setError('');
              }}
              className={`py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                role === 'DRIVER'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>🚌 Driver</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] space-y-4">
          
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: SIMPLE SIGN IN FORM                                */}
          {/* ========================================================= */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 animate-in fade-in">
              
              {/* Quick Demo Fill Buttons */}
              <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>⚡ Quick 1-Click Demo Login</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('COMMUTER')}
                    className="p-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[11px] font-bold hover:bg-sky-500/20 transition text-center"
                  >
                    👤 Passenger
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('DRIVER_UP')}
                    className="p-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition text-center"
                  >
                    🚌 Driver (UP)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('DRIVER_DTC')}
                    className="p-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition text-center"
                  >
                    🚍 Driver (Delhi)
                  </button>
                </div>
              </div>

              {/* Email / Mobile Identifier */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email or Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. 9876543210 or name@gmail.com"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border focus:outline-none transition ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl text-xs border focus:outline-none transition ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Sign In */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-2xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 ${
                  role === 'DRIVER'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/25'
                }`}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In as {role === 'DRIVER' ? 'Commercial Driver' : 'Passenger'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Toggle to Register */}
              <div className="text-center pt-2 text-xs text-slate-400">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setError('');
                  }}
                  className="font-bold text-sky-400 hover:underline"
                >
                  Create New Account
                </button>
              </div>

            </form>
          ) : (
            /* ========================================================= */
            /* TAB 2: SIMPLE REGISTRATION FORM                           */
            /* ========================================================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3 animate-in fade-in">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    placeholder={role === 'DRIVER' ? 'e.g. Ramesh Chandra Yadav' : 'e.g. Rahul Sharma'}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none transition ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
              </div>

              {/* Mobile Number or Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mobile Number or Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={registerData.contact}
                    onChange={(e) => setRegisterData({ ...registerData, contact: e.target.value })}
                    placeholder="e.g. 9876543210 or yourname@gmail.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none transition ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2 rounded-xl text-xs border focus:outline-none transition ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* City / State Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  City / State
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <select
                    value={registerData.city}
                    onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none transition ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                    }`}
                  >
                    {cities && cities.length > 0 ? (
                      cities.map((c) => (
                        <option key={c.id} value={c.id} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>
                          {c.name} ({c.state})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="uttar_pradesh">Uttar Pradesh (UP Transit)</option>
                        <option value="delhi">Delhi NCR</option>
                        <option value="maharashtra">Maharashtra (MSRTC/BEST)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* --- EXTRA FIELDS ONLY FOR DRIVER ROLE --- */}
              {role === 'DRIVER' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5 animate-in fade-in">
                  <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Commercial Vehicle Details</span>
                  </div>

                  {/* Vehicle Type Selection */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, vehicleType: 'BUS' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        registerData.vehicleType === 'BUS'
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bus className="w-4 h-4" />
                      <span className="text-[10px]">Bus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, vehicleType: 'AUTO' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        registerData.vehicleType === 'AUTO'
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Car className="w-4 h-4" />
                      <span className="text-[10px]">Auto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, vehicleType: 'E_RICKSHAW' })}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        registerData.vehicleType === 'E_RICKSHAW'
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <BatteryCharging className="w-4 h-4" />
                      <span className="text-[10px]">E-Rickshaw</span>
                    </button>
                  </div>

                  {/* Vehicle Plate Number */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vehicle Number</label>
                      <input
                        type="text"
                        value={registerData.vehicleNumber}
                        onChange={(e) => setRegisterData({ ...registerData, vehicleNumber: e.target.value })}
                        placeholder="UP 32 AZ 4589"
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Driving License (DL No.)</label>
                      <input
                        type="text"
                        value={registerData.licenseNumber}
                        onChange={(e) => setRegisterData({ ...registerData, licenseNumber: e.target.value })}
                        placeholder="UP32-2023-0098"
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border focus:outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Registration */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-2xl text-xs font-black transition shadow-lg flex items-center justify-center gap-2 mt-2 ${
                  role === 'DRIVER'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/25'
                }`}
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create {role === 'DRIVER' ? 'Driver Cockpit' : 'Passenger'} Account</span>
                  </>
                )}
              </button>

              {/* Toggle to Login */}
              <div className="text-center pt-2 text-xs text-slate-400">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setError('');
                  }}
                  className="font-bold text-sky-400 hover:underline"
                >
                  Sign In here
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
}
