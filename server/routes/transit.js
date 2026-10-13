const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get Supported Indian Cities
router.get('/cities', (req, res) => {
  res.json({ cities: db.getCities() });
});

// Get Transit Routes (with optional city filter)
router.get('/routes', (req, res) => {
  const city = req.query.city || 'delhi';
  const routes = db.getRoutes(city);
  const stops = db.getStops();
  const activeVehicles = db.getActiveVehicles(city);

  const enrichedRoutes = routes.map(route => {
    const routeStops = (route.stops || [])
      .map(stopId => stops.find(s => s.id === stopId))
      .filter(Boolean);

    const activeOnRoute = activeVehicles.filter(v => v.routeNumber === route.routeNumber);

    return {
      ...route,
      stopsData: routeStops,
      activeVehicleCount: activeOnRoute.length,
      activeVehicles: activeOnRoute
    };
  });

  res.json({ routes: enrichedRoutes });
});

// Get Single Route
router.get('/routes/:id', (req, res) => {
  const route = db.getRouteById(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  const stops = db.getStops();
  const routeStops = (route.stops || [])
    .map(stopId => stops.find(s => s.id === stopId))
    .filter(Boolean);

  const activeOnRoute = db.getActiveVehicles().filter(v => v.routeNumber === route.routeNumber);

  res.json({
    route: {
      ...route,
      stopsData: routeStops,
      activeVehicles: activeOnRoute
    }
  });
});

// Get All Stops (with optional city filter)
router.get('/stops', (req, res) => {
  const city = req.query.city || 'delhi';
  res.json({ stops: db.getStops(city) });
});

// Get Live Active Vehicles
router.get('/active-vehicles', (req, res) => {
  const city = req.query.city || 'delhi';
  const vehicles = db.getActiveVehicles(city);
  const stops = db.getStops();

  const enriched = vehicles.map(v => {
    const nextStopObj = stops.find(s => s.id === v.nextStop);
    return {
      ...v,
      nextStopName: nextStopObj ? nextStopObj.name : v.nextStop || 'En Route'
    };
  });

  res.json({ vehicles: enriched });
});

const https = require('https');

// Places and Road Geometry Caches for instant fast response
const roadGeometryCache = new Map();
const placesCache = new Map();

// Helper: Geocode search query across OpenStreetMap Nominatim and local stops
async function queryNominatim(queryStr) {
  return new Promise(resolve => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&countrycodes=in&limit=6`;
      const req = https.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyRoute-Transit/1.0' }, 
        timeout: 3500 
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              resolve(parsed.map(p => ({
                id: `osm_${p.place_id}`,
                name: p.name || p.display_name.split(',')[0],
                displayName: p.display_name,
                lat: parseFloat(p.lat),
                lng: parseFloat(p.lon),
                type: 'CUSTOM_LOCATION'
              })));
              return;
            }
          } catch(e) {}
          resolve([]);
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    } catch (e) {
      resolve([]);
    }
  });
}

// Comprehensive Curated Indian Landmarks & Transit Hubs by City
const CITY_LANDMARKS = {
  delhi: [
    {
      id: 'delhi_cp',
      name: 'Connaught Place (Rajiv Chowk)',
      displayName: 'Connaught Place, Inner Circle & Rajiv Chowk Metro Hub, Central Delhi',
      category: 'LANDMARK',
      categoryLabel: 'Heritage & Metro Hub',
      icon: 'landmark',
      lat: 28.6315,
      lng: 77.2167,
      zone: 'Central Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['cp', 'connaught place', 'rajiv chowk', 'inner circle', 'outer circle', 'janpath', 'palika bazaar', 'barakhamba']
    },
    {
      id: 'delhi_kg',
      name: 'Kashmere Gate ISBT & Metro Interchange',
      displayName: 'Kashmere Gate ISBT, Triple Metro Interchange, North Delhi',
      category: 'TRANSIT',
      categoryLabel: 'ISBT & Metro Junction',
      icon: 'bus',
      lat: 28.6675,
      lng: 77.2285,
      zone: 'North Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['kashmere gate', 'kg', 'isbt north', 'morigate', 'tis hazari', 'st stephens hospital', 'inter state bus terminal']
    },
    {
      id: 'delhi_anand_vihar',
      name: 'Anand Vihar ISBT & Railway Terminal',
      displayName: 'Anand Vihar ISBT, Bus Terminal & Mega Railway Station, East Delhi',
      category: 'TRANSIT',
      categoryLabel: 'ISBT & Railway Station',
      icon: 'train',
      lat: 28.6469,
      lng: 77.3160,
      zone: 'East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['anand vihar', 'anand vihar isbt', 'anand vihar railway station', 'kaushambi border', 'east delhi terminal']
    },
    {
      id: 'delhi_ndls',
      name: 'New Delhi Railway Station (Ajmeri Gate & Paharganj)',
      displayName: 'New Delhi Railway Station, Airport Express Line, Central Delhi',
      category: 'AIRPORT_TRAIN',
      categoryLabel: 'Major Railway Junction',
      icon: 'train',
      lat: 28.6429,
      lng: 77.2227,
      zone: 'Central Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['ndls', 'new delhi station', 'ajmeri gate', 'paharganj', 'new delhi railway station', 'bhavbhuti marg']
    },
    {
      id: 'delhi_nizamuddin',
      name: 'Sarai Kale Khan ISBT & Hazrat Nizamuddin Station',
      displayName: 'Hazrat Nizamuddin Railway Station & Sarai Kale Khan RRTS Hub, South Delhi',
      category: 'AIRPORT_TRAIN',
      categoryLabel: 'Railway & RRTS Hub',
      icon: 'train',
      lat: 28.5889,
      lng: 77.2533,
      zone: 'South-East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['sarai kale khan', 'nizamuddin', 'hazrat nizamuddin', 'nzm', 'rrts terminal', 'ring road isbt', 'delhi meerapur']
    },
    {
      id: 'delhi_igi_airport',
      name: 'Indira Gandhi International Airport (IGI T3 & T1)',
      displayName: 'IGI Airport Terminal 3, T1, T2 & Aerocity Hospitality District, South-West Delhi',
      category: 'AIRPORT_TRAIN',
      categoryLabel: 'International Airport',
      icon: 'plane',
      lat: 28.5562,
      lng: 77.1000,
      zone: 'South-West Delhi',
      type: 'CUSTOM_LOCATION',
      aliases: ['igi', 'igi airport', 'delhi airport', 'terminal 3', 't3', 'terminal 1', 't1', 't2', 'aerocity', 'palam airport']
    },
    {
      id: 'delhi_aiims',
      name: 'AIIMS & Safdarjung Hospital',
      displayName: 'All India Institute of Medical Sciences & Safdarjung Hospital, South Delhi',
      category: 'HOSPITAL',
      categoryLabel: 'Premier Medical Hospital',
      icon: 'hospital',
      lat: 28.5672,
      lng: 77.2100,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['aiims', 'safdarjung hospital', 'ansari nagar', 'aiims trauma centre', 'medical institute', 'ring road aiims']
    },
    {
      id: 'delhi_india_gate',
      name: 'India Gate & Kartavya Path',
      displayName: 'India Gate, National War Memorial & Kartavya Path, Central Delhi',
      category: 'LANDMARK',
      categoryLabel: 'National Monument',
      icon: 'landmark',
      lat: 28.6129,
      lng: 77.2295,
      zone: 'Central Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['india gate', 'kartavya path', 'rajpath', 'national war memorial', 'national stadium', 'c-hexagon']
    },
    {
      id: 'delhi_chandni',
      name: 'Red Fort & Chandni Chowk Heritage',
      displayName: 'Lal Qila (Red Fort), Chandni Chowk Old Delhi Heritage Market',
      category: 'LANDMARK',
      categoryLabel: 'UNESCO World Heritage',
      icon: 'landmark',
      lat: 28.6506,
      lng: 77.2303,
      zone: 'Central / Old Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['red fort', 'lal qila', 'chandni chowk', 'jama masjid', 'old delhi', 'delhi 6', 'khari baoli', 'dariba kalan']
    },
    {
      id: 'delhi_qutub_minar',
      name: 'Qutub Minar & Mehrauli Heritage',
      displayName: 'Qutub Minar Complex & Mehrauli Bus Terminal, South Delhi',
      category: 'LANDMARK',
      categoryLabel: 'UNESCO World Heritage',
      icon: 'landmark',
      lat: 28.5244,
      lng: 77.1855,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['qutub minar', 'qutab minar', 'mehrauli', 'saket mehrauli', 'iron pillar', 'lalkot', 'ahimsa sthal']
    },
    {
      id: 'delhi_akshardham',
      name: 'Akshardham Temple & NH-24 Link',
      displayName: 'Swaminarayan Akshardham Temple Complex, Mayur Vihar, East Delhi',
      category: 'LANDMARK',
      categoryLabel: 'Spiritual Monument',
      icon: 'landmark',
      lat: 28.6127,
      lng: 77.2773,
      zone: 'East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['akshardham', 'akshardham temple', 'swaminarayan mandir', 'nh24', 'mayur vihar phase 1', 'commonwealth games village']
    },
    {
      id: 'delhi_lotus_temple',
      name: 'Lotus Temple & Kalkaji Mandir',
      displayName: 'Bahá\'í Lotus Temple, Kalkaji Mandir & Nehru Place, South Delhi',
      category: 'LANDMARK',
      categoryLabel: 'Famous Monument',
      icon: 'landmark',
      lat: 28.5535,
      lng: 77.2588,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['lotus temple', 'bahai temple', 'kalkaji', 'kalkaji mandir', 'kalkaji metro', 'nehru place kalkaji']
    },
    {
      id: 'delhi_sarojini',
      name: 'Sarojini Nagar Market & INA',
      displayName: 'Sarojini Nagar Fashion Market, INA Market & Dilli Haat, South Delhi',
      category: 'MARKET',
      categoryLabel: 'Shopping Market',
      icon: 'shopping',
      lat: 28.5772,
      lng: 77.1983,
      zone: 'South Delhi',
      type: 'CUSTOM_LOCATION',
      aliases: ['sarojini nagar', 'sarojini market', 'dilli haat', 'ina market', 'sarojini', 'safdarjung enclave']
    },
    {
      id: 'delhi_lajpat',
      name: 'Lajpat Nagar Central Market',
      displayName: 'Lajpat Nagar Central Market, Ring Road & Metro, South Delhi',
      category: 'MARKET',
      categoryLabel: 'Shopping Hub',
      icon: 'shopping',
      lat: 28.5677,
      lng: 77.2433,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['lajpat nagar', 'central market', 'lajpat', 'moolchand', 'defence colony', '3c mall', 'ring road lajpat']
    },
    {
      id: 'delhi_karol_bagh',
      name: 'Karol Bagh & Gaffar Market',
      displayName: 'Karol Bagh Ajmal Khan Road, Gaffar Electronic Market & Metro, West Delhi',
      category: 'MARKET',
      categoryLabel: 'Shopping Hub',
      icon: 'shopping',
      lat: 28.6517,
      lng: 77.1906,
      zone: 'West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['karol bagh', 'gaffar market', 'ajmal khan road', 'pusa road', 'rajendra place', 'karol bagh metro']
    },
    {
      id: 'delhi_nehru_place',
      name: 'Nehru Place Bus Terminal & IT Hub',
      displayName: 'Nehru Place Asian IT Hardware Hub & Multi-level Bus Terminal, South Delhi',
      category: 'TECH_HUB',
      categoryLabel: 'IT & Business Hub',
      icon: 'building',
      lat: 28.5494,
      lng: 77.2530,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['nehru place', 'epicuria', 'it market', 'paras cinema', 'nehru place terminal', 'kalkaji link']
    },
    {
      id: 'delhi_cyber_hub',
      name: 'DLF Cyber City & Cyber Hub (Gurugram)',
      displayName: 'DLF Cyber Hub, Cyber City Corporate Towers & Rapid Metro, Gurugram NCR',
      category: 'TECH_HUB',
      categoryLabel: 'Corporate IT Hub',
      icon: 'building',
      lat: 28.4950,
      lng: 77.0890,
      zone: 'Gurugram / NCR',
      type: 'TRANSIT_STATION',
      aliases: ['cyber hub', 'cyber city', 'dlf cyber city', 'dlf phase 2', 'dlf phase 3', 'gurgaon cyber hub', 'rapid metro']
    },
    {
      id: 'delhi_huda_city',
      name: 'Millennium City Centre (HUDA City Centre Gurugram)',
      displayName: 'Millennium City Centre (HUDA City Centre Metro Terminal & Sector 29), Gurugram',
      category: 'TRANSIT',
      categoryLabel: 'Metro Terminal & Commercial',
      icon: 'train',
      lat: 28.4595,
      lng: 77.0726,
      zone: 'Gurugram / NCR',
      type: 'CUSTOM_LOCATION',
      aliases: ['huda city centre', 'millennium city centre', 'gurgaon metro terminal', 'sector 29 gurgaon', 'iffco chowk link', 'fortis gurgaon']
    },
    {
      id: 'delhi_noida_sec18',
      name: 'Noida Sector 18 (Atta Market & Mall of India)',
      displayName: 'Noida Sector 18 Commercial Hub, DLF Mall of India & Atta Market, Noida',
      category: 'MARKET',
      categoryLabel: 'Shopping & Metro Hub',
      icon: 'shopping',
      lat: 28.5708,
      lng: 77.3261,
      zone: 'Noida / NCR',
      type: 'CUSTOM_LOCATION',
      aliases: ['noida sector 18', 'sector 18 noida', 'atta market', 'mall of india', 'dlf mall of india', 'great india place', 'gip mall', 'wave cinema noida']
    },
    {
      id: 'delhi_noida_sec62',
      name: 'Noida Sector 62 (Electronic City & Tech Zone)',
      displayName: 'Noida Sector 62 Electronic City, Fortis Hospital & IT Park, Noida',
      category: 'TECH_HUB',
      categoryLabel: 'IT Hub & Blue Line Metro',
      icon: 'building',
      lat: 28.6280,
      lng: 77.3649,
      zone: 'Noida / NCR',
      type: 'TRANSIT_STATION',
      aliases: ['noida sector 62', 'sector 62', 'noida electronic city', 'fortis noida', 'stellar it park', 'symbolic park noida']
    },
    {
      id: 'delhi_botanical_garden',
      name: 'Botanical Garden Interchange (Noida)',
      displayName: 'Botanical Garden Metro Interchange (Blue & Magenta Lines) & Bus Terminal, Noida',
      category: 'TRANSIT',
      categoryLabel: 'Metro Mega Interchange',
      icon: 'train',
      lat: 28.5644,
      lng: 77.3344,
      zone: 'Noida / NCR',
      type: 'TRANSIT_STATION',
      aliases: ['botanical garden', 'botanical garden noida', 'noida interchange', 'magenta line terminal', 'sector 37 noida']
    },
    {
      id: 'delhi_indirapuram',
      name: 'Indirapuram (Shipra Mall & Habitat Centre)',
      displayName: 'Indirapuram Residential Hub, Shipra Mall & Swarna Jayanti Park, Ghaziabad',
      category: 'LANDMARK',
      categoryLabel: 'Residential & Commercial Hub',
      icon: 'landmark',
      lat: 28.6410,
      lng: 77.3710,
      zone: 'Ghaziabad / NCR',
      type: 'TRANSIT_STATION',
      aliases: ['indirapuram', 'shipra mall', 'habitat centre indirapuram', 'vaibhav khand', 'ahinsa khand', 'indirapuram ghaziabad', 'swarna jayanti park']
    },
    {
      id: 'delhi_vaishali',
      name: 'Vaishali Metro Station (Ghaziabad)',
      displayName: 'Vaishali Metro Terminal (Blue Line) & Bus Hub, Ghaziabad',
      category: 'TRANSIT',
      categoryLabel: 'Metro Terminal Hub',
      icon: 'train',
      lat: 28.6499,
      lng: 77.3398,
      zone: 'Ghaziabad / NCR',
      type: 'CUSTOM_LOCATION',
      aliases: ['vaishali', 'vaishali metro', 'sector 4 vaishali', 'max vaishali', 'dabur chowk', 'kaushambi link']
    },
    {
      id: 'delhi_iit_delhi',
      name: 'IIT Delhi & Hauz Khas Village',
      displayName: 'Indian Institute of Technology (IIT Delhi) & Hauz Khas Metro, South Delhi',
      category: 'COLLEGE',
      categoryLabel: 'Premier Institute & Metro',
      icon: 'building',
      lat: 28.5435,
      lng: 77.2065,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['iit', 'iit delhi', 'hauz khas', 'hauz khas village', 'sda market', 'iit gate', 'aurobindo marg']
    },
    {
      id: 'delhi_du_north',
      name: 'Delhi University North Campus (Vishwa Vidyalaya)',
      displayName: 'Delhi University North Campus, Vishwa Vidyalaya Metro & Kamla Nagar, North Delhi',
      category: 'COLLEGE',
      categoryLabel: 'University Campus & Metro',
      icon: 'building',
      lat: 28.6890,
      lng: 77.2100,
      zone: 'North Delhi',
      type: 'CUSTOM_LOCATION',
      aliases: ['delhi university', 'du north campus', 'vishwa vidyalaya', 'kamla nagar', 'st stephens', 'hindu college', 'srcc', 'hudson lane', 'gtb nagar']
    },
    {
      id: 'delhi_rohini',
      name: 'Rohini Sector 18 / Rithala Terminal',
      displayName: 'Rohini West, Sector 18 & Rithala Red Line Metro Terminal, North-West Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Red Line Metro Terminal',
      icon: 'train',
      lat: 28.7208,
      lng: 77.1072,
      zone: 'North-West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['rohini', 'rohini sector 18', 'rithala', 'adventure island', 'rohini west', 'rohini east', 'metro walk mall']
    },
    {
      id: 'delhi_dwarka_sec21',
      name: 'Dwarka Sector 21 Intermodal Hub',
      displayName: 'Dwarka Sector 21 Blue Line & Airport Express Interchange Terminal, South-West Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Airport Express Interchange',
      icon: 'train',
      lat: 28.5522,
      lng: 77.0583,
      zone: 'South-West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['dwarka sector 21', 'dwarka', 'dwarka mor', 'vegas mall dwarka', 'dwarka sector 10', 'dwarka subcity']
    },
    {
      id: 'delhi_janakpuri',
      name: 'Janakpuri District Centre & West Metro',
      displayName: 'Janakpuri District Centre (Piccadilly Mall) & Janakpuri West Interchange, West Delhi',
      category: 'MARKET',
      categoryLabel: 'District Centre & Metro',
      icon: 'shopping',
      lat: 28.6290,
      lng: 77.0780,
      zone: 'West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['janakpuri', 'janakpuri west', 'janakpuri district centre', 'district centre', 'piccadilly', 'uttam nagar link']
    },
    {
      id: 'delhi_tilak_nagar',
      name: 'Tilak Nagar Bus & Metro Terminal',
      displayName: 'Tilak Nagar Bus Terminal, Subhash Nagar & Metro, West Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Bus & Metro Terminal',
      icon: 'bus',
      lat: 28.6366,
      lng: 77.0963,
      zone: 'West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['tilak nagar', 'tilak nagar terminal', 'subhash nagar', 'pacific mall subhash nagar', 'jail road market']
    },
    {
      id: 'delhi_badarpur',
      name: 'Badarpur Border Terminal',
      displayName: 'Badarpur Border Bus Terminal & Violet Line Metro Station, South-East Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Inter-state Border Terminal',
      icon: 'bus',
      lat: 28.4912,
      lng: 77.3015,
      zone: 'South-East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['badarpur', 'badarpur border', 'tughlakabad', 'faridabad border', 'badarpur toll', 'mohan estate']
    },
    {
      id: 'delhi_dhaula_kuan',
      name: 'Dhaula Kuan Intermodal Transit Hub',
      displayName: 'Dhaula Kuan Airport Express, Ring Road Flyover & South Campus Bypass',
      category: 'TRANSIT',
      categoryLabel: 'Arterial Transit Hub',
      icon: 'bus',
      lat: 28.5910,
      lng: 77.1610,
      zone: 'South-West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['dhaula kuan', 'dhaula kuan metro', 'ring road dhaula kuan', 'south campus bypass', 'moti bagh link']
    },
    {
      id: 'delhi_saket',
      name: 'Saket District Centre & Select Citywalk Mall',
      displayName: 'Saket District Centre, Select CITYWALK Mall, Max Hospital & Metro, South Delhi',
      category: 'MARKET',
      categoryLabel: 'Shopping Mall & Medical',
      icon: 'shopping',
      lat: 28.5283,
      lng: 77.2195,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['saket', 'select citywalk', 'saket district centre', 'dlf avenue saket', 'max hospital saket', 'saket metro']
    },
    {
      id: 'delhi_laxmi_nagar',
      name: 'Laxmi Nagar Vikas Marg',
      displayName: 'Laxmi Nagar Commercial Market, Nirman Vihar & Metro, East Delhi',
      category: 'MARKET',
      categoryLabel: 'Commercial & Metro Hub',
      icon: 'shopping',
      lat: 28.6309,
      lng: 77.2776,
      zone: 'East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['laxmi nagar', 'vikas marg', 'nirman vihar', 'shakarpur', 'preet vihar', 'v3s mall']
    },
    {
      id: 'delhi_shahdara',
      name: 'Shahdara Terminal & GT Road',
      displayName: 'Shahdara Bus Terminal, Red Line Metro Station & Old GT Road, East Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Bus & Metro Terminal',
      icon: 'bus',
      lat: 28.6738,
      lng: 77.2912,
      zone: 'East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['shahdara', 'shahdara terminal', 'mansarovar park', 'old gt road shahdara', 'seelampur link']
    },
    {
      id: 'delhi_rk_puram',
      name: 'RK Puram Sector 1 & Bhikaji Cama Place',
      displayName: 'RK Puram Sector 1 Bus Depot, Ring Road & Bhikaji Cama Place, South Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Bus Depot & Commercial',
      icon: 'bus',
      lat: 28.5665,
      lng: 77.1772,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['rk puram', 'r k puram', 'bhikaji cama place', 'hyatt regency ring road', 'rk puram sec 1']
    },
    {
      id: 'delhi_munirka',
      name: 'Munirka & Vasant Vihar',
      displayName: 'Munirka Metro Station, JNU Main Gate & Vasant Vihar, South Delhi',
      category: 'TRANSIT',
      categoryLabel: 'Transit & University',
      icon: 'bus',
      lat: 28.5575,
      lng: 77.1735,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['munirka', 'jnu', 'jnu gate', 'vasant vihar', 'munirka market', 'outer ring road munirka']
    },
    {
      id: 'delhi_vasant_kunj',
      name: 'Vasant Kunj (DLF Promenade & Ambience Mall)',
      displayName: 'Vasant Kunj Institutional Area, DLF Promenade, Ambience Mall & Fortis Hospital',
      category: 'MARKET',
      categoryLabel: 'Mega Mall & Healthcare',
      icon: 'shopping',
      lat: 28.5395,
      lng: 77.1510,
      zone: 'South-West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['vasant kunj', 'ambience mall vasant kunj', 'dlf promenade', 'dlf emporio', 'fortis vasant kunj', 'masoodpur']
    },
    {
      id: 'delhi_khan_mkt',
      name: 'Khan Market & Lodhi Estate',
      displayName: 'Khan Market Boutique High-Street, Lodhi Gardens & Metro, South Delhi',
      category: 'MARKET',
      categoryLabel: 'Premium Shopping & Dining',
      icon: 'shopping',
      lat: 28.6003,
      lng: 77.2270,
      zone: 'South Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['khan market', 'lodhi garden', 'lodhi colony', 'prithviraj road', 'humayun tomb link']
    },
    {
      id: 'delhi_ito',
      name: 'ITO & Pragati Maidan (Bharat Mandapam)',
      displayName: 'ITO Institutional Corridor, Supreme Court & Bharat Mandapam (Pragati Maidan)',
      category: 'LANDMARK',
      categoryLabel: 'Govt & Exhibition Hub',
      icon: 'landmark',
      lat: 28.6292,
      lng: 77.2420,
      zone: 'Central Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['ito', 'pragati maidan', 'bharat mandapam', 'supreme court', 'tilak bridge', 'bahadur shah zafar marg']
    },
    {
      id: 'delhi_mandi',
      name: 'Mandi House Cultural Hub',
      displayName: 'Mandi House Cultural Center, NSD, Kamani Auditorium & Blue/Violet Line Interchange',
      category: 'LANDMARK',
      categoryLabel: 'Interchange & Theatre Hub',
      icon: 'landmark',
      lat: 28.6258,
      lng: 77.2343,
      zone: 'Central Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['mandi house', 'kamani auditorium', 'national school of drama', 'copernicus marg', 'rabindra bhawan']
    },
    {
      id: 'delhi_okhla',
      name: 'Okhla Industrial Phase III & Jamia',
      displayName: 'Okhla Industrial Area Phase 3, Govindpuri Metro & Jamia Millia Islamia',
      category: 'TECH_HUB',
      categoryLabel: 'Industrial & Academic Hub',
      icon: 'building',
      lat: 28.5355,
      lng: 77.2715,
      zone: 'South-East Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['okhla', 'okhla phase 3', 'govindpuri', 'jamia', 'jamia millia', 'holy family hospital', 'kalka mandir link']
    },
    {
      id: 'delhi_kapashera',
      name: 'Kapashera Border / Airport Highway',
      displayName: 'Kapashera Border, Old Delhi-Gurugram Road & Aerocity Junction',
      category: 'TRANSIT',
      categoryLabel: 'Border Transit Hub',
      icon: 'bus',
      lat: 28.5255,
      lng: 77.0850,
      zone: 'South-West Delhi',
      type: 'TRANSIT_STATION',
      aliases: ['kapashera', 'kapashera border', 'bijwasan', 'old delhi gurgaon road', 'dwarka link road']
    }
  ],
  uttar_pradesh: [
    {
      id: 'up_lko_charbagh',
      name: 'Lucknow Charbagh Railway & Bus Station',
      displayName: 'Lucknow Charbagh Railway Terminus & Alambagh Road, Central Lucknow',
      category: 'TRANSIT',
      categoryLabel: 'Major Rail & Bus Hub',
      icon: 'bus',
      lat: 26.8322,
      lng: 80.9202,
      zone: 'Central Lucknow',
      type: 'TRANSIT_STATION',
      aliases: ['charbagh', 'lucknow junction', 'lucknow charbagh', 'lko', 'charbagh bus station']
    },
    {
      id: 'up_lko_hazratganj',
      name: 'Hazratganj Central Square',
      displayName: 'Hazratganj Shopping High-Street & Metro Station, Central Lucknow',
      category: 'MARKET',
      categoryLabel: 'Shopping & Heritage',
      icon: 'shopping',
      lat: 26.8530,
      lng: 80.9460,
      zone: 'Central Lucknow',
      type: 'TRANSIT_STATION',
      aliases: ['hazratganj', 'ganj', 'sahara ganj', 'vidhan sabha', 'lko central']
    },
    {
      id: 'up_lko_gomti_nagar',
      name: 'Gomti Nagar / Patrakar Puram',
      displayName: 'Gomti Nagar, Patrakar Puram Commercial Hub & Shaheed Path, East Lucknow',
      category: 'TECH_HUB',
      categoryLabel: 'IT & Commercial Hub',
      icon: 'building',
      lat: 26.8570,
      lng: 80.9980,
      zone: 'East Lucknow',
      type: 'TRANSIT_STATION',
      aliases: ['gomti nagar', 'patrakar puram', 'vibhooti khand', 'singapore mall', 'riverside mall']
    },
    {
      id: 'up_vns_cantt',
      name: 'Varanasi Cantt (Varanasi Junction)',
      displayName: 'Varanasi Cantt Railway Station & UPSRTC Bus Depot, Varanasi',
      category: 'TRANSIT',
      categoryLabel: 'Inter-state Transit Hub',
      icon: 'bus',
      lat: 25.3284,
      lng: 82.9868,
      zone: 'Central Varanasi',
      type: 'TRANSIT_STATION',
      aliases: ['varanasi cantt', 'kashi station', 'banaras junction', 'bsb', 'varanasi bus stand']
    },
    {
      id: 'up_vns_godowlia',
      name: 'Godowlia & Kashi Vishwanath Dham',
      displayName: 'Kashi Vishwanath Corridor, Dashashwamedh Ghat & Godowlia Chowk, Varanasi',
      category: 'LANDMARK',
      categoryLabel: 'Spiritual Heritage Ghats',
      icon: 'landmark',
      lat: 25.3090,
      lng: 83.0060,
      zone: 'Heritage Ghats',
      type: 'TRANSIT_STATION',
      aliases: ['kashi vishwanath', 'godowlia', 'dashashwamedh ghat', 'assighat', 'vishwanath dham']
    },
    {
      id: 'up_vns_bhu',
      name: 'Banaras Hindu University (BHU Lanka)',
      displayName: 'BHU Main Gate, Lanka Market & Sir Sunderlal Hospital, South Varanasi',
      category: 'TECH_HUB',
      categoryLabel: 'University & Healthcare',
      icon: 'building',
      lat: 25.2800,
      lng: 82.9990,
      zone: 'South Varanasi',
      type: 'TRANSIT_STATION',
      aliases: ['bhu', 'bhu lanka', 'banaras hindu university', 'lanka varanasi', 'iit bhu']
    },
    {
      id: 'up_agr_taj',
      name: 'Taj Mahal & East Gate Complex',
      displayName: 'Taj Mahal Monument & Shilpgram Tourism Complex, Agra',
      category: 'LANDMARK',
      categoryLabel: 'Wonder of the World',
      icon: 'landmark',
      lat: 27.1750,
      lng: 78.0422,
      zone: 'Taj Heritage',
      type: 'TRANSIT_STATION',
      aliases: ['taj mahal', 'taj', 'shilpgram', 'fatehabad road', 'agra taj']
    },
    {
      id: 'up_knp_central',
      name: 'Kanpur Central & Jhakarkati ISBT',
      displayName: 'Kanpur Central Railway Station & Jhakarkati Inter-state Bus Terminal, Kanpur',
      category: 'TRANSIT',
      categoryLabel: 'Major Transit Hub',
      icon: 'bus',
      lat: 26.4547,
      lng: 80.3507,
      zone: 'Central Kanpur',
      type: 'TRANSIT_STATION',
      aliases: ['kanpur central', 'jhakarkati', 'kanpur bus stand', 'moti jheel', 'mall road kanpur']
    },
    {
      id: 'up_ayd_dham',
      name: 'Ayodhya Dham & Ram Janmabhoomi Mandir',
      displayName: 'Ayodhya Dham Ram Mandir Teerth Kshetra & Junction Terminal, Ayodhya',
      category: 'LANDMARK',
      categoryLabel: 'Holy Teerth Kshetra',
      icon: 'landmark',
      lat: 26.7990,
      lng: 82.2030,
      zone: 'Ayodhya Dham',
      type: 'TRANSIT_STATION',
      aliases: ['ayodhya', 'ram mandir', 'ayodhya dham', 'ram janmabhoomi', 'hanuman garhi', 'saryu ghat']
    },
    {
      id: 'up_pry_sangam',
      name: 'Prayagraj Triveni Sangam Ghat',
      displayName: 'Holy Triveni Sangam Ghat & Civil Lines Bus Station, Prayagraj',
      category: 'LANDMARK',
      categoryLabel: 'Holy Sangam Heritage',
      icon: 'landmark',
      lat: 25.4280,
      lng: 81.8840,
      zone: 'Holy Sangam',
      type: 'TRANSIT_STATION',
      aliases: ['sangam', 'prayagraj sangam', 'triveni sangam', 'allahabad sangam', 'kumbh mela ghat']
    },
    {
      id: 'up_noi_sec62',
      name: 'Noida Sector 62 IT Hub & Electronic City',
      displayName: 'Noida Sector 62 Electronic City Metro Station & Tech Zone, Noida',
      category: 'TECH_HUB',
      categoryLabel: 'IT Tech Zone',
      icon: 'building',
      lat: 28.6258,
      lng: 77.3688,
      zone: 'Noida IT Hub',
      type: 'TRANSIT_STATION',
      aliases: ['sec 62', 'sector 62', 'electronic city noida', 'noida 62', 'tot mall', 'noida electronic city']
    },
    {
      id: 'up_noi_pari_chowk',
      name: 'Greater Noida Pari Chowk Terminal',
      displayName: 'Pari Chowk Aqua Line Metro Terminal & Express Hub, Greater Noida',
      category: 'TRANSIT',
      categoryLabel: 'Expressway Transit Hub',
      icon: 'bus',
      lat: 28.4682,
      lng: 77.5090,
      zone: 'Greater Noida',
      type: 'TRANSIT_STATION',
      aliases: ['pari chowk', 'greater noida', 'yamuna expressway entry', 'alpha 1', 'knowledge park']
    }
  ]
};

// Smart Local Place & Bus Search Engine
async function searchPlaces(query, city = 'delhi') {
  const cleanQ = (query || '').trim().toLowerCase();
  const cityKey = city.toLowerCase();
  const cacheKey = `${cityKey}_${cleanQ}`;

  if (placesCache.has(cacheKey)) {
    return placesCache.get(cacheKey);
  }

  const results = [];
  const addedIds = new Set();

  const stops = db.getStops(cityKey);
  const curatedLandmarks = CITY_LANDMARKS[cityKey] || [];
  const routes = db.getRoutes(cityKey);

  // If query is empty or 1 character, return top popular hubs
  if (cleanQ.length === 0) {
    const popular = curatedLandmarks.slice(0, 8);
    return popular;
  }

  // 1. Check Matching Bus Routes (e.g. user typed "73", "502", "bus 73", "460")
  routes.forEach(r => {
    const rNum = (r.routeNumber || '').toLowerCase();
    const rName = (r.name || '').toLowerCase();
    if (rNum === cleanQ || rNum.startsWith(cleanQ) || cleanQ.includes(rNum) || rName.includes(cleanQ)) {
      results.push({
        id: `route_${r.id}`,
        name: `Bus Route ${r.routeNumber}`,
        displayName: `${r.name} (${r.description || 'DTC Corridor'})`,
        category: 'BUS_ROUTE',
        categoryLabel: `DTC Bus • ₹${r.baseFare}`,
        icon: 'bus',
        routeNumber: r.routeNumber,
        routeColor: r.color || '#0284c7',
        lat: r.waypoints && r.waypoints[0] ? r.waypoints[0][0] : null,
        lng: r.waypoints && r.waypoints[0] ? r.waypoints[0][1] : null,
        type: 'BUS_ROUTE'
      });
    }
  });

  // 2. Exact / Prefix Matches from Curated Landmarks with Aliases
  curatedLandmarks.forEach(lm => {
    const nameMatch = lm.name.toLowerCase().includes(cleanQ);
    const aliasMatch = lm.aliases && lm.aliases.some(a => a.includes(cleanQ) || cleanQ.includes(a));
    const zoneMatch = lm.zone && lm.zone.toLowerCase().includes(cleanQ);

    if (nameMatch || aliasMatch || zoneMatch) {
      if (!addedIds.has(lm.id)) {
        addedIds.add(lm.id);
        results.push({
          ...lm,
          matchedOnAlias: aliasMatch && !nameMatch
        });
      }
    }
  });

  // 3. Match Local Transit Database Stops
  stops.forEach(s => {
    if (!addedIds.has(s.id)) {
      const nameMatch = s.name.toLowerCase().includes(cleanQ);
      const zoneMatch = s.zone && s.zone.toLowerCase().includes(cleanQ);
      if (nameMatch || zoneMatch) {
        addedIds.add(s.id);
        results.push({
          id: s.id,
          name: s.name,
          displayName: `${s.name} (${s.zone || city})`,
          category: 'TRANSIT',
          categoryLabel: 'Bus / Metro Stop',
          icon: 'station',
          lat: s.lat,
          lng: s.lng,
          type: 'TRANSIT_STATION'
        });
      }
    }
  });

  // 4. Concurrently Query OpenStreetMap Nominatim for specific colony / sector / street addresses (if query >= 2 chars)
  if (cleanQ.length >= 2) {
    try {
      let nominatimResults = await queryNominatim(cleanQ);
      if ((!nominatimResults || nominatimResults.length === 0) && !cleanQ.includes(cityKey)) {
        const cityConfig = db.getCities().find(c => c.id === cityKey);
        if (cityConfig) {
          nominatimResults = await queryNominatim(`${cleanQ}, ${cityConfig.name}`);
        }
      }

      if (nominatimResults && nominatimResults.length > 0) {
        nominatimResults.forEach(nr => {
          if (!results.some(r => r.lat && nr.lat && Math.abs(r.lat - nr.lat) < 0.003 && Math.abs(r.lng - nr.lng) < 0.003)) {
            results.push({
              id: nr.id,
              name: nr.name,
              displayName: nr.displayName,
              category: 'COLONY_ADDRESS',
              categoryLabel: 'Area / Street Address',
              icon: 'pin',
              lat: nr.lat,
              lng: nr.lng,
              type: 'CUSTOM_LOCATION'
            });
          }
        });
      }
    } catch (err) {}
  }

  placesCache.set(cacheKey, results.slice(0, 15));
  return results.slice(0, 15);
}

// Endpoint: Search Places & Addresses (OpenStreetMap + Local Stations + Landmarks)
router.get('/search-places', async (req, res) => {
  const { q = '', city = 'delhi' } = req.query;
  const places = await searchPlaces(q, city);
  res.json({ places });
});

// Helper: Query real street-by-street road network geometry via OSRM OpenStreetMap Routing
async function getRoadGeometry(coords) {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return coords;
  
  // Filter consecutive duplicate coordinates
  const cleanCoords = [];
  coords.forEach((c, idx) => {
    if (!c || c.length < 2 || isNaN(c[0]) || isNaN(c[1])) return;
    if (idx === 0) {
      cleanCoords.push(c);
    } else {
      const prev = cleanCoords[cleanCoords.length - 1];
      if (Math.abs(prev[0] - c[0]) > 0.0001 || Math.abs(prev[1] - c[1]) > 0.0001) {
        cleanCoords.push(c);
      }
    }
  });

  if (cleanCoords.length < 2) return coords;

  const key = cleanCoords.map(c => `${Number(c[0]).toFixed(4)},${Number(c[1]).toFixed(4)}`).join(';');
  if (roadGeometryCache.has(key)) {
    return roadGeometryCache.get(key);
  }

  return new Promise(resolve => {
    try {
      const coordStr = cleanCoords.map(c => `${c[1]},${c[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
      const req = https.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MyRoute-Transit/1.0' }, 
        timeout: 5000 
      }, res => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.code === 'Ok' && parsed.routes && parsed.routes[0] && parsed.routes[0].geometry) {
              const polyline = parsed.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              if (polyline.length > cleanCoords.length) {
                roadGeometryCache.set(key, polyline);
                resolve(polyline);
                return;
              }
            }
          } catch (e) {}
          resolve(cleanCoords);
        });
      });
      req.on('error', () => resolve(cleanCoords));
      req.on('timeout', () => {
        req.destroy();
        resolve(cleanCoords);
      });
    } catch (e) {
      resolve(cleanCoords);
    }
  });
}

// Dedicated Road Geometry Query Endpoint
router.post('/road-geometry', async (req, res) => {
  const { coordinates } = req.body;
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({ error: 'At least 2 coordinate pairs required [[lat, lng], [lat, lng]]' });
  }
  const roadPath = await getRoadGeometry(coordinates);
  res.json({ geometry: roadPath });
});

// Enhanced Multi-Route Multi-Modal Trip Planner Engine (Supports Manual Typed Locations + Live GPS + Real Road Geometry)
router.post('/plan-trip', async (req, res) => {
  const { 
    originId, 
    destinationId, 
    originCoords, 
    destCoords, 
    originText, 
    destinationText, 
    city = 'delhi' 
  } = req.body;

  const stops = db.getStops(city);
  const routes = db.getRoutes(city);
  const activeVehicles = db.getActiveVehicles(city);

  let startStop = stops.find(s => s.id === originId);
  let endStop = stops.find(s => s.id === destinationId);

  // If manual origin coordinates provided or need geocoding
  let resolvedOriginCoords = originCoords;
  if (!startStop && !resolvedOriginCoords && originText) {
    const matched = await searchPlaces(originText, city);
    if (matched && matched.length > 0) {
      resolvedOriginCoords = { lat: matched[0].lat, lng: matched[0].lng, name: matched[0].name };
    }
  }

  // If manual destination coordinates provided or need geocoding
  let resolvedDestCoords = destCoords;
  if (!endStop && !resolvedDestCoords && destinationText) {
    const matched = await searchPlaces(destinationText, city);
    if (matched && matched.length > 0) {
      resolvedDestCoords = { lat: matched[0].lat, lng: matched[0].lng, name: matched[0].name };
    }
  }

  // Find nearest transit stops if custom coordinates are provided
  if (!startStop && resolvedOriginCoords) {
    let minD = Infinity;
    stops.forEach(s => {
      const d = calculateDistanceKm(resolvedOriginCoords.lat, resolvedOriginCoords.lng, s.lat, s.lng);
      if (d < minD) {
        minD = d;
        startStop = s;
      }
    });
  }

  if (!endStop && resolvedDestCoords) {
    let minD = Infinity;
    stops.forEach(s => {
      const d = calculateDistanceKm(resolvedDestCoords.lat, resolvedDestCoords.lng, s.lat, s.lng);
      if (d < minD) {
        minD = d;
        endStop = s;
      }
    });
  }

  if (!startStop || !endStop) {
    return res.status(400).json({ error: 'Valid origin and destination stops/places are required' });
  }

  const isLiveGPS = Boolean(originCoords && originCoords.isLiveGPS !== false);
  const isCustomOrigin = Boolean(resolvedOriginCoords);
  const isCustomDest = Boolean(resolvedDestCoords);

  const originLat = resolvedOriginCoords ? resolvedOriginCoords.lat : startStop.lat;
  const originLng = resolvedOriginCoords ? resolvedOriginCoords.lng : startStop.lng;
  const destLat = resolvedDestCoords ? resolvedDestCoords.lat : endStop.lat;
  const destLng = resolvedDestCoords ? resolvedDestCoords.lng : endStop.lng;

  const originDisplayName = originText || (resolvedOriginCoords && resolvedOriginCoords.name) || (isLiveGPS ? 'My Live Location (GPS)' : startStop.name);
  const destDisplayName = destinationText || (resolvedDestCoords && resolvedDestCoords.name) || endStop.name;

  const originData = {
    id: isLiveGPS ? 'live_gps_origin' : isCustomOrigin ? 'custom_origin' : startStop.id,
    name: originDisplayName,
    lat: originLat,
    lng: originLng,
    isLiveGPS,
    isCustom: isCustomOrigin,
    nearestStop: startStop.name,
    zone: isLiveGPS ? 'Live GPS Pin' : isCustomOrigin ? 'Custom Typed Location' : startStop.zone
  };

  const destData = {
    id: isCustomDest ? 'custom_destination' : endStop.id,
    name: destDisplayName,
    lat: destLat,
    lng: destLng,
    isCustom: isCustomDest,
    nearestStop: endStop.name,
    zone: isCustomDest ? 'Custom Destination' : endStop.zone
  };

  const directDistance = calculateDistanceKm(originLat, originLng, endStop.lat, endStop.lng);
  const roadDistance = Math.max(1, Math.round(directDistance * 1.35 * 10) / 10);

  const liveWalkDistM = originCoords
    ? Math.round(calculateDistanceKm(originCoords.lat, originCoords.lng, startStop.lat, startStop.lng) * 1000)
    : 120;
  const liveWalkMins = Math.max(1, Math.round(liveWalkDistM / 70));

  const tripOptions = [];

  // 1. Direct Bus Options
  const directBusRoutes = routes.filter(r => 
    r.type === 'BUS' && 
    r.stops.includes(startStop.id) && 
    r.stops.includes(endStop.id)
  );

  for (const r of directBusRoutes) {
    const startIndex = r.stops.indexOf(startStop.id);
    const endIndex = r.stops.indexOf(endStop.id);
    const stopCount = Math.abs(endIndex - startIndex);
    const busRideMins = Math.round(stopCount * 3.5 + 4);
    const estTimeMins = busRideMins + (isLiveGPS ? liveWalkMins : 2);
    const fare = Math.min(25, Math.max(10, Math.round(r.baseFare + roadDistance * r.perKmFare)));
    const liveBuses = activeVehicles.filter(v => v.routeNumber === r.routeNumber);
    const nextDepMins = liveBuses.length > 0 ? 3 : r.frequencyMinutes;

    // Get key intermediate stops for this bus journey
    const minIdx = Math.min(startIndex, endIndex);
    const maxIdx = Math.max(startIndex, endIndex);
    const subStops = r.stops.slice(minIdx, maxIdx + 1).map(sId => stops.find(s => s.id === sId)).filter(Boolean);
    const waypointCoordinates = subStops.map(s => [s.lat, s.lng]);
    if (isLiveGPS) {
      waypointCoordinates.unshift([originLat, originLng]);
    }

    const busRoadGeometry = await getRoadGeometry(waypointCoordinates);

    tripOptions.push({
      id: `route_direct_bus_${r.id}`,
      type: 'DIRECT_BUS',
      title: isLiveGPS ? `Route 1: Walk to ${startStop.name} + Direct Bus (${r.routeNumber})` : `Route 1: Direct City Bus (${r.routeNumber})`,
      tag: 'Cheapest & Eco-Friendly',
      badgeColor: r.color,
      routeNumber: r.routeNumber,
      totalDurationMins: estTimeMins,
      nextDepartureMins: nextDepMins,
      totalFare: fare,
      distanceKm: roadDistance,
      co2SavingsKg: (roadDistance * 0.12).toFixed(1),
      summary: isLiveGPS 
        ? `Walk ${liveWalkMins}m (${liveWalkDistM}m) to ${startStop.name}, then board Bus ${r.routeNumber} to ${endStop.name}.`
        : `Direct service on ${r.name} with ${stopCount} intermediate stops.`,
      roadGeometry: busRoadGeometry,
      segments: [
        {
          mode: 'WALK',
          instructions: isLiveGPS ? `Walk ${liveWalkMins} mins (${liveWalkDistM}m) from Live Location to ${startStop.name}` : `Walk 2 mins to ${startStop.name}`,
          durationMins: isLiveGPS ? liveWalkMins : 2,
          distanceM: liveWalkDistM
        },
        {
          mode: 'BUS',
          routeNumber: r.routeNumber,
          routeName: r.name,
          boardStop: startStop.name,
          alightStop: endStop.name,
          stopsCount: stopCount,
          durationMins: busRideMins,
          fare: fare,
          frequency: `Every ${r.frequencyMinutes} mins`,
          liveBusesAvailable: liveBuses.length
        }
      ]
    });
  }

  // Fallback Bus Route if no single direct bus line covers startStop -> endStop
  if (tripOptions.filter(o => o.type === 'DIRECT_BUS').length === 0) {
    const representativeRoute = routes.find(r => r.type === 'BUS') || routes[0];
    const busRideMins = Math.round(roadDistance * 3.2 + 6);
    const busFare = Math.min(25, Math.max(10, Math.round(10 + roadDistance * 1.5)));
    const busGeometry = await getRoadGeometry([
      [originLat, originLng],
      [startStop.lat, startStop.lng],
      [endStop.lat, endStop.lng],
      [destLat, destLng]
    ]);

    tripOptions.push({
      id: 'route_transit_bus_express',
      type: 'DIRECT_BUS',
      title: isLiveGPS 
        ? `Route 1: Live GPS Connect + Transit Bus (${representativeRoute ? representativeRoute.routeNumber : 'Express'})` 
        : `Route 1: City Transit Bus (${representativeRoute ? representativeRoute.routeNumber : 'Express'})`,
      tag: 'Cheapest & Eco-Friendly',
      badgeColor: '#0284c7',
      routeNumber: representativeRoute ? representativeRoute.routeNumber : 'Express',
      totalDurationMins: busRideMins + (isLiveGPS ? liveWalkMins : 3),
      nextDepartureMins: 4,
      totalFare: busFare,
      distanceKm: roadDistance,
      co2SavingsKg: (roadDistance * 0.12).toFixed(1),
      summary: `City transit connection between ${originDisplayName} and ${destDisplayName} via nearest hub (${startStop.name}).`,
      roadGeometry: busGeometry,
      segments: [
        {
          mode: 'WALK',
          instructions: isLiveGPS ? `Walk ${liveWalkMins} mins to nearest transit stop (${startStop.name})` : `Walk 2 mins to ${startStop.name}`,
          durationMins: isLiveGPS ? liveWalkMins : 2,
          distanceM: liveWalkDistM
        },
        {
          mode: 'BUS',
          routeNumber: representativeRoute ? representativeRoute.routeNumber : 'Express Bus',
          routeName: representativeRoute ? representativeRoute.name : 'City Transit Corridor',
          boardStop: startStop.name,
          alightStop: endStop.name,
          durationMins: busRideMins,
          fare: busFare,
          frequency: 'Every 5-8 mins'
        }
      ]
    });
  }

  // 2. Direct Auto Rickshaw Option (Door-to-door from Live Location via real road network)
  const autoFare = Math.round(25 + Math.max(0, roadDistance - 1.5) * 9.5);
  const autoDuration = Math.round(roadDistance * 2.2 + (isLiveGPS ? 3 : 5));
  const liveAutos = activeVehicles.filter(v => v.vehicleType === 'AUTO');
  const autoRoadGeometry = await getRoadGeometry([[originLat, originLng], [endStop.lat, endStop.lng]]);

  tripOptions.push({
    id: 'route_direct_auto',
    type: 'DIRECT_AUTO',
    title: isLiveGPS ? 'Route 2: Direct Auto (Doorstep Live GPS Pickup)' : 'Route 2: Direct Metered Auto Rickshaw',
    tag: 'Fastest Door-to-Door',
    badgeColor: '#f59e0b',
    routeNumber: 'Auto',
    totalDurationMins: autoDuration,
    nextDepartureMins: 2,
    totalFare: autoFare,
    distanceKm: roadDistance,
    co2SavingsKg: '0.0',
    summary: isLiveGPS 
      ? `Doorstep pickup from your current live location directly to ${endStop.name} via fastest road corridor.`
      : 'Point-to-point metered auto ride via main arterial roads with zero transfers.',
    roadGeometry: autoRoadGeometry,
    segments: [
      {
        mode: 'AUTO',
        routeNumber: 'Auto Meter',
        routeName: 'Direct Auto Rickshaw',
        boardStop: isLiveGPS ? 'My Live Location (GPS)' : startStop.name,
        alightStop: endStop.name,
        durationMins: autoDuration,
        fare: autoFare,
        liveAutosAvailable: liveAutos.length
      }
    ]
  });

  // 3. Smart Multi-Modal Combination (Auto + Express Bus + Walk)
  const candidateBusRoutes = routes.filter(r => r.type === 'BUS');
  let multiModalOption = null;

  for (const r of candidateBusRoutes) {
    let bestStartStop = null;
    let bestStartDist = Infinity;
    let bestEndStop = null;
    let bestEndDist = Infinity;

    r.stops.forEach(sId => {
      const s = stops.find(st => st.id === sId);
      if (s) {
        const dStart = calculateDistanceKm(originLat, originLng, s.lat, s.lng);
        const dEnd = calculateDistanceKm(endStop.lat, endStop.lng, s.lat, s.lng);
        if (dStart < bestStartDist) {
          bestStartDist = dStart;
          bestStartStop = s;
        }
        if (dEnd < bestEndDist) {
          bestEndDist = dEnd;
          bestEndStop = s;
        }
      }
    });

    if (bestStartStop && bestEndStop && bestStartStop.id !== bestEndStop.id) {
      const leg1Dist = Math.round(bestStartDist * 10) / 10;
      const leg1Fare = leg1Dist > 0.4 ? Math.round(25 + leg1Dist * 9.5) : 0;
      const busFare = 15;
      const leg2Dist = Math.round(bestEndDist * 10) / 10;
      const leg2Fare = leg2Dist > 0.4 ? Math.round(25 + leg2Dist * 9.5) : 0;

      const totalMultiFare = leg1Fare + busFare + leg2Fare;
      const totalMultiTime = Math.round((leg1Dist > 0.4 ? leg1Dist * 3 : 4) + 14 + (leg2Dist > 0.4 ? leg2Dist * 3 : 3));

      const multiModalGeometry = await getRoadGeometry([
        [originLat, originLng],
        [bestStartStop.lat, bestStartStop.lng],
        [bestEndStop.lat, bestEndStop.lng],
        [endStop.lat, endStop.lng]
      ]);

      multiModalOption = {
        id: `route_multimodal_${r.id}`,
        type: 'MULTI_MODAL',
        title: isLiveGPS ? `Route 3: Smart Combo (Auto to ${bestStartStop.name} + Bus ${r.routeNumber})` : `Route 3: Multi-Modal Combo (Auto + Bus ${r.routeNumber} + Walk)`,
        tag: 'Balanced Time & Budget',
        badgeColor: '#10b981',
        routeNumber: `${r.routeNumber} Combo`,
        totalDurationMins: totalMultiTime,
        nextDepartureMins: 4,
        totalFare: totalMultiFare > 0 ? totalMultiFare : 25,
        distanceKm: roadDistance,
        co2SavingsKg: (roadDistance * 0.08).toFixed(1),
        summary: `Connect via auto from live position to ${bestStartStop.name}, take rapid Bus ${r.routeNumber}, then short drop to ${endStop.name}.`,
        roadGeometry: multiModalGeometry,
        segments: [
          leg1Dist > 0.4
            ? {
                mode: 'AUTO',
                instructions: `Short Auto ride from ${isLiveGPS ? 'Live Location' : startStop.name} to ${bestStartStop.name}`,
                durationMins: Math.round(leg1Dist * 3),
                fare: leg1Fare
              }
            : {
                mode: 'WALK',
                instructions: `Walk 4 mins to ${bestStartStop.name}`,
                durationMins: 4,
                distanceM: 250
              },
          {
            mode: 'BUS',
            routeNumber: r.routeNumber,
            routeName: r.name,
            boardStop: bestStartStop.name,
            alightStop: bestEndStop.name,
            durationMins: 14,
            fare: busFare,
            frequency: `Every ${r.frequencyMinutes} mins`
          },
          leg2Dist > 0.4
            ? {
                mode: 'AUTO',
                instructions: `Auto from ${bestEndStop.name} to ${endStop.name}`,
                durationMins: Math.round(leg2Dist * 3),
                fare: leg2Fare
              }
            : {
                mode: 'WALK',
                instructions: `Walk 3 mins to final destination (${endStop.name})`,
                durationMins: 3,
                distanceM: 200
              }
        ]
      };
      break;
    }
  }

  if (multiModalOption) {
    tripOptions.push(multiModalOption);
  }

  // 4. Shared Auto / Feeder Line if distance is short
  if (roadDistance <= 12) {
    const sharedFare = Math.min(30, Math.max(15, Math.round(roadDistance * 3.5)));
    const sharedGeometry = await getRoadGeometry([[originLat, originLng], [endStop.lat, endStop.lng]]);

    tripOptions.push({
      id: 'route_shared_auto',
      type: 'SHARED_AUTO',
      title: isLiveGPS ? 'Route 4: Shared E-Rickshaw from Nearby Stand' : 'Route 4: Shared E-Rickshaw / Metro Shuttle',
      tag: 'Hyper-Local Seat Share',
      badgeColor: '#06b6d4',
      routeNumber: 'Shuttle',
      totalDurationMins: Math.round(roadDistance * 2.8 + (isLiveGPS ? 5 : 6)),
      nextDepartureMins: 3,
      totalFare: sharedFare,
      distanceKm: roadDistance,
      co2SavingsKg: (roadDistance * 0.15).toFixed(1),
      summary: `Hop-on shared e-rickshaw or shuttle directly heading towards ${endStop.name}.`,
      roadGeometry: sharedGeometry,
      segments: [
        {
          mode: 'SHARED_AUTO',
          routeNumber: 'Feeder Shuttle',
          routeName: 'Local Metro Feeder',
          boardStop: isLiveGPS ? `Near Live Location (${startStop.name} Stand)` : startStop.name,
          alightStop: endStop.name,
          durationMins: Math.round(roadDistance * 2.8 + 6),
          fare: sharedFare
        }
      ]
    });
  }

  res.json({
    city,
    origin: originData,
    destination: destData,
    distanceKm: roadDistance,
    isLiveGPS,
    options: tripOptions
  });
});

module.exports = router;
