import React from 'react';
import { 
  Bus, 
  Navigation, 
  Gauge, 
  ShieldCheck, 
  Coins, 
  MapPin, 
  ShieldAlert, 
  ArrowRight, 
  Radio, 
  Sparkles,
  Users,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { useCity } from '../context/CityContext';
import { useTheme } from '../context/ThemeContext';

export default function LandingView({ onOpenAuth }) {
  const { cities, currentCity, setCurrentCity } = useCity();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-[calc(100vh-4rem)] flex flex-col justify-between ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-wider animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>All-India Real-Time Public Transit Network</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Never Miss Your{' '}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-amber-400 bg-clip-text text-transparent">
              Bus or Auto
            </span>{' '}
            Again.
          </h1>

          <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Track live bus and auto-rickshaw locations in real-time across major Indian cities. Plan multi-modal commutes, get verified fare estimates, and travel safely.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <button
              onClick={() => onOpenAuth('register', 'COMMUTER')}
              className="w-full sm:w-auto px-7 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl text-sm shadow-xl shadow-sky-600/30 transition transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Get Started as Commuter</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenAuth('register', 'DRIVER')}
              className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-sm shadow-xl shadow-amber-500/25 transition transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Gauge className="w-4 h-4" />
              <span>Driver & Auto Partner Portal</span>
            </button>
          </div>

          {/* Login prompt */}
          <p className="text-xs text-slate-400 pt-2">
            Already registered?{' '}
            <button
              onClick={() => onOpenAuth('login', 'COMMUTER')}
              className="font-bold text-sky-400 hover:underline"
            >
              Sign in to your account
            </button>
          </p>

        </div>

        {/* Indian Cities Quick Bar */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Active City Transit Hubs
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => setCurrentCity(city.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  currentCity === city.id
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/25'
                    : isDark
                    ? 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                📍 {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-6xl mx-auto">
          
          <div className={`p-6 rounded-2xl border transition ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Live GPS Vehicle Streaming
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Watch buses and autos move smoothly along their assigned route corridors with real-time speed, live stop ETAs, and seat availability.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border transition ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Multi-Route Smart Planner
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Compare at least 2 to 3 alternative routes: fastest direct bus, metered auto, or combined multi-modal connections with full fare breakdowns.
            </p>
          </div>

          <div className={`p-6 rounded-2xl border transition ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Crowd-Sourced Rewards
            </h3>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Report the actual fares you paid to keep public transport honest and earn reward points redeemable for bus passes and auto ride discounts.
            </p>
          </div>

        </div>

      </div>

      {/* Footer */}
      <div className={`border-t py-6 text-center text-xs ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        MyRoute India • Real-Time Public Transit Ecosystem
      </div>

    </div>
  );
}
