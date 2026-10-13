import React, { useState } from 'react';
import { 
  Bus, 
  Navigation, 
  ShieldAlert, 
  Coins, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Gauge, 
  Sun, 
  Moon, 
  MapPin, 
  ChevronDown,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCity } from '../context/CityContext';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth, onOpenSOS }) {
  const { user, isAuthenticated, isDriver, isCommuter, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { currentCity, setCurrentCity, cities, activeCityConfig } = useCity();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const filteredCities = cities.filter(c => {
    if (selectedRegion !== 'ALL' && c.region !== selectedRegion) return false;
    if (citySearchQuery.trim()) {
      const q = citySearchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.state || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur transition-colors ${
      isDark 
        ? 'bg-slate-900/95 border-slate-800 text-white' 
        : 'bg-white/95 border-slate-200 text-slate-900'
    } shadow-md`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & City Selector */}
          <div className="flex items-center space-x-3">
            <div 
              className="flex items-center space-x-2.5 cursor-pointer" 
              onClick={() => setActiveTab(isDriver ? 'driver-console' : 'map')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xl font-black tracking-tight bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-400 bg-clip-text text-transparent">
                    MyRoute
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    INDIA
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-none hidden sm:block">
                  All India Public Transit (28+ States)
                </p>
              </div>
            </div>

            {/* Comprehensive All-India 28+ State Selector Dropdown */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setCityMenuOpen(!cityMenuOpen)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  isDark
                    ? 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-sm'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span className="max-w-[140px] truncate">{activeCityConfig.name}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${cityMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {cityMenuOpen && (
                <div className={`absolute left-0 mt-2 w-80 rounded-2xl border shadow-2xl p-2.5 z-50 text-xs animate-in fade-in zoom-in-95 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white shadow-2xl shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/20'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Select State / UT ({cities.length} Available)</span>
                    </div>
                    <button 
                      onClick={() => setCityMenuOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search inside state dropdown */}
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search state, city or UT..."
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                      autoFocus
                    />
                  </div>

                  {/* Regional Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 scrollbar-none text-[9px]">
                    {['ALL', 'North', 'West', 'South', 'East', 'Central', 'North-East'].map(reg => (
                      <button
                        key={reg}
                        onClick={() => setSelectedRegion(reg)}
                        className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition ${
                          selectedRegion === reg
                            ? 'bg-sky-500 text-white'
                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable State List */}
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {filteredCities.length === 0 ? (
                      <div className="text-center py-4 text-[11px] text-slate-400">
                        No states found matching "{citySearchQuery}"
                      </div>
                    ) : (
                      filteredCities.map((city) => (
                        <button
                          key={city.id}
                          onClick={() => {
                            setCurrentCity(city.id);
                            setCityMenuOpen(false);
                            setCitySearchQuery('');
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between font-medium transition ${
                            currentCity === city.id
                              ? 'bg-sky-500 text-white font-bold shadow'
                              : isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-xs font-bold truncate">{city.name}</span>
                            <span className={`text-[10px] ${currentCity === city.id ? 'text-sky-100' : 'text-slate-400'}`}>
                              {city.state} {city.region ? `• ${city.region}` : ''}
                            </span>
                          </div>
                          {currentCity === city.id && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-sky-600 flex-shrink-0">
                              Active
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Nav Tabs (Always Available for All Users) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {isDriver ? (
              <>
                <button
                  onClick={() => setActiveTab('driver-console')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition ${
                    activeTab === 'driver-console' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  🛺 Driver Cockpit & Broadcast
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === 'map' 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  City Fleet Map
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === 'map' 
                      ? 'bg-sky-500 text-white font-bold shadow' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live Map
                </button>
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === 'planner' 
                      ? 'bg-sky-500 text-white font-bold shadow' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plan Trip (Multi-Route)
                </button>
                <button
                  onClick={() => setActiveTab('fares')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === 'fares' 
                      ? 'bg-sky-500 text-white font-bold shadow' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Fare Matrix & Crowdsource
                </button>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === 'rewards' 
                      ? 'bg-sky-500 text-white font-bold shadow' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rewards Wallet
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeTab === 'support' 
                      ? 'bg-sky-500 text-white font-bold shadow' 
                      : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Support
                </button>
              </>
            )}
          </nav>

          {/* Right Action Tools: Dark/Bright Theme, SOS, Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Dark / Bright Mode Switcher */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-indigo-600'
              }`}
              title={isDark ? 'Switch to Bright Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Emergency SOS Button */}
            <button
              onClick={onOpenSOS}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-red-600/30 transition animate-pulse"
              title="Emergency Transit SOS"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SOS</span>
            </button>

            {/* Commuter Reward Points Badge */}
            <button
              onClick={() => setActiveTab('rewards')}
              className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/20 transition"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{user?.rewardPoints !== undefined ? `${user.rewardPoints} pts` : '50 pts'}</span>
            </button>

            {/* User Profile / Login / Logout */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                {/* Prominent Log Out Button */}
                <button
                  onClick={logout}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-black transition shadow-sm ${
                    isDark
                      ? 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/40 hover:border-red-500'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-300'
                  }`}
                  title="Sign out of MyRoute"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Logout</span>
                </button>

                <div className="flex items-center space-x-2 pl-2 border-l border-slate-700/50">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                    isDriver 
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' 
                      : 'bg-sky-500/20 border border-sky-500/40 text-sky-400'
                  }`}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold leading-tight">
                      {user?.name || 'Commuter'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isDriver ? `${user.vehicleType} • ${user.routeNumber}` : 'Commuter'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register', 'SELECT')}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/25 transition"
                >
                  Register
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-t px-4 pt-2 pb-4 space-y-2 ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
        }`}>
          {isDriver ? (
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => {
                  setActiveTab('driver-console');
                  setMobileMenuOpen(false);
                }}
                className={`w-full p-2.5 rounded-lg text-left font-black ${activeTab === 'driver-console' ? 'bg-amber-500 text-slate-950' : 'text-amber-400'}`}
              >
                🛺 Driver Cockpit & Broadcast
              </button>
              <button
                onClick={() => {
                  setActiveTab('map');
                  setMobileMenuOpen(false);
                }}
                className={`w-full p-2.5 rounded-lg text-left font-semibold ${activeTab === 'map' ? 'bg-slate-800 text-sky-400' : 'text-slate-300'}`}
              >
                🗺️ City Fleet View
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => {
                  setActiveTab('map');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${activeTab === 'map' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                🗺️ Live Map
              </button>
              <button
                onClick={() => {
                  setActiveTab('planner');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${activeTab === 'planner' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                🧭 Plan Multi-Route
              </button>
              <button
                onClick={() => {
                  setActiveTab('fares');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${activeTab === 'fares' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                💳 Fare Matrix
              </button>
              <button
                onClick={() => {
                  setActiveTab('rewards');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${activeTab === 'rewards' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                🎁 Rewards
              </button>
              <button
                onClick={() => {
                  setActiveTab('support');
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded-lg text-left font-medium ${activeTab === 'support' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
              >
                💬 Support
              </button>
            </div>
          )}

          {/* Mobile Logout action */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-700/50">
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out ({user?.name || 'Account'})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
