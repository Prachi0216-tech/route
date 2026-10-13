import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  ArrowRight, 
  Bus, 
  Clock, 
  IndianRupee, 
  Leaf, 
  ChevronRight, 
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  Compass,
  Search,
  X,
  Crosshair,
  Loader2,
  Share2
} from 'lucide-react';
import { api } from '../services/api';
import { useCity } from '../context/CityContext';
import { useTheme } from '../context/ThemeContext';
import LocationAutocomplete from './LocationAutocomplete';

export default function RoutePlanner({ onSwitchToMap, onViewRouteOnMap }) {
  const { currentCity, activeCityConfig } = useCity();
  const { isDark } = useTheme();

  const [stops, setStops] = useState([]);
  
  // Origin State
  const [originText, setOriginText] = useState('');
  const [originId, setOriginId] = useState('');
  const [originCoords, setOriginCoords] = useState(null);
  const [useLiveLocation, setUseLiveLocation] = useState(false);
  const [liveCoords, setLiveCoords] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  // Destination State
  const [destText, setDestText] = useState('');
  const [destId, setDestId] = useState('');
  const [destCoords, setDestCoords] = useState(null);

  // Results State
  const [tripResults, setTripResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadStopsAndInit();
  }, [currentCity]);

  const loadStopsAndInit = async () => {
    try {
      const res = await api.getStops(currentCity);
      if (res && res.stops && res.stops.length > 0) {
        setStops(res.stops);
        const first = res.stops[0];
        const second = res.stops[Math.min(res.stops.length - 1, 3)];
        
        setOriginId(first.id);
        setOriginText(first.name);
        const oCoord = { lat: first.lat, lng: first.lng, name: first.name };
        setOriginCoords(oCoord);

        setDestId(second.id);
        setDestText(second.name);
        const dCoord = { lat: second.lat, lng: second.lng, name: second.name };
        setDestCoords(dCoord);

        executePlanTrip({
          origId: first.id,
          dstId: second.id,
          origCoords: oCoord,
          dstCoords: dCoord,
          origTxt: first.name,
          dstTxt: second.name
        });
      }
    } catch (err) {
      console.error('Error loading stops:', err);
    }
  };

  // Select place for Origin from autocomplete
  const handleSelectOriginPlace = (place) => {
    setOriginText(place.name);
    const coords = { lat: place.lat, lng: place.lng, name: place.name };
    setOriginCoords(coords);
    const oId = place.type === 'TRANSIT_STATION' ? place.id : '';
    setOriginId(oId);
    setUseLiveLocation(false);

    if (destCoords || destId || destText) {
      executePlanTrip({
        origId: oId,
        dstId: destId,
        origCoords: coords,
        dstCoords: destCoords,
        origTxt: place.name,
        dstTxt: destText
      });
    }
  };

  // Select place for Destination from autocomplete
  const handleSelectDestPlace = (place) => {
    setDestText(place.name);
    const coords = { lat: place.lat, lng: place.lng, name: place.name };
    setDestCoords(coords);
    const dId = place.type === 'TRANSIT_STATION' ? place.id : '';
    setDestId(dId);

    if (useLiveLocation || originCoords || originId || originText) {
      executePlanTrip({
        origId: originId,
        dstId: dId,
        origCoords: useLiveLocation ? liveCoords : originCoords,
        dstCoords: coords,
        origTxt: useLiveLocation ? 'My Live GPS Location' : originText,
        dstTxt: place.name
      });
    }
  };

  // Core Trip Planner Executor
  const executePlanTrip = async (customParams = null) => {
    setErrorMsg('');
    const oId = customParams?.origId ?? originId;
    const dId = customParams?.dstId ?? destId;
    const oCoords = customParams?.origCoords ?? (useLiveLocation ? liveCoords : originCoords);
    const dCoords = customParams?.dstCoords ?? destCoords;
    const oTxt = customParams?.origTxt ?? originText;
    const dTxt = customParams?.dstTxt ?? destText;

    if (!useLiveLocation && !oTxt && !oId && !oCoords) {
      setErrorMsg('Please enter an origin station or address.');
      return;
    }
    if (!dTxt && !dId && !dCoords) {
      setErrorMsg('Please enter a destination station or address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.planTrip(
        oId || null,
        dId || null,
        oCoords || null,
        dCoords || null,
        currentCity,
        oTxt || '',
        dTxt || ''
      );

      if (res && res.error) {
        setErrorMsg(res.error);
        setTripResults(null);
      } else {
        setTripResults(res);
      }
    } catch (err) {
      console.error('Error planning trip:', err);
      setErrorMsg('Could not find route. Please check location names.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableLiveLocation = () => {
    setFetchingLocation(true);
    setShowOriginDropdown(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'My Live GPS Location',
            isLiveGPS: true
          };
          setLiveCoords(coords);
          setOriginCoords(coords);
          setOriginText('My Live Location (GPS)');
          setOriginId('');
          setUseLiveLocation(true);
          setFetchingLocation(false);
          executePlanTrip({
            origId: null,
            dstId: destId,
            origCoords: coords,
            dstCoords: destCoords,
            origTxt: 'My Live Location (GPS)',
            dstTxt: destText
          });
        },
        (err) => {
          const fallbackCoords = {
            lat: activeCityConfig.center[0] + 0.008,
            lng: activeCityConfig.center[1] - 0.006,
            name: 'My Live Location (City Pin)',
            isLiveGPS: true
          };
          setLiveCoords(fallbackCoords);
          setOriginCoords(fallbackCoords);
          setOriginText('My Live Location (GPS)');
          setOriginId('');
          setUseLiveLocation(true);
          setFetchingLocation(false);
          executePlanTrip({
            origId: null,
            dstId: destId,
            origCoords: fallbackCoords,
            dstCoords: destCoords,
            origTxt: 'My Live Location (GPS)',
            dstTxt: destText
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const fallbackCoords = {
        lat: activeCityConfig.center[0] + 0.008,
        lng: activeCityConfig.center[1] - 0.006,
        name: 'My Live Location (City Pin)',
        isLiveGPS: true
      };
      setLiveCoords(fallbackCoords);
      setOriginCoords(fallbackCoords);
      setOriginText('My Live Location (GPS)');
      setOriginId('');
      setUseLiveLocation(true);
      setFetchingLocation(false);
      executePlanTrip({
        origId: null,
        dstId: destId,
        origCoords: fallbackCoords,
        dstCoords: destCoords,
        origTxt: 'My Live Location (GPS)',
        dstTxt: destText
      });
    }
  };

  const clearOrigin = () => {
    setOriginText('');
    setOriginId('');
    setOriginCoords(null);
    setUseLiveLocation(false);
    setOriginSuggestions([]);
    if (originInputRef.current) originInputRef.current.focus();
  };

  const clearDest = () => {
    setDestText('');
    setDestId('');
    setDestCoords(null);
    setDestSuggestions([]);
    if (destInputRef.current) destInputRef.current.focus();
  };

  const swapOriginDest = () => {
    if (useLiveLocation) {
      setUseLiveLocation(false);
    }
    const tempText = originText;
    const tempId = originId;
    const tempCoords = originCoords;

    setOriginText(destText);
    setOriginId(destId);
    setOriginCoords(destCoords);

    setDestText(tempText);
    setDestId(tempId);
    setDestCoords(tempCoords);

    executePlanTrip({
      origId: destId,
      dstId: tempId,
      origCoords: destCoords,
      dstCoords: tempCoords,
      origTxt: destText,
      dstTxt: tempText
    });
  };

  const handleViewOnMap = (option) => {
    if (onViewRouteOnMap && tripResults) {
      onViewRouteOnMap(option, tripResults.origin, tripResults.destination);
    } else if (onSwitchToMap) {
      onSwitchToMap();
    }
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 py-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Hero Header */}
      <div className={`border rounded-2xl p-6 shadow-xl ${
        isDark 
          ? 'bg-gradient-to-r from-sky-950/50 via-slate-900 to-indigo-950/40 border-sky-500/20' 
          : 'bg-gradient-to-r from-sky-100 via-white to-indigo-50 border-sky-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sky-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Multi-Modal Commute Engine • {activeCityConfig.name}</span>
            </div>
            <h2 className="text-2xl font-black">
              Search Multi-Route Transit & Compare Real Fares
            </h2>
            <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Type any <strong>custom address, landmark, or colony name</strong>, or route directly from your <strong>Live GPS</strong>. Compare at least 2 to 3 live transit options with turn-by-turn road curves.
            </p>
          </div>

          <button
            onClick={handleEnableLiveLocation}
            disabled={fetchingLocation}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition border shadow-lg whitespace-nowrap ${
              useLiveLocation
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                : isDark ? 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-sky-500/30' : 'bg-white hover:bg-slate-50 text-sky-600 border-sky-300'
            }`}
          >
            <Compass className={`w-4 h-4 ${fetchingLocation ? 'animate-spin' : ''}`} />
            <span>{fetchingLocation ? 'Acquiring GPS...' : useLiveLocation ? '📍 Live GPS Active' : '📍 Route from My Live GPS'}</span>
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className={`border rounded-2xl p-5 shadow-xl relative z-20 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Origin Input with LocationAutocomplete */}
          <div className="md:col-span-5">
            <LocationAutocomplete
              label={
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${useLiveLocation ? 'bg-emerald-500 animate-ping' : 'bg-sky-500'}`}></span>
                  <span>Origin {useLiveLocation ? '(Live GPS Location)' : '(Station, Colony, or Landmark)'}</span>
                </span>
              }
              value={originText}
              onChange={(val) => {
                setOriginText(val);
                setOriginId('');
                setOriginCoords(null);
                setUseLiveLocation(false);
              }}
              onSelect={handleSelectOriginPlace}
              placeholder={`Type colony, landmark, stop (e.g. Connaught Place, Sec 62)...`}
              city={currentCity}
              isDark={isDark}
              showLiveLocationOption={true}
              onUseLiveLocation={handleEnableLiveLocation}
              isLiveActive={useLiveLocation}
              onClear={clearOrigin}
              inputIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Swap Button */}
          <div className="md:col-span-2 flex justify-center py-1 mt-4 md:mt-0">
            <button
              onClick={swapOriginDest}
              className={`p-2.5 rounded-xl border transition shadow-sm ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title="Swap Origin and Destination"
            >
              <ArrowUpDown className="w-4 h-4 md:rotate-90" />
            </button>
          </div>

          {/* Destination Input with LocationAutocomplete */}
          <div className="md:col-span-5">
            <LocationAutocomplete
              label={
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Destination (Station, Colony, or Landmark)</span>
                </span>
              }
              value={destText}
              onChange={(val) => {
                setDestText(val);
                setDestId('');
                setDestCoords(null);
              }}
              onSelect={handleSelectDestPlace}
              placeholder={`Type destination (e.g. Gaur City 2, Noida Sec 62, Indiranagar)...`}
              city={currentCity}
              isDark={isDark}
              onClear={clearDest}
              inputIcon={<MapPin className="w-4 h-4 text-emerald-500" />}
            />
          </div>
        </div>

        {/* Quick Popular Station Chips */}
        {stops.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/40 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Bus className="w-3.5 h-3.5 text-sky-400" />
              Popular Hubs ({activeCityConfig.name}):
            </span>
            {stops.slice(0, 6).map(s => (
              <button
                key={s.id}
                onClick={() => {
                  if (!originText || useLiveLocation) {
                    setDestText(s.name);
                    setDestId(s.id);
                    setDestCoords({ lat: s.lat, lng: s.lng, name: s.name });
                  } else {
                    setDestText(s.name);
                    setDestId(s.id);
                    setDestCoords({ lat: s.lat, lng: s.lng, name: s.name });
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                  isDark 
                    ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                📍 {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {useLiveLocation ? (
              <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Routing from your device's exact GPS coordinates to destination
              </span>
            ) : (
              <span>Type any location or landmark to calculate real road distance and compare fares</span>
            )}
          </div>

          <button
            onClick={() => executePlanTrip()}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            <span>{loading ? 'Routing Across Roads...' : 'Calculate Alternative Routes'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Route Results Section (At least 2 to 3 distinct routes) */}
      {tripResults && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Found {tripResults.options?.length || 0} Alternative Routes • Est. Road Distance: ~{tripResults.distanceKm} km
            </h3>
            <div className="text-xs text-sky-400 font-semibold">
              From: <span className="font-bold text-white">{tripResults.origin?.name}</span> ➔ To: <span className="font-bold text-white">{tripResults.destination?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tripResults.options?.map((opt, index) => {
              const isDirectBus = opt.type === 'DIRECT_BUS';
              const isMultiModal = opt.type === 'MULTI_MODAL';
              const isAuto = opt.type === 'DIRECT_AUTO' || opt.type === 'SHARED_AUTO';

              return (
                <div
                  key={opt.id || index}
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition hover:scale-[1.01] shadow-xl ${
                    isDirectBus
                      ? isDark ? 'border-sky-500/50 bg-gradient-to-b from-sky-950/30 to-slate-900' : 'border-sky-400 bg-sky-50/60'
                      : isMultiModal
                      ? isDark ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-slate-900' : 'border-emerald-400 bg-emerald-50/60'
                      : isDark ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-slate-900' : 'border-amber-400 bg-amber-50/60'
                  }`}
                >
                  <div>
                    {/* Header Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                        isDirectBus
                          ? 'bg-sky-600 text-white'
                          : isMultiModal
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}>
                        {opt.tag || opt.type}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-500" />
                        Leaves in <strong>{opt.nextDepartureMins}m</strong>
                      </span>
                    </div>

                    <h4 className="text-base font-black mb-1">
                      {opt.title}
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">{opt.summary}</p>

                    {/* Metrics Row */}
                    <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl mb-4 text-center border ${
                      isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <div className="text-[10px] text-slate-400">Total Duration</div>
                        <div className="text-sm font-black">{opt.totalDurationMins} mins</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Total Est. Fare</div>
                        <div className="text-sm font-black text-emerald-500">₹{opt.totalFare}</div>
                      </div>
                    </div>

                    {/* Step-by-Step Segments */}
                    <div className="space-y-2.5 mb-5">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Transit Segments:
                      </div>
                      {opt.segments?.map((seg, sIdx) => (
                        <div key={sIdx} className="flex items-start space-x-2 text-xs">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${
                            seg.mode === 'BUS' 
                              ? 'bg-sky-500 text-white' 
                              : seg.mode === 'AUTO' || seg.mode === 'SHARED_AUTO' 
                              ? 'bg-amber-500 text-slate-950' 
                              : 'bg-slate-700 text-slate-200'
                          }`}>
                            {seg.mode}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold">
                              {seg.instructions || `${seg.routeName || seg.routeNumber} (${seg.boardStop} ➔ ${seg.alightStop})`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ~{seg.durationMins} mins • {seg.fare ? `₹${seg.fare}` : 'Free Walk'} {seg.frequency ? `• ${seg.frequency}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleViewOnMap(opt)}
                    className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-sky-400' : 'bg-white hover:bg-slate-100 border-slate-300 text-sky-600'
                    }`}
                  >
                    <span>View Road Route on Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

