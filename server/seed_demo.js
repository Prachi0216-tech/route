const bcrypt = require('bcryptjs');
const db = require('./db');

async function ensureDemoAccounts() {
  const salt = await bcrypt.genSalt(10);
  const passHash = await bcrypt.hash('passenger123', salt);
  const driverPassHash = await bcrypt.hash('driver123', salt);

  // 1. Commuter Demo
  const commuterEmail = 'gaurav.passenger@myroute.in';
  let commuter = db.findUserByEmail(commuterEmail);
  if (!commuter) {
    db.addUser({
      id: 'usr_demo_commuter',
      name: 'Gaurav Singh (Passenger)',
      email: commuterEmail,
      phone: '9876543210',
      password: passHash,
      city: 'uttar_pradesh',
      role: 'COMMUTER',
      rewardPoints: 250,
      badges: ['Verified Commuter', 'Daily Passholder'],
      savedRoutes: ['UPSRTC-101'],
      createdAt: new Date().toISOString()
    });
    console.log('✅ Demo Passenger created: gaurav.passenger@myroute.in');
  }

  // 2. UP Driver Demo
  const upDriverEmail = 'ramesh.upsrtc@myroute.in';
  let upDriver = db.findDriverByEmail(upDriverEmail);
  if (!upDriver) {
    db.addDriver({
      id: 'drv_demo_upsrtc',
      name: 'Ramesh Yadav (Pilot)',
      email: upDriverEmail,
      phone: '9811223344',
      password: driverPassHash,
      city: 'uttar_pradesh',
      role: 'DRIVER',
      licenseNumber: 'UP32-2018-0098765',
      aadhaarNumber: 'XXXX XXXX 8765',
      experienceYears: 6,
      vehicleType: 'BUS',
      fleetOperator: 'UPSRTC',
      vehicleNumber: 'UP 32 AZ 4589',
      busNumber: 'UP-LKO-01',
      routeNumber: 'UPSRTC-101',
      routeOrigin: 'Lucknow Charbagh',
      routeDestination: 'Gorakhpur ISBT',
      vehicleModel: 'Ashok Leyland Janrath AC Coach',
      totalSeats: 45,
      availableSeats: 28,
      hasAC: true,
      isElectric: false,
      isOnline: true,
      hasLocationPermission: true,
      currentStatus: 'EN_ROUTE',
      currentLocation: { lat: 26.8467, lng: 80.9462 },
      heading: 90,
      speedKmh: 0,
      nextStop: 'Charbagh Station',
      crowdDensity: 'AVAILABLE',
      rating: 4.9,
      totalTrips: 142,
      shiftEarnings: 3200,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Demo UPSRTC Driver created: ramesh.upsrtc@myroute.in');
  }

  // 3. Delhi Driver Demo
  const dtcDriverEmail = 'rajesh.dtc@myroute.in';
  let dtcDriver = db.findDriverByEmail(dtcDriverEmail);
  if (!dtcDriver) {
    db.addDriver({
      id: 'drv_demo_dtc',
      name: 'Rajesh Sharma (DTC Captain)',
      email: dtcDriverEmail,
      phone: '9822334455',
      password: driverPassHash,
      city: 'delhi',
      role: 'DRIVER',
      licenseNumber: 'DL01-2019-0054321',
      aadhaarNumber: 'XXXX XXXX 4321',
      experienceYears: 8,
      vehicleType: 'BUS',
      fleetOperator: 'DTC',
      vehicleNumber: 'DL 01 AB 7654',
      busNumber: 'DTC-502',
      routeNumber: 'DTC-502',
      routeOrigin: 'Mehrauli Terminal',
      routeDestination: 'Kashmere Gate ISBT',
      vehicleModel: 'Tata Ultra Urban 9m EV Bus',
      totalSeats: 40,
      availableSeats: 18,
      hasAC: true,
      isElectric: true,
      isOnline: true,
      hasLocationPermission: true,
      currentStatus: 'EN_ROUTE',
      currentLocation: { lat: 28.6139, lng: 77.2090 },
      heading: 45,
      speedKmh: 0,
      nextStop: 'Connaught Place Outer Circle',
      crowdDensity: 'MODERATE',
      rating: 4.8,
      totalTrips: 210,
      shiftEarnings: 4500,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Demo DTC Driver created: rajesh.dtc@myroute.in');
  }

  console.log('🎉 Demo accounts verified!');
}

ensureDemoAccounts().catch(console.error);
