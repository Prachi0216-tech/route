import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Bus, 
  MapPin, 
  Users, 
  Gauge, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Search, 
  Navigation,
  Eye,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Footprints,
  CornerDownRight,
  Layers,
  Radio,
  ExternalLink,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import socket from '../services/socket';
import { useCity } from '../context/CityContext';
import { useTheme } from '../context/ThemeContext';
import LocationAutocomplete from './LocationAutocomplete';

export default function LiveMapView({ 
  onSelectRouteForPlanning, 
  focusedTripPlan, 
  onClearFocusedTrip 
}) {
  const { currentCity, setCurrentCity, cities, activeCityConfig } = useCity();
  const { isDark } = useTheme();

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef([]);
  const tripLayersRef = useRef([]);
  const searchPinMarkerRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [activeVehicles, setActiveVehicles] = useState({});
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [activeDrawerTab, setActiveDrawerTab] = useState('ROUTES'); // 'ROUTES' or 'FLEET'
  const [busSearchTerm, setBusSearchTerm] = useState('');
  const [topLocationSearch, setTopLocationSearch] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [showTripSteps, setShowTripSteps] = useState(true);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [activeSimulationRoute, setActiveSimulationRoute] = useState(null);
  const routeSimIntervalRef = useRef(null);

  // Toggle side panel and resize Leaflet map
  const toggleSidePanel = (forceState) => {
    setIsSidePanelOpen(prev => {
      const nextState = typeof forceState === 'boolean' ? forceState : !prev;
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 320);
      return nextState;
    });
  };

  // Load static transit data (Pan-India)
  useEffect(() => {
    loadTransitData();
  }, [currentCity]);

  const loadTransitData = async () => {
    try {
      const [routesRes, stopsRes, vehiclesRes] = await Promise.all([
        api.getRoutes('all'),
        api.getStops('all'),
        api.getActiveVehicles(currentCity)
      ]);

      if (routesRes && routesRes.routes) setRoutes(routesRes.routes);
      if (stopsRes && stopsRes.stops) setStops(stopsRes.stops);
      
      const vMap = {};
      if (vehiclesRes && vehiclesRes.vehicles) {
        vehiclesRes.vehicles.forEach(v => {
          vMap[v.driverId] = v;
        });
        setActiveVehicles(vMap);
      }
    } catch (err) {
      console.error('Error loading map data for city:', err);
    }
  };

  // Real-time Socket.IO vehicle tracking listener
  useEffect(() => {
    const handleInitialVehicles = (initialList) => {
      if (!Array.isArray(initialList)) return;
      const vMap = {};
      initialList.forEach(v => {
        if (!v.city || v.city.toLowerCase() === currentCity.toLowerCase()) {
          vMap[v.driverId] = v;
        }
      });
      setActiveVehicles(vMap);
    };

    const handleVehicleUpdate = (vehicleData) => {
      if (!vehicleData || !vehicleData.driverId) return;
      if (vehicleData.city && vehicleData.city.toLowerCase() !== currentCity.toLowerCase()) return;
      
      setActiveVehicles(prev => {
        const next = { ...prev, [vehicleData.driverId]: vehicleData };
        if (selectedVehicle && selectedVehicle.driverId === vehicleData.driverId) {
          setSelectedVehicle(vehicleData);
        }
        return next;
      });
    };

    const handleVehicleRemoved = ({ driverId }) => {
      if (!driverId) return;
      setActiveVehicles(prev => {
        const next = { ...prev };
        delete next[driverId];
        return next;
      });
      if (selectedVehicle && selectedVehicle.driverId === driverId) {
        setSelectedVehicle(null);
      }
    };

    socket.on('vehicles:initial', handleInitialVehicles);
    socket.on('vehicle:updated', handleVehicleUpdate);
    socket.on('vehicle:removed', handleVehicleRemoved);

    return () => {
      socket.off('vehicles:initial', handleInitialVehicles);
      socket.off('vehicle:updated', handleVehicleUpdate);
      socket.off('vehicle:removed', handleVehicleRemoved);
    };
  }, [selectedVehicle, currentCity]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id) {
      mapContainerRef.current._leaflet_id = null;
    }

    try {
      if (!leafletMapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          preferCanvas: true,
          fadeAnimation: true,
          zoomAnimation: true
        }).setView(activeCityConfig.center, activeCityConfig.zoom);

        // 100% Free Pure OpenStreetMap Standard Tiles (Zero Watermarks)
        const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const tileLayer = L.tileLayer(tileUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19,
          updateWhenZooming: false,
          updateWhenIdle: true
        }).addTo(map);

        tileLayerRef.current = tileLayer;
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        leafletMapRef.current = map;
        setMapReady(true);
      }
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map tiles dynamically on theme switch
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const map = leafletMapRef.current;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true
    }).addTo(map);
  }, [isDark, mapReady]);

  // Fly to new city when city changes
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    leafletMapRef.current.flyTo(activeCityConfig.center, activeCityConfig.zoom, { duration: 1.2 });
    setSelectedRouteFilter('ALL');
    setSelectedVehicle(null);
  }, [currentCity, mapReady, activeCityConfig]);

  // Draw Polylines & Stops on Leaflet Map
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current || routes.length === 0) return;
    const map = leafletMapRef.current;

    polylinesRef.current.forEach(p => {
      try {
        map.removeLayer(p);
      } catch (e) {}
    });
    polylinesRef.current = [];

    const isSingleRouteSelected = selectedRouteFilter !== 'ALL' && selectedRouteFilter !== 'AUTO';
    const singleRoute = isSingleRouteSelected ? routes.find(r => r.routeNumber === selectedRouteFilter) : null;

    if (isSingleRouteSelected && singleRoute) {
      // 1. Highlight Single Bus Route with glowing double polyline
      const routeColor = singleRoute.color || '#0284c7';

      if (singleRoute.waypoints && singleRoute.waypoints.length > 1) {
        // Outer glow polyline
        const glowLine = L.polyline(singleRoute.waypoints, {
          color: routeColor,
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        // Core line
        const coreLine = L.polyline(singleRoute.waypoints, {
          color: routeColor,
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);

        coreLine.bindPopup(`
          <div style="font-size: 13px; font-weight: bold; color: #0f172a; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="background: ${routeColor}; color: white; font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 6px;">
                ${singleRoute.routeNumber}
              </span>
              <span>${singleRoute.name}</span>
            </div>
            <div style="color: #64748b; font-size: 11px;">
              ${singleRoute.description || 'DTC Route Corridor'} • Base Fare: ₹${singleRoute.baseFare}
            </div>
          </div>
        `);

        polylinesRef.current.push(glowLine, coreLine);

        // Zoom map to fit this route
        try {
          map.fitBounds(coreLine.getBounds(), { padding: [50, 50], maxZoom: 16 });
        } catch (e) {}
      }

      // 2. Render sequential numbered stop markers along this specific route
      const routeStops = (singleRoute.stops || [])
        .map(sId => stops.find(s => s.id === sId))
        .filter(Boolean);

      routeStops.forEach((stop, sIdx) => {
        const isFirst = sIdx === 0;
        const isLast = sIdx === routeStops.length - 1;
        const pinBg = isFirst ? '#10b981' : isLast ? '#ef4444' : routeColor;

        const stopIcon = L.divIcon({
          className: 'custom-route-stop-marker',
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background: ${pinBg};
              color: white;
              font-size: 11px;
              font-weight: 900;
              border: 2px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 10px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${sIdx + 1}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
        stopMarker.bindPopup(`
          <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
            <div style="color: ${pinBg}; font-size: 10px; font-weight: 800; text-transform: uppercase;">
              Stop ${sIdx + 1} ${isFirst ? '(Origin Terminal)' : isLast ? '(Destination Terminal)' : ''}
            </div>
            📍 ${stop.name}
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
              Zone: ${stop.zone || activeCityConfig.name} • Route ${singleRoute.routeNumber}
            </div>
          </div>
        `);
        polylinesRef.current.push(stopMarker);
      });

    } else {
      // 3. Draw All Routes or Autos across the city
      const routesToDisplay = selectedRouteFilter === 'ALL'
        ? routes
        : routes.filter(r => r.type === 'AUTO');

      routesToDisplay.forEach(r => {
        if (r.waypoints && r.waypoints.length > 1) {
          const polyline = L.polyline(r.waypoints, {
            color: r.color || '#0284c7',
            weight: 4,
            opacity: 0.75,
            dashArray: r.type === 'AUTO' ? '6, 8' : undefined
          }).addTo(map);

          polyline.bindPopup(`
            <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
              <span style="background: ${r.color || '#0284c7'}; color: white; padding: 2px 5px; border-radius: 4px; font-size: 10px; margin-right: 4px;">
                ${r.routeNumber}
              </span>
              ${r.name}
              <div style="color: #64748b; font-size: 11px; margin-top: 3px;">
                ${r.type} Corridor • Base Fare: ₹${r.baseFare} • Freq: ${r.frequencyMinutes}m
              </div>
            </div>
          `);

          polylinesRef.current.push(polyline);
        }
      });

      // Default Station Pins
      stops.forEach(stop => {
        const stopIcon = L.divIcon({
          className: 'custom-stop-marker',
          html: `
            <div style="
              width: 10px;
              height: 10px;
              background: #ffffff;
              border: 2px solid #0284c7;
              border-radius: 50%;
              box-shadow: 0 0 6px rgba(2, 132, 199, 0.7);
            "></div>
          `,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
        stopMarker.bindPopup(`
          <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
            📍 ${stop.name}
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
              Zone: ${stop.zone || activeCityConfig.name}
            </div>
          </div>
        `);
        polylinesRef.current.push(stopMarker);
      });
    }

  }, [mapReady, routes, stops, selectedRouteFilter, activeCityConfig]);

  // Handle Location Autocomplete Selection from Top Search Bar
  const handleSelectLocationFromSearch = (place) => {
    if (!place) return;
    setTopLocationSearch(place.name);

    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Clear previous search pin
    if (searchPinMarkerRef.current) {
      try {
        map.removeLayer(searchPinMarkerRef.current);
      } catch (e) {}
      searchPinMarkerRef.current = null;
    }

    // If a bus route is selected
    if (place.category === 'BUS_ROUTE' || place.type === 'BUS_ROUTE') {
      if (place.routeNumber) {
        setSelectedRouteFilter(place.routeNumber);
        setActiveDrawerTab('ROUTES');
      }
      return;
    }

    // If a place/station with lat/lng is selected
    if (place.lat && place.lng) {
      map.flyTo([place.lat, place.lng], 15, { duration: 1.2 });

      const pinIcon = L.divIcon({
        className: 'searched-location-pin',
        html: `
          <div style="position: relative; cursor: pointer;">
            <div class="vehicle-pulse-ring" style="background-color: #38bdf844; border: 2px solid #0284c7;"></div>
            <div style="
              width: 32px;
              height: 32px;
              background: #0284c7;
              color: white;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 6px 16px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            ">
              📍
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const pinMarker = L.marker([place.lat, place.lng], { icon: pinIcon }).addTo(map);
      pinMarker.bindPopup(`
        <div style="font-size: 13px; font-weight: bold; color: #0f172a; padding: 2px;">
          <div style="color: #0284c7; font-size: 10px; font-weight: 800; text-transform: uppercase;">
            ${place.categoryLabel || place.type || 'Location'}
          </div>
          <div style="font-size: 13px; font-weight: 900;">${place.name}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
            ${place.displayName || `${place.name}, ${activeCityConfig.name}`}
          </div>
          <div style="margin-top: 8px;">
            <button
              id="plan-from-here-btn"
              style="
                width: 100%;
                background: #0284c7;
                color: white;
                font-size: 11px;
                font-weight: 800;
                padding: 5px 8px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
              "
            >
              🧭 Plan Trip To/From Here
            </button>
          </div>
        </div>
      `).openPopup();

      searchPinMarkerRef.current = pinMarker;
    }
  };

  // Handle Focused Trip Plan Drawing (Exact Street-by-Street Road Network Route)
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    // Clear previous trip layers
    tripLayersRef.current.forEach(layer => {
      try {
        map.removeLayer(layer);
      } catch (e) {}
    });
    tripLayersRef.current = [];

    if (!focusedTripPlan || !focusedTripPlan.origin || !focusedTripPlan.destination) return;

    const { origin, destination, option } = focusedTripPlan;

    // Async renderer for turn-by-turn road curves
    const renderRoadTrip = async () => {
      let routeCoords = [];

      // Extract all key waypoints along the journey
      const rawWaypoints = [[origin.lat, origin.lng]];
      
      if (option?.segments && Array.isArray(option.segments)) {
        option.segments.forEach(seg => {
          if (seg.boardStop) {
            const found = stops.find(s => s.name === seg.boardStop || s.id === seg.boardStop);
            if (found) rawWaypoints.push([found.lat, found.lng]);
          }
          if (seg.alightStop) {
            const found = stops.find(s => s.name === seg.alightStop || s.id === seg.alightStop);
            if (found) rawWaypoints.push([found.lat, found.lng]);
          }
        });
      }
      rawWaypoints.push([destination.lat, destination.lng]);

      // Deduplicate consecutive coordinates
      const cleanWaypoints = [];
      rawWaypoints.forEach((wp, idx) => {
        if (!wp || isNaN(wp[0]) || isNaN(wp[1])) return;
        if (idx === 0) {
          cleanCoordsPush(cleanWaypoints, wp);
        } else {
          const prev = cleanWaypoints[cleanWaypoints.length - 1];
          if (Math.abs(prev[0] - wp[0]) > 0.0005 || Math.abs(prev[1] - wp[1]) > 0.0005) {
            cleanWaypoints.push(wp);
          }
        }
      });

      function cleanCoordsPush(arr, pt) {
        arr.push(pt);
      }

      // 1. If option.roadGeometry already has dense road curve coordinates (> 8 points), use it
      if (option?.roadGeometry && Array.isArray(option.roadGeometry) && option.roadGeometry.length > 8) {
        routeCoords = option.roadGeometry;
      } else {
        // 2. Fetch turn-by-turn road coordinates directly from OSRM OpenStreetMap routing
        try {
          const coordStr = cleanWaypoints.map(c => `${c[1]},${c[0]}`).join(';');
          const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`);
          const osrmData = await osrmRes.json();
          if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes[0] && osrmData.routes[0].geometry) {
            routeCoords = osrmData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          }
        } catch (e) {
          console.error('Direct OSRM fetch error:', e);
        }

        // 3. Fallback via backend endpoint if needed
        if (!routeCoords || routeCoords.length < 5) {
          try {
            const res = await api.getRoadGeometry(cleanWaypoints);
            if (res && res.geometry && res.geometry.length > 5) {
              routeCoords = res.geometry;
            }
          } catch (e) {}
        }

        // 4. Ultimate fallback to cleanWaypoints
        if (!routeCoords || routeCoords.length < 2) {
          routeCoords = cleanWaypoints;
        }
      }

      const isMultiModal = option?.type === 'MULTI_MODAL';
      const isAuto = option?.type === 'DIRECT_AUTO' || option?.type === 'SHARED_AUTO';
      const mainColor = isAuto ? '#f59e0b' : isMultiModal ? '#10b981' : '#0284c7';

      // 1. Glowing outer road border line
      const glowLine = L.polyline(routeCoords, {
        color: mainColor,
        weight: 10,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      tripLayersRef.current.push(glowLine);

      // 2. Crisp inner road direction line
      const innerLine = L.polyline(routeCoords, {
        color: mainColor,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      tripLayersRef.current.push(innerLine);

      // 3. Start Pin (Origin or Live GPS)
      const isLiveOrigin = origin.isLiveGPS || origin.id === 'live_gps_origin';
      const startIcon = L.divIcon({
        className: 'custom-trip-start-pin',
        html: `
          <div style="position: relative;">
            ${isLiveOrigin ? '<div class="vehicle-pulse-ring" style="background-color: rgba(2, 132, 199, 0.4); border: 2px solid #0284c7;"></div>' : ''}
            <div style="
              background: ${isLiveOrigin ? '#0284c7' : '#10b981'};
              color: #ffffff;
              font-weight: 900;
              font-size: ${isLiveOrigin ? '13px' : '11px'};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 14px ${isLiveOrigin ? 'rgba(2, 132, 199, 0.9)' : 'rgba(16, 185, 129, 0.8)'};
            ">
              ${isLiveOrigin ? '📍' : 'A'}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const startMarker = L.marker([origin.lat, origin.lng], { icon: startIcon }).addTo(map);
      startMarker.bindPopup(`
        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
          ${isLiveOrigin ? '📍 Start: My Live Location (GPS)' : `🟢 Start: ${origin.name}`}
          <div style="color: ${isLiveOrigin ? '#0284c7' : '#059669'}; font-size: 11px; margin-top: 2px;">
            ${isLiveOrigin ? `Nearest Hub: ${origin.nearestStop || activeCityConfig.name}` : `Origin Station (${origin.zone || activeCityConfig.name})`}
          </div>
        </div>
      `);
      tripLayersRef.current.push(startMarker);

      // 4. Intermediate Transfer Pins (For Multi-Modal Routes)
      if (option?.segments && option.segments.length > 1) {
        option.segments.forEach((seg, sIdx) => {
          if (sIdx > 0 && seg.boardStop) {
            const transferStopObj = stops.find(s => s.name === seg.boardStop || s.id === seg.boardStop);
            if (transferStopObj) {
              const transferIcon = L.divIcon({
                className: 'custom-trip-transfer-pin',
                html: `
                  <div style="
                    background: #6366f1;
                    color: #ffffff;
                    font-weight: 900;
                    font-size: 11px;
                    padding: 3px 6px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    border: 2px solid #ffffff;
                    box-shadow: 0 3px 10px rgba(99, 102, 241, 0.7);
                    white-space: nowrap;
                  ">
                    <span>🔄 Step ${sIdx + 1}: ${seg.mode === 'BUS' ? `Bus ${seg.routeNumber || ''}` : seg.mode}</span>
                  </div>
                `,
                iconSize: [90, 26],
                iconAnchor: [45, 13]
              });

              const transferMarker = L.marker([transferStopObj.lat, transferStopObj.lng], { icon: transferIcon }).addTo(map);
              transferMarker.bindPopup(`
                <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
                  🔄 Step ${sIdx + 1} Transfer Point: ${transferStopObj.name}
                  <div style="color: #6366f1; font-size: 11px; margin-top: 2px;">
                    ${seg.instructions || `Board ${seg.mode} towards ${seg.alightStop}`}
                  </div>
                </div>
              `);
              tripLayersRef.current.push(transferMarker);
            }
          }
        });
      }

      // 5. Destination Pin
      const endIcon = L.divIcon({
        className: 'custom-trip-end-pin',
        html: `
          <div style="
            background: #ef4444;
            color: #ffffff;
            font-weight: 900;
            font-size: 13px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.8);
          ">
            🏁
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const endMarker = L.marker([destination.lat, destination.lng], { icon: endIcon }).addTo(map);
      endMarker.bindPopup(`
        <div style="font-size: 12px; font-weight: bold; color: #0f172a;">
          🏁 Destination: ${destination.name}
          <div style="color: #dc2626; font-size: 11px; margin-top: 2px;">
            Destination Station (${destination.zone || activeCityConfig.name})
          </div>
        </div>
      `);
      tripLayersRef.current.push(endMarker);

      // 6. Fit map bounds to real road path
      try {
        if (innerLine && innerLine.getBounds) {
          map.fitBounds(innerLine.getBounds(), { padding: [70, 70], maxZoom: 16 });
        }
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    };

    renderRoadTrip();
  }, [mapReady, focusedTripPlan, routes, stops, activeCityConfig]);

  // Update Vehicle Markers in Real Time on Map
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    const currentVehicles = Object.values(activeVehicles);

    const filtered = currentVehicles.filter(v => {
      if (!v || !v.location) return false;
      if (selectedRouteFilter === 'ALL') return true;
      if (selectedRouteFilter === 'AUTO') return v.vehicleType === 'AUTO';
      return v.routeNumber === selectedRouteFilter;
    });

    const activeDriverIds = new Set();

    filtered.forEach(v => {
      activeDriverIds.add(v.driverId);
      const isBus = v.vehicleType === 'BUS';
      const isUP = (v.fleetOperator || '').includes('UPSRTC') || (v.city || '').includes('uttar_pradesh');
      const badgeColor = !isBus ? '#f59e0b' : isUP ? '#d97706' : '#0284c7';
      const iconLabel = isBus ? (v.busNumber || v.routeNumber || 'BUS') : `🛺 ${v.vehicleNumber?.slice(-4) || 'Auto'}`;

      const iconHtml = `
        <div style="position: relative; cursor: pointer;">
          <div class="vehicle-pulse-ring" style="background-color: ${badgeColor}44; border: 1.5px solid ${badgeColor};"></div>
          <div style="
            background: ${badgeColor};
            color: ${isBus ? '#fff' : '#0f172a'};
            font-size: 10px;
            font-weight: 900;
            padding: 3px 6px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            border: 2px solid #ffffff;
            white-space: nowrap;
          ">
            <span>🚍 ${iconLabel}</span>
            <span style="opacity: 0.95; font-size: 9px; background: rgba(0,0,0,0.25); padding: 1px 3px; border-radius: 4px;">${v.speedKmh || 0}km/h</span>
          </div>
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: iconHtml,
        iconSize: [40, 24],
        iconAnchor: [20, 12]
      });

      if (markersRef.current[v.driverId]) {
        markersRef.current[v.driverId].setLatLng([v.location.lat, v.location.lng]);
        markersRef.current[v.driverId].setIcon(vehicleIcon);
      } else {
        const marker = L.marker([v.location.lat, v.location.lng], { icon: vehicleIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedVehicle(v);
        });
        markersRef.current[v.driverId] = marker;
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!activeDriverIds.has(id)) {
        try {
          map.removeLayer(markersRef.current[id]);
        } catch (e) {}
        delete markersRef.current[id];
      }
    });

  }, [mapReady, activeVehicles, selectedRouteFilter]);

  const handleFlyToVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    if (leafletMapRef.current && vehicle.location) {
      leafletMapRef.current.flyTo([vehicle.location.lat, vehicle.location.lng], 15, { duration: 1 });
    }
  };

  const handleSelectBusRoute = (route) => {
    setSelectedRouteFilter(route.routeNumber);
    setSelectedVehicle(null);
    if (leafletMapRef.current && route.waypoints && route.waypoints.length > 0) {
      try {
        const bounds = L.latLngBounds(route.waypoints);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } catch (e) {}
    }
  };

  // Start live GPS moving bus simulation along the selected route's exact waypoints
  const handleStartRouteSimulation = (route) => {
    if (!route || !route.waypoints || route.waypoints.length < 2) return;

    if (routeSimIntervalRef.current) {
      clearInterval(routeSimIntervalRef.current);
      routeSimIntervalRef.current = null;
    }

    let wpIndex = 0;
    const waypoints = route.waypoints;
    const simDriverId = `sim_${route.routeNumber}`;

    const updateSimStep = (idx) => {
      const pt = waypoints[idx];
      const nextPt = waypoints[(idx + 1) % waypoints.length];
      const heading = nextPt ? Math.round(Math.atan2(nextPt[1] - pt[1], nextPt[0] - pt[0]) * 180 / Math.PI) : 90;
      const speed = Math.floor(34 + Math.random() * 12);

      const simVehicle = {
        driverId: simDriverId,
        driverName: `${route.operator || 'Live'} Transit Pilot (${route.routeNumber})`,
        driverPhone: 'Simulated Feed',
        city: currentCity,
        vehicleType: route.type === 'AUTO' ? 'AUTO' : 'BUS',
        fleetOperator: route.operator || 'UPSRTC',
        vehicleNumber: (route.routeNumber.includes('UP') ? 'UP 32 ' : 'DL 01 ') + route.routeNumber,
        busNumber: route.routeNumber,
        routeNumber: route.routeNumber,
        routeOrigin: route.origin,
        routeDestination: route.destination,
        location: { lat: pt[0], lng: pt[1] },
        heading,
        speedKmh: speed,
        availableSeats: 22,
        totalSeats: 45,
        nextStop: route.destination || 'Terminal Hub',
        crowdDensity: 'AVAILABLE',
        isSimulation: true,
        lastUpdated: new Date().toISOString()
      };

      setActiveVehicles(prev => ({
        ...prev,
        [simDriverId]: simVehicle
      }));
      setActiveSimulationRoute(route.routeNumber);
    };

    updateSimStep(0);

    routeSimIntervalRef.current = setInterval(() => {
      wpIndex = (wpIndex + 1) % waypoints.length;
      updateSimStep(wpIndex);
    }, 2200);
  };

  const handleStopRouteSimulation = () => {
    if (routeSimIntervalRef.current) {
      clearInterval(routeSimIntervalRef.current);
      routeSimIntervalRef.current = null;
    }
    if (activeSimulationRoute) {
      setActiveVehicles(prev => {
        const next = { ...prev };
        delete next[`sim_${activeSimulationRoute}`];
        return next;
      });
      setActiveSimulationRoute(null);
    }
  };

  // Cleanup simulation on route change or unmount
  useEffect(() => {
    return () => {
      if (routeSimIntervalRef.current) {
        clearInterval(routeSimIntervalRef.current);
      }
    };
  }, [selectedRouteFilter]);

  // Filter routes by state, category, and search term
  const filteredRoutes = routes.filter(r => {
    // State filter
    if (selectedStateFilter !== 'ALL') {
      const matchState = (r.city || '').toLowerCase() === selectedStateFilter.toLowerCase() ||
                         (r.state || '').toLowerCase().includes(selectedStateFilter.toLowerCase());
      if (!matchState) return false;
    }

    // Category filter
    if (selectedCategoryFilter !== 'ALL') {
      if (r.category && r.category !== selectedCategoryFilter) return false;
    }

    // Search term (bus number, route name, operator, or state)
    if (busSearchTerm.trim()) {
      const term = busSearchTerm.toLowerCase();
      const matchesNumber = (r.routeNumber || '').toLowerCase().includes(term);
      const matchesName = (r.name || '').toLowerCase().includes(term);
      const matchesDesc = (r.description || '').toLowerCase().includes(term);
      const matchesOperator = (r.operator || '').toLowerCase().includes(term);
      const matchesState = (r.state || '').toLowerCase().includes(term);
      if (!matchesNumber && !matchesName && !matchesDesc && !matchesOperator && !matchesState) return false;
    }

    return true;
  });

  const vehicleList = Object.values(activeVehicles).filter(v => {
    if (!v) return false;
    if (selectedRouteFilter === 'ALL') return true;
    if (selectedRouteFilter === 'AUTO') return v.vehicleType === 'AUTO';
    return v.routeNumber === selectedRouteFilter;
  });

  return (
    <div className={`relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Floating Search Bar */}
      <div className="absolute top-4 left-4 z-20 w-72 sm:w-80 shadow-2xl">
        <LocationAutocomplete
          value={topLocationSearch}
          onChange={(val) => setTopLocationSearch(val)}
          onSelect={handleSelectLocationFromSearch}
          placeholder={`Search Stations, Landmarks, Bus 73, UP-101...`}
          city={currentCity}
          isDark={isDark}
          compact={true}
          onClear={() => {
            setTopLocationSearch('');
            if (searchPinMarkerRef.current && leafletMapRef.current) {
              try {
                leafletMapRef.current.removeLayer(searchPinMarkerRef.current);
              } catch (e) {}
              searchPinMarkerRef.current = null;
            }
          }}
        />
      </div>

      {/* Active Focused Trip Planned Route Floating Banner */}
      {focusedTripPlan && (
        <div className="absolute top-18 left-4 right-4 md:left-4 md:right-auto md:max-w-lg z-30 animate-in slide-in-from-top duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
            isDark 
              ? 'bg-slate-900/95 border-emerald-500/50 text-white' 
              : 'bg-white/95 border-emerald-500 text-slate-900'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center space-x-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>
                    {focusedTripPlan.origin?.isLiveGPS ? '📡 Live GPS Turn-by-Turn Road Route' : 'Planned Road Navigation Route'}
                  </span>
                </div>
                <h4 className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                  <span className={focusedTripPlan.origin?.isLiveGPS ? 'text-sky-400 font-black' : 'text-emerald-500 font-black'}>
                    {focusedTripPlan.origin?.isLiveGPS ? '📍 My Live Location' : `🟢 ${focusedTripPlan.origin?.name}`}
                  </span>
                  <span>➔</span>
                  <span className="text-red-500 font-black">🏁 {focusedTripPlan.destination?.name}</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  {focusedTripPlan.option?.title} • <strong className="text-emerald-500">₹{focusedTripPlan.option?.totalFare}</strong> • ~<strong>{focusedTripPlan.option?.totalDurationMins} mins</strong>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onClearFocusedTrip}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Clear
                </button>
                <button
                  onClick={onSelectRouteForPlanning}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Toggle Step-by-Step Directions */}
            <div className="mt-3 pt-2.5 border-t border-slate-700/50">
              <button
                onClick={() => setShowTripSteps(!showTripSteps)}
                className="w-full flex items-center justify-between text-[11px] font-black text-sky-400 hover:text-sky-300 transition"
              >
                <span className="flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  Step-by-Step Road Directions ({focusedTripPlan.option?.segments?.length || 1} Legs)
                </span>
                {showTripSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTripSteps && (
                <div className="mt-2.5 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {focusedTripPlan.option?.segments?.map((seg, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded-xl text-xs border flex items-start space-x-2.5 ${
                        isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                        seg.mode === 'BUS' 
                          ? 'bg-sky-500 text-white' 
                          : seg.mode === 'AUTO' || seg.mode === 'SHARED_AUTO' 
                          ? 'bg-amber-500 text-slate-950 font-bold' 
                          : 'bg-slate-600 text-white'
                      }`}>
                        {idx + 1}. {seg.mode}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[11px] leading-tight text-slate-200 dark:text-white">
                          {seg.instructions || `${seg.routeName || seg.routeNumber} (${seg.boardStop} ➔ ${seg.alightStop})`}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>~{seg.durationMins} mins</span>
                          {seg.fare ? <span>• ₹{seg.fare}</span> : <span>• Free</span>}
                          {seg.frequency && <span>• {seg.frequency}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Route Live Tracking Floating Banner */}
      {!focusedTripPlan && selectedRouteFilter !== 'ALL' && selectedRouteFilter !== 'AUTO' && (() => {
        const activeRouteObj = routes.find(r => r.routeNumber === selectedRouteFilter);
        const routeVehicles = Object.values(activeVehicles).filter(v => v.routeNumber === selectedRouteFilter);
        const isBroadcasting = routeVehicles.length > 0;
        const isSimulatingThis = activeSimulationRoute === selectedRouteFilter;

        if (!activeRouteObj) return null;

        const rStops = (activeRouteObj.stops || []).map(sId => stops.find(s => s.id === sId)).filter(Boolean);
        const orig = activeRouteObj.origin || rStops[0]?.name || 'Origin Terminal';
        const dest = activeRouteObj.destination || rStops[rStops.length - 1]?.name || 'Destination Terminal';

        return (
          <div className="absolute top-18 left-4 right-4 md:left-4 md:right-auto md:max-w-md z-30 animate-in slide-in-from-top duration-300">
            <div className={`p-4 rounded-3xl shadow-2xl border backdrop-blur-md ${
              isDark 
                ? 'bg-slate-900/95 border-sky-500/40 text-white shadow-sky-950/40' 
                : 'bg-white/95 border-sky-400 text-slate-900 shadow-sky-100'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider mb-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500 text-white shadow-sm">
                      {activeRouteObj.routeNumber}
                    </span>
                    <span className={isBroadcasting ? 'text-emerald-400 flex items-center gap-1 font-bold' : 'text-amber-400 flex items-center gap-1 font-bold'}>
                      <span className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`}></span>
                      {isBroadcasting 
                        ? `${routeVehicles.length} Active ${activeRouteObj.type || 'Bus'} on Route` 
                        : '0 Drivers Broadcasting Currently'}
                    </span>
                  </div>
                  
                  <h4 className="text-xs font-black flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-400">🟢 {orig}</span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-red-400">🏁 {dest}</span>
                  </h4>

                  <p className="text-[11px] text-slate-400 mt-1">
                    {activeRouteObj.operator || 'State Transit'} • {rStops.length || activeRouteObj.stops?.length || 0} Key Stops • Fare: ₹{activeRouteObj.baseFare} • Freq: ~{activeRouteObj.frequencyMinutes || 15}m
                  </p>
                </div>

                <button
                  onClick={() => {
                    handleStopRouteSimulation();
                    setSelectedRouteFilter('ALL');
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  title="Close Route View"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live telemetry & Interactive live testing action */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-col gap-2">
                {isBroadcasting && routeVehicles[0] && (
                  <div className="flex items-center justify-between text-[11px] bg-sky-500/10 border border-sky-500/20 rounded-xl p-2 text-sky-300">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>Speed: <strong>{routeVehicles[0].speedKmh || 0} km/h</strong></span>
                    </div>
                    <span>Seats: <strong>{routeVehicles[0].availableSeats ?? 20}</strong> available</span>
                    <span>Next: <strong>{routeVehicles[0].nextStopName || routeVehicles[0].nextStop || 'En Route'}</strong></span>
                  </div>
                )}

                {!isBroadcasting ? (
                  <button
                    onClick={() => handleStartRouteSimulation(activeRouteObj)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>▶️ Test Live Bus Moving on this Route</span>
                  </button>
                ) : isSimulatingThis ? (
                  <button
                    onClick={handleStopRouteSimulation}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>⏹ Stop Live Simulation</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Map Canvas */}
      <div className="flex-1 w-full h-full relative min-h-[350px]">
        <div 
          ref={mapContainerRef} 
          className={`w-full h-full transition-all duration-300 ${isDark ? 'leaflet-dark-mode' : ''}`} 
          style={{ minHeight: '350px' }} 
        />
      </div>

      {/* Floating Reopen / Expand Tab (Middle-Right Edge) */}
      {!isSidePanelOpen && (
        <button
          onClick={() => toggleSidePanel(true)}
          className={`flex absolute right-0 top-1/2 -translate-y-1/2 z-20 px-2 py-4 rounded-l-2xl shadow-2xl border-l border-t border-b backdrop-blur-md flex-col items-center gap-2 font-bold text-xs transition hover:px-2.5 group animate-in fade-in duration-300 cursor-pointer ${
            isDark 
              ? 'bg-slate-900/95 border-sky-500/50 text-white hover:bg-slate-800 shadow-sky-950/40' 
              : 'bg-white/95 border-sky-400 text-slate-900 hover:bg-slate-100 shadow-sky-100'
          }`}
          title="Open Bus Routes & Fleet Panel (<)"
        >
          <ChevronLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
          <span className="[writing-mode:vertical-lr] tracking-widest text-[10px] font-black uppercase text-sky-400 py-1">
            🚌 Bus Routes ({routes.length})
          </span>
        </button>
      )}

      {/* Side / Bottom Directory & Fleet Drawer */}
      <div className={`relative transition-all duration-300 ease-in-out flex flex-col z-10 ${
        isSidePanelOpen 
          ? 'w-full md:w-84 lg:w-96 border-t md:border-t-0 md:border-l max-h-80 md:max-h-full opacity-100' 
          : 'w-0 md:w-0 max-h-0 md:max-h-full overflow-hidden border-0 p-0 pointer-events-none opacity-0'
      } ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* Floating edge collapse tab on desktop left edge of panel */}
        {isSidePanelOpen && (
          <button
            onClick={() => toggleSidePanel(false)}
            className={`hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-4 h-12 rounded-l-md items-center justify-center border-l border-t border-b shadow-lg transition hover:w-5 group ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
            }`}
            title="Collapse / Hide Bus Section (>)"
          >
            <ChevronRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Tab Switcher: [ Bus Routes Directory ] vs [ Live Fleet ] + [ > Collapse Button ] */}
        <div className={`p-2 border-b flex items-center gap-1.5 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-100/70'}`}>
          <button
            onClick={() => setActiveDrawerTab('ROUTES')}
            className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeDrawerTab === 'ROUTES'
                ? 'bg-sky-600 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Bus className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Routes ({routes.length})</span>
          </button>

          <button
            onClick={() => setActiveDrawerTab('FLEET')}
            className={`flex-1 py-2 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeDrawerTab === 'FLEET'
                ? 'bg-emerald-600 text-white shadow-md'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />
            <span className="truncate">Fleet ({Object.keys(activeVehicles).length})</span>
          </button>

          {/* Collapse Button `>` */}
          <button
            onClick={() => toggleSidePanel(false)}
            className={`p-2 rounded-xl border transition flex items-center justify-center group ${
              isDark 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900 border-slate-300'
            }`}
            title="Hide / Collapse Bus Section (>)"
            aria-label="Collapse side panel"
          >
            <ChevronRight className="w-4 h-4 font-black text-sky-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* TAB 1: ALL-INDIA & LOCAL BUS ROUTES DIRECTORY */}
        {activeDrawerTab === 'ROUTES' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Filter bar: Search + State Selector + Service Type Chips */}
            <div className={`p-3 border-b space-y-2.5 ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'}`}>
              
              {/* Search input */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search bus no. (UP-101, 502, 73) or stop/city..."
                  value={busSearchTerm}
                  onChange={(e) => setBusSearchTerm(e.target.value)}
                  className={`w-full pl-8 pr-7 py-1.5 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                {busSearchTerm && (
                  <button
                    onClick={() => setBusSearchTerm('')}
                    className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* State & Region Horizontal Scrollable Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-[11px]">
                <button
                  onClick={() => {
                    setSelectedStateFilter('ALL');
                    setSelectedRouteFilter('ALL');
                  }}
                  className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition text-[10px] flex items-center gap-1 shadow-sm ${
                    selectedStateFilter === 'ALL'
                      ? 'bg-sky-600 text-white shadow-md'
                      : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  🌐 All India ({cities?.length || 28} States & UTs)
                </button>
                {(cities || []).map(st => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStateFilter(st.id);
                      setSelectedRouteFilter('ALL');
                      setCurrentCity(st.id);
                      if (leafletMapRef.current && st.center) {
                        leafletMapRef.current.flyTo(st.center, st.zoom || 11, { duration: 1.2 });
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition text-[10px] ${
                      selectedStateFilter === st.id
                        ? 'bg-sky-600 text-white shadow-md'
                        : isDark ? 'bg-slate-800/90 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>

              {/* Category Filter Chips (All, City Bus, Janrath/Intercity, Express) */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'ALL', label: 'All Services' },
                    { id: 'CITY_BUS', label: '🚌 City Bus' },
                    { id: 'INTERCITY', label: '🛣️ Janrath / AC' },
                    { id: 'EXPRESS', label: '🚀 Express' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition ${
                        selectedCategoryFilter === cat.id
                          ? isDark ? 'bg-slate-700 text-white font-bold' : 'bg-slate-300 text-slate-900 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedRouteFilter('ALL');
                    setSelectedStateFilter('ALL');
                    setSelectedCategoryFilter('ALL');
                    setBusSearchTerm('');
                    setSelectedVehicle(null);
                  }}
                  className={`font-bold px-1.5 py-0.5 rounded text-[9px] border transition flex-shrink-0 ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                  title="Reset all filters"
                >
                  Reset
                </button>
              </div>

              {/* Showing count indicator */}
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Found <strong>{filteredRoutes.length}</strong> bus routes {selectedStateFilter !== 'ALL' ? `in ${selectedStateFilter.replace('_', ' ').toUpperCase()}` : 'across India'}
                </span>
                {selectedRouteFilter !== 'ALL' && (
                  <span className="text-sky-400 font-bold flex items-center gap-1">
                    <span>Line {selectedRouteFilter} active</span>
                    <button 
                      onClick={() => setSelectedRouteFilter('ALL')}
                      className="hover:text-red-400 ml-1"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Bus Routes List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredRoutes.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <p>No bus routes found for this filter or search.</p>
                  <button 
                    onClick={() => {
                      setSelectedStateFilter('ALL');
                      setSelectedCategoryFilter('ALL');
                      setBusSearchTerm('');
                    }}
                    className="mt-2 text-sky-400 font-bold underline cursor-pointer"
                  >
                    Show All Pan-India Routes
                  </button>
                </div>
              ) : (
                filteredRoutes.map(r => {
                  const isSelected = selectedRouteFilter === r.routeNumber;
                  const routeColor = r.color || '#0284c7';

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleSelectBusRoute(r)}
                      className={`p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? isDark 
                            ? 'bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-950/50' 
                            : 'bg-sky-50 border-sky-400 shadow-md'
                          : isDark
                          ? 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60'
                          : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                      }`}
                    >
                      {/* Top row: Badge + Operator + Name */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            style={{ backgroundColor: routeColor }} 
                            className="text-white font-black text-xs px-2.5 py-0.5 rounded-xl shadow-sm flex items-center gap-1"
                          >
                            <Bus className="w-3.5 h-3.5" />
                            {r.routeNumber}
                          </span>

                          {r.operator && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                              r.operator.includes('UPSRTC') || r.operator.includes('Janrath')
                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                                : r.operator.includes('EV') || r.operator.includes('Electric')
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {r.operator}
                            </span>
                          )}

                          {r.state && (
                            <span className="text-[9px] font-semibold text-slate-400">
                              • {r.state}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-sky-500 text-white rounded-md uppercase tracking-wider flex-shrink-0 animate-pulse">
                            Active on Map
                          </span>
                        )}
                      </div>

                      {/* Route Title */}
                      <div className="text-xs font-bold leading-tight mb-1">
                        {r.name.replace(/^Route \d+:\s*/, '')}
                      </div>

                      {/* Origin to Destination Route Route Path */}
                      {(() => {
                        const rStops = (r.stops || []).map(sId => stops.find(s => s.id === sId)).filter(Boolean);
                        const orig = r.origin || rStops[0]?.name || 'Origin';
                        const dest = r.destination || rStops[rStops.length - 1]?.name || 'Destination';
                        return (
                          <>
                            <div className={`p-2 rounded-xl mb-2 flex items-center justify-between text-xs font-black ${
                              isDark ? 'bg-slate-950/70 border border-slate-700/60' : 'bg-slate-100 border border-slate-200'
                            }`}>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-emerald-400 truncate">🟢 {orig}</span>
                                <span className="text-slate-400 font-normal">➔</span>
                                <span className="text-red-400 truncate">🏁 {dest}</span>
                              </div>
                            </div>

                            {/* Stop-by-stop Sequence */}
                            {rStops.length > 0 && (
                              <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
                                {rStops.map((st, sIdx) => (
                                  <span 
                                    key={st.id || sIdx}
                                    className={`text-[9px] px-1.5 py-0.5 rounded-md whitespace-nowrap font-medium ${
                                      sIdx === 0 
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold' 
                                        : sIdx === rStops.length - 1 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 font-bold'
                                        : isDark ? 'bg-slate-800 text-slate-300 border border-slate-700/50' : 'bg-slate-200 text-slate-700'
                                    }`}
                                    title={st.name}
                                  >
                                    {sIdx + 1}. {st.name.replace(/ Railway.*/, '').replace(/ Bus Station.*/, '').replace(/ Bus Terminal.*/, '').replace(/ Terminal.*/, '').replace(/ Inter-State Bus Stand \(ISBT\).*/, ' ISBT')}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Timings row */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                              <span>⏰ First: <strong className="text-slate-200">{r.firstBus || '05:30 AM'}</strong></span>
                              <span>Last: <strong className="text-slate-200">{r.lastBus || '11:00 PM'}</strong></span>
                            </div>
                          </>
                        );
                      })()}

                      {/* Description / Corridor */}
                      <p className={`text-[11px] leading-relaxed line-clamp-2 mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {r.description}
                      </p>

                      {/* Details row: Stops, Frequency, Fare */}
                      <div className={`grid grid-cols-3 gap-1.5 py-1.5 px-2 rounded-xl text-[10px] mb-2.5 ${
                        isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <div className="text-center">
                          <span className="text-slate-400 block text-[9px]">Stops</span>
                          <strong>{r.stops?.length || 4} stops</strong>
                        </div>
                        <div className="text-center border-x border-slate-700/30">
                          <span className="text-slate-400 block text-[9px]">Freq</span>
                          <strong>Every {r.frequencyMinutes}m</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-slate-400 block text-[9px]">Base Fare</span>
                          <strong className="text-emerald-500 font-bold">₹{r.baseFare}</strong>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBusRoute(r);
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow'
                              : isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isSelected ? 'Viewing Line' : 'View Line on Map'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectRouteForPlanning) {
                              onSelectRouteForPlanning(r.routeNumber);
                            }
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Plan Trip</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE GPS DRIVER FLEET */}
        {activeDrawerTab === 'FLEET' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Selected Vehicle Card Details */}
            {selectedVehicle && (
              <div className={`p-4 border-b animate-in slide-in-from-top ${
                isDark ? 'bg-slate-800/80 border-sky-500/40 text-white' : 'bg-sky-50 border-sky-300 text-slate-900'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md mb-1 ${
                      selectedVehicle.vehicleType === 'BUS'
                        ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {selectedVehicle.vehicleType === 'BUS' ? `BUS ROUTE ${selectedVehicle.routeNumber}` : `AUTO RICKSHAW`}
                    </span>
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                      {selectedVehicle.driverName}
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    </h4>
                    <p className="text-[11px] text-slate-400">{selectedVehicle.vehicleModel} • {selectedVehicle.vehicleNumber}</p>
                  </div>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="text-xs text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 my-3 text-center">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white border border-slate-200'}`}>
                    <div className="text-[10px] text-slate-400">Live Speed</div>
                    <div className="text-xs font-bold text-sky-500">{selectedVehicle.speedKmh || 0} km/h</div>
                  </div>
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white border border-slate-200'}`}>
                    <div className="text-[10px] text-slate-400">Seats Left</div>
                    <div className="text-xs font-bold text-emerald-500">
                      {selectedVehicle.availableSeats} / {selectedVehicle.totalSeats}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900' : 'bg-white border border-slate-200'}`}>
                    <div className="text-[10px] text-slate-400">Next Stop</div>
                    <div className="text-[11px] font-semibold truncate">
                      {selectedVehicle.nextStopName || 'En Route'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${selectedVehicle.driverPhone || '+919811122334'}`}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition ${
                      isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    Call Driver
                  </a>
                  <button
                    onClick={() => {
                      if (onSelectRouteForPlanning) {
                        onSelectRouteForPlanning(selectedVehicle.routeNumber);
                      }
                    }}
                    className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Navigation className="w-3 h-3" />
                    Plan on Route
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Vehicle List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {vehicleList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active vehicles found in {activeCityConfig.name} for this filter.
                </div>
              ) : (
                vehicleList.map(v => {
                  const isBus = v.vehicleType === 'BUS';
                  const isSelected = selectedVehicle?.driverId === v.driverId;
                  
                  return (
                    <div
                      key={v.driverId}
                      onClick={() => handleFlyToVehicle(v)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500 shadow-md'
                          : isDark
                          ? 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl text-white font-black text-xs ${
                          isBus ? 'bg-sky-600' : 'bg-amber-500 text-slate-950 font-bold'
                        }`}>
                          {isBus ? v.routeNumber : '🛺'}
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            {v.driverName}
                            <span className="text-[10px] font-normal text-slate-400">({v.vehicleNumber})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Speed: <strong>{v.speedKmh} km/h</strong></span>
                            <span>•</span>
                            <span className="text-emerald-500 font-semibold">
                              {v.availableSeats} seats left
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFlyToVehicle(v);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 transition"
                        title="Focus on map"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

