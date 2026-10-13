import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingView from './components/LandingView';
import LiveMapView from './components/LiveMapView';
import RoutePlanner from './components/RoutePlanner';
import FareCalculator from './components/FareCalculator';
import DriverDashboard from './components/DriverDashboard';
import RewardsView from './components/RewardsView';
import SupportView from './components/SupportView';
import AuthModal from './components/AuthModal';
import SafetySOSModal from './components/SafetySOSModal';
import InstallAppBanner from './components/InstallAppBanner';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import socket from './services/socket';
import { 
  Map, 
  Navigation, 
  CreditCard, 
  Gift, 
  HelpCircle, 
  Gauge, 
  ShieldAlert
} from 'lucide-react';

export default function App() {
  const { user, isAuthenticated, isDriver, isCommuter, loading } = useAuth();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'planner' | 'fares' | 'rewards' | 'support' | 'driver-console'
  const [authModalConfig, setAuthModalConfig] = useState({ isOpen: false, tab: 'login', role: 'COMMUTER' });
  const [isSOSOpen, setIsSOSOpen] = useState(false);
  const [incomingSOSAlert, setIncomingSOSAlert] = useState(null);
  const [focusedTripPlan, setFocusedTripPlan] = useState(null);

  // Set default active tab based on role upon login
  useEffect(() => {
    if (isDriver) {
      setActiveTab('driver-console');
    } else if (isCommuter) {
      setActiveTab('map');
    }
  }, [isDriver, isCommuter]);

  // Real-time SOS alert push listener
  useEffect(() => {
    socket.on('sos:broadcast', (alert) => {
      setIncomingSOSAlert(alert);
      setTimeout(() => setIncomingSOSAlert(null), 8000);
    });

    return () => {
      socket.off('sos:broadcast');
    };
  }, []);

  const openAuthModal = (tab = 'login', role = 'COMMUTER') => {
    setAuthModalConfig({ isOpen: true, tab, role });
  };

  const handleViewRouteOnMap = (option, origin, destination) => {
    setFocusedTripPlan({ option, origin, destination });
    setActiveTab('map');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Loading MyRoute Network...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={(tab, role) => openAuthModal(tab, role)}
        onOpenSOS={() => setIsSOSOpen(true)}
      />

      {/* Real-Time Emergency SOS Broadcast Toast */}
      {incomingSOSAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in slide-in-from-top">
          <div className="p-4 bg-red-600 border-2 border-red-300 text-white rounded-2xl shadow-2xl backdrop-blur flex items-center space-x-3">
            <ShieldAlert className="w-7 h-7 flex-shrink-0 animate-bounce" />
            <div className="flex-1">
              <div className="text-xs font-black uppercase tracking-wider">
                Emergency Alert Broadcast
              </div>
              <div className="text-xs font-semibold">
                SOS triggered by {incomingSOSAlert.userName || 'Passenger'} ({incomingSOSAlert.routeNumber})
              </div>
            </div>
            <button
              onClick={() => setIsSOSOpen(true)}
              className="px-2.5 py-1 bg-white text-red-700 font-black rounded-lg text-xs hover:bg-red-50"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 pb-16 md:pb-0">
        
        {/* Main Application Area (Directly Accessible) */}
        {isDriver ? (
          /* Strictly Driver Portal */
          <>
            {activeTab === 'driver-console' && (
              <DriverDashboard />
            )}
            {activeTab === 'map' && (
              <LiveMapView />
            )}
          </>
        ) : (
          /* Commuter & Public Transit Portal */
          <>
            {activeTab === 'map' && (
              <LiveMapView
                focusedTripPlan={focusedTripPlan}
                onClearFocusedTrip={() => setFocusedTripPlan(null)}
                onSelectRouteForPlanning={() => setActiveTab('planner')}
              />
            )}

            {activeTab === 'planner' && (
              <RoutePlanner
                onSwitchToMap={() => setActiveTab('map')}
                onViewRouteOnMap={handleViewRouteOnMap}
              />
            )}

            {activeTab === 'fares' && (
              <FareCalculator
                onOpenAuth={() => openAuthModal('login')}
              />
            )}

            {activeTab === 'rewards' && (
              <RewardsView
                onOpenAuth={() => openAuthModal('login')}
              />
            )}

            {activeTab === 'support' && (
              <SupportView
                onOpenAuth={() => openAuthModal('login')}
              />
            )}
          </>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around py-2 px-1 backdrop-blur ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
      }`}>
        {isDriver ? (
          <>
            <button
              onClick={() => setActiveTab('driver-console')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-bold transition ${
                activeTab === 'driver-console' ? 'text-amber-500 font-black' : 'text-slate-400'
              }`}
            >
              <Gauge className="w-5 h-5 mb-0.5" />
              <span>Driver Cockpit</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-bold transition ${
                activeTab === 'map' ? 'text-sky-500 font-black' : 'text-slate-400'
              }`}
            >
              <Map className="w-5 h-5 mb-0.5" />
              <span>City Fleet</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-semibold transition ${
                activeTab === 'map' ? 'text-sky-500 font-bold' : 'text-slate-400'
              }`}
            >
              <Map className="w-5 h-5 mb-0.5" />
              <span>Live Map</span>
            </button>

            <button
              onClick={() => setActiveTab('planner')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-semibold transition ${
                activeTab === 'planner' ? 'text-sky-500 font-bold' : 'text-slate-400'
              }`}
            >
              <Navigation className="w-5 h-5 mb-0.5" />
              <span>Plan Trip</span>
            </button>

            <button
              onClick={() => setActiveTab('fares')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-semibold transition ${
                activeTab === 'fares' ? 'text-sky-500 font-bold' : 'text-slate-400'
              }`}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span>Fares</span>
            </button>

            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-semibold transition ${
                activeTab === 'rewards' ? 'text-sky-500 font-bold' : 'text-slate-400'
              }`}
            >
              <Gift className="w-5 h-5 mb-0.5" />
              <span>Rewards</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`flex flex-col items-center p-1 rounded-lg text-[10px] font-semibold transition ${
                activeTab === 'support' ? 'text-sky-500 font-bold' : 'text-slate-400'
              }`}
            >
              <HelpCircle className="w-5 h-5 mb-0.5" />
              <span>Support</span>
            </button>
          </>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalConfig.isOpen}
        initialTab={authModalConfig.tab}
        initialRole={authModalConfig.role}
        onClose={() => setAuthModalConfig({ ...authModalConfig, isOpen: false })}
      />

      {/* Emergency SOS Modal */}
      <SafetySOSModal
        isOpen={isSOSOpen}
        onClose={() => setIsSOSOpen(false)}
      />

      {/* PWA Mobile App Installation Prompt Banner */}
      <InstallAppBanner />

    </div>
  );
}
