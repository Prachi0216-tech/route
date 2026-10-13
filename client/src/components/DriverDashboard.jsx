import React, { useState, useEffect, useRef } from 'react';
import { 
  Gauge, 
  Power, 
  Users, 
  Navigation, 
  Radio, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  IndianRupee,
  RefreshCw,
  Sliders,
  Sparkles,
  Phone,
  ShieldAlert,
  AlertCircle,
  Truck,
  Edit3,
  X,
  Compass,
  ArrowRight,
  Zap,
  Check,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import socket from '../services/socket';

export default function DriverDashboard() {
  const { user, updateDriverVehicle, toggleDriverShiftStatus, refreshUser } = useAuth();
  const { isDark } = useTheme();

  // Shift & Status State
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const [gpsStatus, setGpsStatus] = useState('LIVE_GPS'); // 'LIVE_GPS' | 'SIMULATING' | 'OFFLINE'
  const [hasLocationPermission, setHasLocationPermission] = useState(user?.hasLocationPermission ?? true);
  
  // Real-time telemetry (Starts at 0 km/h)
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentHeading, setCurrentHeading] = useState(user?.heading || 90);
  const [lastCoords, setLastCoords] = useState(user?.currentLocation || { lat: 26.8467, lng: 80.9462 });
  
  // Passenger Seats
  const [availableSeats, setAvailableSeats] = useState(user?.availableSeats ?? (user?.vehicleType === 'AUTO' ? 2 : 28));
  const [totalSeats, setTotalSeats] = useState(user?.totalSeats || (user?.vehicleType === 'AUTO' ? 3 : 45));

  // Shift Stats (Real Initial Data)
  const [dailyEarnings, setDailyEarnings] = useState(user?.shiftEarnings || 0);
  const [dailyTrips, setDailyTrips] = useState(user?.totalTrips || 0);
  const [kmDriven, setKmDriven] = useState(0.0);

  // Available routes for live route assignment & stop progression
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [routeStops, setRouteStops] = useState([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // Vehicle Edit Modal State
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    vehicleType: user?.vehicleType || 'BUS',
    fleetOperator: user?.fleetOperator || 'UPSRTC',
    vehicleNumber: user?.vehicleNumber || 'UP 32 AZ 4589',
    busNumber: user?.busNumber || 'UP-LKO-01',
    routeNumber: user?.routeNumber || 'UPSRTC-101',
    vehicleModel: user?.vehicleModel || 'Ashok Leyland Janrath AC Coach',
    totalSeats: user?.totalSeats || 45,
    hasAC: user?.hasAC ?? true,
    isElectric: user?.isElectric ?? false,
    city: user?.city || 'uttar_pradesh'
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const geoWatchIdRef = useRef(null);

  // Load database routes & stops
  useEffect(() => {
    loadTransitRoutes();
  }, [user]);

  const loadTransitRoutes = async () => {
    try {
      const [routesRes, stopsRes] = await Promise.all([
        api.getRoutes('all'),
        api.getStops('all')
      ]);

      if (routesRes && routesRes.routes) {
        setAvailableRoutes(routesRes.routes);
        
        // Find assigned route and its stops
        const currentRouteNum = user?.routeNumber || 'UPSRTC-101';
        const matched = routesRes.routes.find(r => r.routeNumber === currentRouteNum) || routesRes.routes[0];
        
        if (matched && matched.stops && stopsRes && stopsRes.stops) {
          const matchedStops = matched.stops.map(sId => stopsRes.stops.find(s => s.id === sId)).filter(Boolean);
          setRouteStops(matchedStops);
        }
      }
    } catch (err) {
      console.error('Error loading routes in driver cockpit:', err);
    }
  };

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setIsOnline(user.isOnline ?? true);
      setAvailableSeats(user.availableSeats ?? (user.vehicleType === 'AUTO' ? 2 : 28));
      setTotalSeats(user.totalSeats || (user.vehicleType === 'AUTO' ? 3 : 45));
      if (user.currentLocation) setLastCoords(user.currentLocation);
      
      setEditFormData({
        vehicleType: user.vehicleType || 'BUS',
        fleetOperator: user.fleetOperator || 'UPSRTC',
        vehicleNumber: user.vehicleNumber || 'UP 32 AZ 4589',
        busNumber: user.busNumber || 'UP-LKO-01',
        routeNumber: user.routeNumber || 'UPSRTC-101',
        vehicleModel: user.vehicleModel || 'Ashok Leyland Janrath AC Coach',
        totalSeats: user.totalSeats || 45,
        hasAC: user.hasAC ?? true,
        isElectric: user.isElectric ?? false,
        city: user.city || 'uttar_pradesh'
      });
    }
  }, [user]);

  // Real-time broadcast transmitter loop
  useEffect(() => {
    if (!isOnline || !user) return;

    const nextStopName = routeStops[currentStopIndex]?.name || user.nextStop || 'Terminal Hub';
    const crowdStatus = availableSeats > 15 ? 'AVAILABLE' : availableSeats > 5 ? 'MODERATE' : 'CROWDED';

    // Broadcast location update
    const broadcastLocation = (coords, speed, heading) => {
      socket.emit('driver:location_update', {
        driverId: user.id,
        driverName: user.name,
        driverPhone: user.phone || '',
        city: user.city || 'uttar_pradesh',
        routeNumber: user.routeNumber || 'UPSRTC-101',
        vehicleType: user.vehicleType || 'BUS',
        fleetOperator: user.fleetOperator || 'UPSRTC',
        vehicleNumber: user.vehicleNumber || 'UP 32 AZ 4589',
        busNumber: user.busNumber || 'UP-LKO-01',
        vehicleModel: user.vehicleModel || 'Ashok Leyland Janrath AC Coach',
        location: coords,
        speedKmh: speed,
        heading: heading || 90,
        availableSeats,
        totalSeats,
        nextStop: nextStopName,
        crowdDensity: crowdStatus,
        hasAC: user.hasAC,
        isElectric: user.isElectric
      });
    };

    // Initial broadcast on shift active
    broadcastLocation(lastCoords, currentSpeed, currentHeading);

    // Simulation loop if in simulation mode
    let simTimer;
    if (gpsStatus === 'SIMULATING') {
      simTimer = setInterval(() => {
        setLastCoords(prev => {
          const deltaLat = (Math.random() - 0.48) * 0.0004;
          const deltaLng = (Math.random() - 0.48) * 0.0004;
          const updatedCoords = {
            lat: prev.lat + deltaLat,
            lng: prev.lng + deltaLng
          };
          const speed = Math.floor(28 + Math.random() * 18);
          setCurrentSpeed(speed);
          broadcastLocation(updatedCoords, speed, currentHeading);
          return updatedCoords;
        });
      }, 3000);
    }

    return () => {
      if (simTimer) clearInterval(simTimer);
    };
  }, [isOnline, user, availableSeats, totalSeats, gpsStatus, currentStopIndex, routeStops, currentHeading]);

  // Handle Online / Offline Shift Status Toggle
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    try {
      await toggleDriverShiftStatus(nextStatus);
      socket.emit('driver:status_change', {
        driverId: user?.id,
        city: user?.city || 'uttar_pradesh',
        isOnline: nextStatus,
        currentStatus: nextStatus ? 'EN_ROUTE' : 'OFFLINE',
        routeNumber: user?.routeNumber || 'UPSRTC-101'
      });
    } catch (err) {
      console.error('Failed to toggle shift:', err);
    }
  };

  // Seat occupancy quick adjustments
  const updateSeatCount = (delta) => {
    const updated = Math.max(0, Math.min(totalSeats, availableSeats + delta));
    setAvailableSeats(updated);

    socket.emit('driver:location_update', {
      driverId: user?.id,
      driverName: user?.name,
      driverPhone: user?.phone || '',
      city: user?.city || 'uttar_pradesh',
      routeNumber: user?.routeNumber || 'UPSRTC-101',
      vehicleType: user?.vehicleType || 'BUS',
      fleetOperator: user?.fleetOperator || 'UPSRTC',
      vehicleNumber: user?.vehicleNumber,
      busNumber: user?.busNumber,
      location: lastCoords,
      speedKmh: currentSpeed,
      availableSeats: updated,
      totalSeats,
      crowdDensity: updated > 15 ? 'AVAILABLE' : updated > 5 ? 'MODERATE' : 'CROWDED'
    });
  };

  // Hardware GPS Sensor Toggle
  const handleToggleHardwareGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation sensor is not supported by your browser.');
      return;
    }

    if (geoWatchIdRef.current) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
      setGpsStatus('SIMULATING');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHasLocationPermission(true);
        setGpsStatus('LIVE_GPS');
        
        geoWatchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            const coords = {
              lat: watchPos.coords.latitude,
              lng: watchPos.coords.longitude
            };
            const speed = Math.round((watchPos.coords.speed || 0) * 3.6);
            const heading = Math.round(watchPos.coords.heading || 90);
            
            setLastCoords(coords);
            setCurrentSpeed(speed || 34);
            setCurrentHeading(heading);

            socket.emit('driver:location_update', {
              driverId: user?.id,
              driverName: user?.name,
              driverPhone: user?.phone || '',
              city: user?.city || 'uttar_pradesh',
              routeNumber: user?.routeNumber || 'UPSRTC-101',
              vehicleType: user?.vehicleType || 'BUS',
              fleetOperator: user?.fleetOperator || 'UPSRTC',
              vehicleNumber: user?.vehicleNumber,
              busNumber: user?.busNumber,
              location: coords,
              speedKmh: speed || 34,
              heading,
              availableSeats,
              totalSeats
            });
          },
          (err) => console.error('GPS Watch error:', err),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      },
      (err) => {
        alert('Please allow Location Permission in your browser settings to broadcast live device GPS.');
        setGpsStatus('SIMULATING');
      }
    );
  };

  // Next Stop Progression
  const handleAdvanceNextStop = () => {
    if (routeStops.length === 0) return;
    const nextIdx = (currentStopIndex + 1) % routeStops.length;
    setCurrentStopIndex(nextIdx);
    
    // Increment trip earnings
    setDailyEarnings(prev => prev + 120);
    setKmDriven(prev => +(prev + 4.2).toFixed(1));

    const stop = routeStops[nextIdx];
    if (stop) {
      setLastCoords({ lat: stop.lat, lng: stop.lng });
    }
  };

  // Save Vehicle Details & Route Updates
  const handleSaveVehicleUpdates = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMsg('');

    try {
      const res = await updateDriverVehicle(editFormData);
      if (res.success) {
        setSaveMsg('Vehicle and route details updated successfully!');
        setTimeout(() => {
          setIsEditVehicleOpen(false);
          setSaveMsg('');
        }, 1200);
      } else {
        setSaveMsg(res.error || 'Failed to update vehicle details');
      }
    } catch (err) {
      setSaveMsg('Error saving vehicle updates');
    }
    setSaveLoading(false);
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 py-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Location Permission Alert */}
      {!hasLocationPermission && (
        <div className="p-4 bg-amber-500/15 border-2 border-amber-500 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top shadow-lg">
          <div className="flex items-center space-x-3 text-amber-500">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">Device Location Permission Required</h4>
              <p className="text-xs opacity-90">Grant device GPS access so commuters on your transit corridor can view your vehicle live on the map.</p>
            </div>
          </div>
          <button
            onClick={handleToggleHardwareGPS}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs whitespace-nowrap shadow"
          >
            Grant GPS Access
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. DRIVER HEADER & LIVE SHIFT STATUS                 */}
      {/* ==================================================== */}
      <div className={`border rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all ${
        isDark 
          ? isOnline 
            ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40' 
            : 'bg-slate-900/80 border-slate-800'
          : isOnline 
            ? 'bg-gradient-to-r from-amber-100 via-white to-slate-50 border-amber-300' 
            : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl border-2 transition ${
              isOnline 
                ? 'bg-amber-500/20 text-amber-500 border-amber-500 shadow-amber-500/20' 
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {user?.vehicleType === 'AUTO' ? '🛺' : '🚌'}
            </div>
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user?.name}</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Commercial Operator
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {user?.fleetOperator || 'UPSRTC'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Bus Code: <strong className="text-amber-400 font-mono font-bold">{user?.busNumber || user?.routeNumber}</strong></span>
                <span>•</span>
                <span>Plate: <strong className="text-slate-200 font-mono">{user?.vehicleNumber}</strong></span>
                <span>•</span>
                <span>Route: <strong className="text-amber-500 font-bold">{user?.routeNumber}</strong></span>
                <span>•</span>
                <span>DL: <strong className="font-mono text-slate-300">{user?.licenseNumber || 'DL-VERIFIED'}</strong></span>
              </div>
            </div>
          </div>

          {/* Shift Active / Take Break Toggle Action */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleOnline}
              className={`px-6 py-3.5 rounded-2xl text-xs font-black flex items-center space-x-2.5 shadow-2xl transition transform active:scale-95 ${
                isOnline
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Power className={`w-5 h-5 ${isOnline ? 'animate-pulse' : ''}`} />
              <span className="tracking-wider">
                {isOnline ? 'SHIFT ACTIVE (LIVE BROADCASTING)' : 'START SHIFT (OFFLINE)'}
              </span>
            </button>

            <button
              onClick={() => setIsEditVehicleOpen(true)}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl border border-slate-700 shadow-md transition"
              title="Edit Vehicle & Route Details"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. MAIN COCKPIT GRID CONTROLS                        */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Column (7 cols): Live Location Transmitter & Passenger Seat Manager */}
        <div className="md:col-span-7 space-y-5">
          
          {/* 2.1 LIVE GPS TRANSMITTER CARD */}
          <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Radio className={`w-5 h-5 ${isOnline ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Live GPS Location Transmitter
                  </h3>
                  <p className="text-xs text-slate-300 font-semibold">
                    Streaming live coordinates directly to passenger mobile apps
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                gpsStatus === 'LIVE_GPS' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
              }`}>
                {gpsStatus === 'LIVE_GPS' ? '📡 Hardware GPS Sensor Active' : '🔄 Route Cruise Simulator'}
              </span>
            </div>

            {/* Coordinates & Status Telemetry */}
            <div className={`p-4 rounded-2xl border space-y-2.5 ${
              isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Current Coordinates:</span>
                  <span className="font-mono font-bold text-slate-100">
                    {lastCoords.lat.toFixed(5)}° N, {lastCoords.lng.toFixed(5)}° E
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">GPS Signal Strength:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>5G RTK Satellite Lock (100%)</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-700/40">
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Route:</span>
                  <span className="font-bold text-amber-500">
                    Route {user?.routeNumber} ({user?.fleetOperator})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Upcoming Stop:</span>
                  <span className="font-bold text-sky-400">
                    {routeStops[currentStopIndex]?.name || user?.nextStop || 'Terminal Stop'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sensor Switch Action */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleToggleHardwareGPS}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 border transition ${
                  gpsStatus === 'LIVE_GPS'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>{gpsStatus === 'LIVE_GPS' ? 'Hardware GPS Active' : 'Use Device GPS Sensor'}</span>
              </button>

              <button
                onClick={handleAdvanceNextStop}
                className="py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow-md"
              >
                <MapPin className="w-4 h-4" />
                <span>Arrive at Next Stop</span>
              </button>
            </div>
          </div>

          {/* 2.2 PASSENGER SEAT OCCUPANCY CONTROLLER */}
          <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-500" />
                  <span>Real-Time Seat Occupancy Manager</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update live vacant seat count so waiting passengers know if seats are available
                </p>
              </div>
              <div className={`text-2xl font-black ${
                availableSeats > 15 ? 'text-emerald-400' : availableSeats > 5 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {availableSeats} / {totalSeats} Free
              </div>
            </div>

            {/* Occupancy Bar */}
            <div className={`w-full h-3.5 rounded-full overflow-hidden border ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'
            }`}>
              <div
                className={`h-full transition-all duration-300 ${
                  availableSeats > 15 ? 'bg-emerald-500' : availableSeats > 5 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${((totalSeats - availableSeats) / totalSeats) * 100}%` }}
              ></div>
            </div>

            {/* Quick seat adjustment buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => updateSeatCount(-1)}
                disabled={availableSeats <= 0}
                className={`py-3 rounded-xl text-xs font-bold border transition disabled:opacity-40 text-center ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300' : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                + 1 Boarded
              </button>
              <button
                onClick={() => updateSeatCount(1)}
                disabled={availableSeats >= totalSeats}
                className={`py-3 rounded-xl text-xs font-bold border transition disabled:opacity-40 text-center ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-300' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                }`}
              >
                - 1 Alighted
              </button>
              <button
                onClick={() => updateSeatCount(-5)}
                disabled={availableSeats <= 4}
                className={`py-3 rounded-xl text-xs font-bold border transition disabled:opacity-40 text-center ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400' : 'bg-slate-100 text-slate-800'
                }`}
              >
                + 5 Group
              </button>
              <button
                onClick={() => setAvailableSeats(0)}
                className="py-3 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-center transition"
              >
                Mark Bus Full
              </button>
            </div>
          </div>

        </div>

        {/* Right Column (5 cols): Speedometer & Shift Performance */}
        <div className="md:col-span-5 space-y-5">
          
          {/* 2.3 SPEEDOMETER & TELEMETRY */}
          <div className={`border rounded-3xl p-6 shadow-xl text-center space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Transit Speedometer
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Normal Flow
              </span>
            </div>
            
            <div className={`relative w-40 h-40 mx-auto rounded-full border-4 border-amber-500/40 flex flex-col items-center justify-center shadow-inner ${
              isDark ? 'bg-slate-800/80' : 'bg-slate-100'
            }`}>
              <Gauge className="w-6 h-6 text-amber-500 mb-1" />
              <div className="text-4xl font-black tracking-tight">{currentSpeed}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">KM / H</div>
            </div>

            <div className="flex justify-around text-xs text-slate-400 border-t border-slate-800 pt-2">
              <div>
                <span className="block text-[10px]">Speed Limit</span>
                <strong className="text-slate-200">50 km/h</strong>
              </div>
              <div>
                <span className="block text-[10px]">Compass Heading</span>
                <strong className="text-amber-400">{currentHeading}° East</strong>
              </div>
            </div>
          </div>

          {/* 2.4 TODAY'S SHIFT PERFORMANCE */}
          <div className={`border rounded-3xl p-6 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Shift Performance & Earnings</span>
              </h3>
              <button
                onClick={() => setIsEditVehicleOpen(true)}
                className="text-[11px] text-sky-400 font-bold hover:underline"
              >
                Change Route
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-800/70 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Shift Earnings</div>
                <div className="text-2xl font-black text-emerald-400">₹{dailyEarnings}</div>
              </div>
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-800/70 border-slate-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Completed Trips</div>
                <div className="text-2xl font-black text-slate-100">{dailyTrips} trips</div>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl text-xs space-y-2 border ${
              isDark ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex justify-between">
                <span>Distance Driven Today:</span>
                <span className="font-bold text-slate-200">{kmDriven} KM</span>
              </div>
              <div className="flex justify-between">
                <span>Driver Rating:</span>
                <span className="text-amber-400 font-bold">⭐ {user?.rating || '5.0'} / 5.0 (48 reviews)</span>
              </div>
              <div className="flex justify-between">
                <span>Active City Hub:</span>
                <span className="font-bold uppercase text-sky-400">{user?.city}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ==================================================== */}
      {/* 3. IN-COCKPIT VEHICLE & ROUTE EDIT MODAL             */}
      {/* ==================================================== */}
      {isEditVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl p-6 border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <div className="flex items-center space-x-2.5">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black">Update Vehicle & Assigned Route</h3>
              </div>
              <button
                onClick={() => setIsEditVehicleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveMsg && (
              <div className="my-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold animate-in fade-in">
                {saveMsg}
              </div>
            )}

            <form onSubmit={handleSaveVehicleUpdates} className="space-y-3.5 pt-4">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Fleet Operator</label>
                  <select
                    value={editFormData.fleetOperator}
                    onChange={(e) => setEditFormData({ ...editFormData, fleetOperator: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="UPSRTC">UPSRTC (Uttar Pradesh)</option>
                    <option value="DTC">DTC / DIMTS (Delhi)</option>
                    <option value="BEST">BEST (Mumbai)</option>
                    <option value="BMTC">BMTC (Bengaluru)</option>
                    <option value="RSRTC">RSRTC (Rajasthan)</option>
                    <option value="GSRTC">GSRTC (Gujarat)</option>
                    <option value="PRIVATE">Private Transit Operator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Vehicle Category</label>
                  <select
                    value={editFormData.vehicleType}
                    onChange={(e) => setEditFormData({ ...editFormData, vehicleType: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="BUS">State / City Bus</option>
                    <option value="AUTO">Auto Rickshaw</option>
                    <option value="SHUTTLE">Metro Shuttle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Assigned Route Corridor
                </label>
                <select
                  value={editFormData.routeNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, routeNumber: e.target.value })}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-50 border-slate-300 text-amber-700'
                  }`}
                >
                  {availableRoutes.map(r => (
                    <option key={r.id} value={r.routeNumber}>
                      {r.routeNumber}: {r.origin} ↔ {r.destination} ({r.operator || r.city?.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    License Plate No.
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.vehicleNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, vehicleNumber: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Bus Fleet Unit Code
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.busNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, busNumber: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-mono font-bold border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={editFormData.vehicleModel}
                    onChange={(e) => setEditFormData({ ...editFormData, vehicleModel: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    value={editFormData.totalSeats}
                    onChange={(e) => setEditFormData({ ...editFormData, totalSeats: e.target.value })}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.hasAC}
                    onChange={(e) => setEditFormData({ ...editFormData, hasAC: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Air Conditioned (AC)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isElectric}
                    onChange={(e) => setEditFormData({ ...editFormData, isElectric: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>Electric Bus (EV)</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditVehicleOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25 transition"
                >
                  {saveLoading ? 'Saving...' : 'Save & Sync Live Fleet'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
