import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const CityContext = createContext();

export const CITIES_CONFIG = [
  // --- NORTH INDIA ---
  { id: 'uttar_pradesh', name: 'Uttar Pradesh (UP Transit)', state: 'Uttar Pradesh', region: 'North', center: [26.8467, 80.9462], zoom: 11 },
  { id: 'delhi', name: 'Delhi NCR', state: 'Delhi', region: 'North', center: [28.6139, 77.2090], zoom: 12 },
  { id: 'punjab', name: 'Punjab (Punbus / PRTC)', state: 'Punjab', region: 'North', center: [31.6340, 74.8723], zoom: 11 },
  { id: 'haryana', name: 'Haryana Roadways', state: 'Haryana', region: 'North', center: [28.4595, 77.0266], zoom: 11 },
  { id: 'chandigarh', name: 'Chandigarh (CTU)', state: 'Chandigarh UT', region: 'North', center: [30.7333, 76.7794], zoom: 12 },
  { id: 'himachal_pradesh', name: 'Himachal Pradesh (HRTC)', state: 'Himachal Pradesh', region: 'North', center: [31.1048, 77.1734], zoom: 11 },
  { id: 'uttarakhand', name: 'Uttarakhand (UTC)', state: 'Uttarakhand', region: 'North', center: [30.3165, 78.0322], zoom: 11 },
  { id: 'jammu_kashmir', name: 'Jammu & Kashmir (JKSRTC)', state: 'Jammu & Kashmir', region: 'North', center: [34.0837, 74.7973], zoom: 11 },
  { id: 'ladakh', name: 'Ladakh (Leh Transit)', state: 'Ladakh UT', region: 'North', center: [34.1526, 77.5771], zoom: 11 },

  // --- WEST INDIA ---
  { id: 'rajasthan', name: 'Rajasthan (RSRTC)', state: 'Rajasthan', region: 'West', center: [26.9124, 75.7873], zoom: 11 },
  { id: 'gujarat', name: 'Gujarat (GSRTC)', state: 'Gujarat', region: 'West', center: [23.0225, 72.5714], zoom: 11 },
  { id: 'maharashtra', name: 'Maharashtra (MSRTC/BEST)', state: 'Maharashtra', region: 'West', center: [19.0760, 72.8777], zoom: 11 },
  { id: 'goa', name: 'Goa (Kadamba KTCL)', state: 'Goa', region: 'West', center: [15.4909, 73.8278], zoom: 12 },

  // --- CENTRAL INDIA ---
  { id: 'madhya_pradesh', name: 'Madhya Pradesh (MP Transit)', state: 'Madhya Pradesh', region: 'Central', center: [22.7196, 75.8577], zoom: 11 },
  { id: 'chhattisgarh', name: 'Chhattisgarh (CG Transit)', state: 'Chhattisgarh', region: 'Central', center: [21.2514, 81.6296], zoom: 11 },

  // --- EAST INDIA ---
  { id: 'bihar', name: 'Bihar (BSRTC)', state: 'Bihar', region: 'East', center: [25.5941, 85.1376], zoom: 11 },
  { id: 'jharkhand', name: 'Jharkhand (Ranchi Transit)', state: 'Jharkhand', region: 'East', center: [23.3441, 85.3096], zoom: 11 },
  { id: 'west_bengal', name: 'West Bengal (WBTC)', state: 'West Bengal', region: 'East', center: [22.5726, 88.3639], zoom: 11 },
  { id: 'odisha', name: 'Odisha (OSRTC / Mo Bus)', state: 'Odisha', region: 'East', center: [20.2961, 85.8245], zoom: 11 },

  // --- SOUTH INDIA ---
  { id: 'karnataka', name: 'Karnataka (KSRTC / BMTC)', state: 'Karnataka', region: 'South', center: [12.9716, 77.5946], zoom: 11 },
  { id: 'tamil_nadu', name: 'Tamil Nadu (TNSTC / MTC)', state: 'Tamil Nadu', region: 'South', center: [13.0827, 80.2707], zoom: 11 },
  { id: 'telangana', name: 'Telangana (TSRTC)', state: 'Telangana', region: 'South', center: [17.3850, 78.4867], zoom: 11 },
  { id: 'andhra_pradesh', name: 'Andhra Pradesh (APSRTC)', state: 'Andhra Pradesh', region: 'South', center: [16.5062, 80.6480], zoom: 11 },
  { id: 'kerala', name: 'Kerala (KSRTC)', state: 'Kerala', region: 'South', center: [9.9312, 76.2673], zoom: 11 },
  { id: 'puducherry', name: 'Puducherry (PRTC)', state: 'Puducherry UT', region: 'South', center: [11.9416, 79.8083], zoom: 12 },

  // --- NORTH-EAST INDIA (THE 8 SISTERS) ---
  { id: 'assam', name: 'Assam (ASTC)', state: 'Assam', region: 'North-East', center: [26.1445, 91.7362], zoom: 11 },
  { id: 'meghalaya', name: 'Meghalaya (MTC)', state: 'Meghalaya', region: 'North-East', center: [25.5788, 91.8933], zoom: 12 },
  { id: 'sikkim', name: 'Sikkim (SNT)', state: 'Sikkim', region: 'North-East', center: [27.3389, 88.6065], zoom: 12 },
  { id: 'arunachal_pradesh', name: 'Arunachal Pradesh (APSTS)', state: 'Arunachal Pradesh', region: 'North-East', center: [27.0844, 93.6053], zoom: 11 },
  { id: 'nagaland', name: 'Nagaland (NST)', state: 'Nagaland', region: 'North-East', center: [25.6751, 94.1086], zoom: 12 },
  { id: 'manipur', name: 'Manipur (MSRTC)', state: 'Manipur', region: 'North-East', center: [24.8170, 93.9368], zoom: 12 },
  { id: 'mizoram', name: 'Mizoram (MST)', state: 'Mizoram', region: 'North-East', center: [23.7271, 92.7176], zoom: 12 },
  { id: 'tripura', name: 'Tripura (TRTC)', state: 'Tripura', region: 'North-East', center: [23.8315, 91.2868], zoom: 12 }
];

export const CityProvider = ({ children }) => {
  const [currentCity, setCurrentCity] = useState(() => {
    return localStorage.getItem('myroute_selected_city') || 'uttar_pradesh';
  });

  const [cities, setCities] = useState(CITIES_CONFIG);

  useEffect(() => {
    localStorage.setItem('myroute_selected_city', currentCity);
  }, [currentCity]);

  // Optionally load dynamic cities list from API
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.getCities();
        if (res && res.cities && res.cities.length > 0) {
          setCities(res.cities);
        }
      } catch (err) {
        console.error('Error fetching dynamic cities list:', err);
      }
    };
    fetchCities();
  }, []);

  const activeCityConfig = cities.find(c => c.id === currentCity) || CITIES_CONFIG[0];

  return (
    <CityContext.Provider
      value={{
        currentCity,
        setCurrentCity,
        cities,
        activeCityConfig
      }}
    >
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => useContext(CityContext);
