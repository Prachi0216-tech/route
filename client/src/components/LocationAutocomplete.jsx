import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  X, 
  Loader2, 
  Bus, 
  Train, 
  Building2, 
  ShoppingBag, 
  Crosshair, 
  Compass, 
  Sparkles,
  Landmark,
  Plane,
  HeartPulse
} from 'lucide-react';
import { api } from '../services/api';

// Helper to highlight matching substrings
function HighlightMatch({ text, query }) {
  if (!text) return null;
  if (!query || query.trim().length === 0) return <span>{text}</span>;

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-sky-500/20 text-sky-400 font-black px-0.5 rounded">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// Category Icon helper
function getCategoryIcon(place) {
  if (place.category === 'BUS_ROUTE' || place.type === 'BUS_ROUTE') {
    return <Bus className="w-4 h-4 text-sky-400" />;
  }
  if (place.category === 'AIRPORT_TRAIN') {
    return place.icon === 'plane' ? <Plane className="w-4 h-4 text-indigo-400" /> : <Train className="w-4 h-4 text-emerald-400" />;
  }
  if (place.category === 'LANDMARK') {
    return <Landmark className="w-4 h-4 text-amber-400" />;
  }
  if (place.category === 'MARKET') {
    return <ShoppingBag className="w-4 h-4 text-pink-400" />;
  }
  if (place.category === 'HOSPITAL') {
    return <HeartPulse className="w-4 h-4 text-red-400" />;
  }
  if (place.category === 'TECH_HUB' || place.category === 'COLLEGE') {
    return <Building2 className="w-4 h-4 text-cyan-400" />;
  }
  if (place.type === 'TRANSIT_STATION' || place.category === 'TRANSIT') {
    return <Bus className="w-4 h-4 text-sky-400" />;
  }
  return <MapPin className="w-4 h-4 text-emerald-400" />;
}

export default function LocationAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search station, area, landmark...',
  label = '',
  city = 'delhi',
  isDark = true,
  showLiveLocationOption = false,
  onUseLiveLocation,
  isLiveActive = false,
  onClear,
  inputIcon = null,
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [popularSuggestions, setPopularSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Load initial popular suggestions for the city
  useEffect(() => {
    let isMounted = true;
    const loadPopular = async () => {
      try {
        const res = await api.searchPlaces('', city);
        if (isMounted && res && res.places) {
          setPopularSuggestions(res.places);
        }
      } catch (e) {}
    };
    loadPopular();
    return () => { isMounted = false; };
  }, [city]);

  // Query places whenever user types
  useEffect(() => {
    if (isLiveActive) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = (value || '').trim();
    if (query.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchPlaces(query, city);
        setSuggestions(res.places || []);
        setSelectedIndex(-1);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, city, isLiveActive]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const activeList = value.trim().length > 0 ? suggestions : popularSuggestions;
    if (!isOpen || activeList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < activeList.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : activeList.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < activeList.length) {
        e.preventDefault();
        handleSelectPlace(activeList[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectPlace = (place) => {
    if (onSelect) {
      onSelect(place);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const displayList = value.trim().length > 0 ? suggestions : popularSuggestions;
  const isShowingPopular = value.trim().length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label and Live GPS switch if requested */}
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            {label}
          </label>
          {showLiveLocationOption && (
            <button
              type="button"
              onClick={isLiveActive ? onClear : onUseLiveLocation}
              className="text-[11px] font-bold text-sky-500 hover:underline flex items-center gap-1"
            >
              {isLiveActive ? 'Type Manual Address' : '📍 Use Live GPS'}
            </button>
          )}
        </div>
      )}

      {/* Input container */}
      {isLiveActive ? (
        <div className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
          isDark ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-400' : 'bg-emerald-50 border-emerald-400 text-emerald-800'
        }`}>
          <div className="flex items-center space-x-2 truncate">
            <Crosshair className="w-4 h-4 text-emerald-500 animate-pulse flex-shrink-0" />
            <span className="truncate">📍 My Real-Time GPS Location</span>
          </div>
          <button
            onClick={onClear}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            title="Clear Live GPS"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full ${compact ? 'pl-8 pr-7 py-1.5 text-xs' : 'pl-9 pr-8 py-2.5 text-xs'} font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition ${
              isDark 
                ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
            }`}
          />

          {/* Left Icon */}
          <div className="absolute left-3 pointer-events-none text-slate-400">
            {inputIcon || <Search className="w-4 h-4" />}
          </div>

          {/* Right Action Icons (Clear / Loader) */}
          <div className="absolute right-2.5 flex items-center space-x-1">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />}
            {value && !loading && (
              <button
                type="button"
                onClick={() => {
                  if (onClear) onClear();
                  onChange('');
                  setSuggestions([]);
                  if (inputRef.current) inputRef.current.focus();
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auto-Recommendations Dropdown */}
      {isOpen && !isLiveActive && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 rounded-2xl border shadow-2xl max-h-72 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-700 text-white shadow-2xl shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-2xl shadow-slate-400/20'
        }`}>
          
          {/* Header Title in dropdown */}
          <div className={`px-3.5 py-2 border-b text-[10px] font-black uppercase tracking-wider flex items-center justify-between ${
            isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-100 text-slate-500 bg-slate-50'
          }`}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isShowingPopular ? `Popular Stations & Landmarks in ${city.toUpperCase()}` : `Auto Recommendations (${displayList.length})`}
            </span>
            {loading && <span className="text-sky-400 lowercase animate-pulse">searching...</span>}
          </div>

          {/* Shortcut: Route from Live GPS if enabled */}
          {showLiveLocationOption && (
            <button
              type="button"
              onClick={() => {
                if (onUseLiveLocation) onUseLiveLocation();
                setIsOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 text-left flex items-center space-x-2.5 border-b transition ${
                isDark ? 'border-slate-800 hover:bg-emerald-950/30 text-emerald-400' : 'border-slate-100 hover:bg-emerald-50 text-emerald-700'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>📍 Use Real-Time Live GPS Location</span>
                  <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-500/20 rounded uppercase">Accurate</span>
                </div>
                <div className="text-[10px] opacity-75">
                  Auto-detect exact pickup coordinates from your phone GPS
                </div>
              </div>
            </button>
          )}

          {/* List items */}
          {displayList.length === 0 && !loading ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching stations or locations found. Try typing another colony name or landmark.
            </div>
          ) : (
            displayList.map((place, idx) => {
              const isSelected = selectedIndex === idx;
              const isBusRoute = place.category === 'BUS_ROUTE' || place.type === 'BUS_ROUTE';

              return (
                <button
                  key={place.id || idx}
                  type="button"
                  onClick={() => handleSelectPlace(place)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3.5 py-2.5 text-left flex items-start space-x-3 transition border-b last:border-0 ${
                    isSelected
                      ? isDark ? 'bg-sky-600/20 border-sky-500/40 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-900'
                      : isDark ? 'border-slate-800/80 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {/* Icon badge */}
                  <div className={`p-1.5 rounded-xl flex-shrink-0 mt-0.5 ${
                    isBusRoute
                      ? 'bg-sky-500/20 text-sky-400 font-black'
                      : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {getCategoryIcon(place)}
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-2">
                      <HighlightMatch text={place.name} query={value} />
                      {place.routeNumber && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-sky-500 text-white rounded">
                          Route {place.routeNumber}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <HighlightMatch text={place.displayName || place.name} query={value} />
                    </div>
                  </div>

                  {/* Category Pill */}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex-shrink-0 tracking-wider ${
                    isBusRoute
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : place.category === 'LANDMARK'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : place.category === 'MARKET'
                      ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                      : place.category === 'HOSPITAL'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : place.category === 'TECH_HUB'
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : place.category === 'AIRPORT_TRAIN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600/40'
                  }`}>
                    {place.categoryLabel || place.type || 'Location'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
