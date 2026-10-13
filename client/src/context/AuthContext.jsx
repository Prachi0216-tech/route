import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const token = localStorage.getItem('myroute_token');
    if (token) {
      try {
        const data = await api.getMe();
        if (data && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('myroute_token');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('myroute_token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (credentials, passwordParam, roleParam) => {
    let payload;
    if (typeof credentials === 'object' && credentials !== null) {
      payload = credentials;
    } else {
      payload = { email: credentials, password: passwordParam, role: roleParam };
    }

    const data = await api.login(payload);
    if (data.token && data.user) {
      localStorage.setItem('myroute_token', data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Login failed' };
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    if (data.token && data.user) {
      localStorage.setItem('myroute_token', data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Registration failed' };
  };

  const googleAuth = async (googlePayload) => {
    const data = await api.googleAuth(googlePayload);
    if (data.token && data.user) {
      localStorage.setItem('myroute_token', data.token);
      setUser(data.user);
      return { success: true, user: data.user, isNewUser: data.isNewUser };
    }
    return { success: false, error: data.error || 'Google authentication failed', ...data };
  };

  const updateDriverVehicle = async (vehicleData) => {
    const data = await api.updateDriverVehicle(vehicleData);
    if (data.user) {
      setUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Failed to update vehicle details' };
  };

  const toggleDriverShiftStatus = async (isOnline) => {
    const data = await api.toggleDriverShiftStatus(isOnline);
    if (data.user) {
      setUser(data.user);
      return { success: true, user: data.user, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to toggle shift' };
  };

  const updateDriverOnboarding = async (onboardingData) => {
    const data = await api.updateDriverOnboarding(onboardingData);
    if (data.user) {
      setUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Failed to update driver details' };
  };

  const logout = () => {
    localStorage.removeItem('myroute_token');
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const data = await api.getMe();
      if (data && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isDriver: user?.role === 'DRIVER',
        isCommuter: user?.role === 'COMMUTER',
        login,
        register,
        googleAuth,
        logout,
        updateDriverVehicle,
        toggleDriverShiftStatus,
        updateDriverOnboarding,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
