const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

const defaultData = {
  cities: [],
  users: [],
  drivers: [],
  routes: [],
  stops: [],
  active_vehicles: {},
  fare_reports: [],
  rewards: [],
  support_tickets: [],
  emergency_helplines: []
};

class Database {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading data.json:', err);
    }
    return JSON.parse(JSON.stringify(defaultData));
  }

  saveData() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving data.json:', err);
    }
  }

  // Cities
  getCities() {
    return this.data.cities || [];
  }

  // Users & Drivers
  findUserByEmail(email) {
    if (!email) return null;
    return this.data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  }

  findUserByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return this.data.users.find(u => u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone);
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findDriverById(id) {
    return this.data.drivers.find(d => d.id === id);
  }

  findDriverByEmail(email) {
    if (!email) return null;
    return this.data.drivers.find(d => d.email && d.email.toLowerCase() === email.toLowerCase());
  }

  findDriverByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return this.data.drivers.find(d => d.phone && d.phone.replace(/[^0-9]/g, '') === cleanPhone);
  }

  addUser(user) {
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  addDriver(driver) {
    this.data.drivers.push(driver);
    this.saveData();
    return driver;
  }

  updateDriver(id, updates) {
    const idx = this.data.drivers.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.data.drivers[idx] = { ...this.data.drivers[idx], ...updates, updatedAt: new Date().toISOString() };
      this.saveData();
      return this.data.drivers[idx];
    }
    return null;
  }

  updateUser(id, updates) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: new Date().toISOString() };
      this.saveData();
      return this.data.users[idx];
    }
    return null;
  }

  // Active Live Vehicle Tracking
  updateVehiclePosition(driverId, positionData) {
    this.data.active_vehicles[driverId] = {
      ...this.data.active_vehicles[driverId],
      ...positionData,
      driverId,
      lastUpdated: new Date().toISOString()
    };
    return this.data.active_vehicles[driverId];
  }

  removeVehiclePosition(driverId) {
    delete this.data.active_vehicles[driverId];
  }

  getActiveVehicles(city = null) {
    const list = Object.values(this.data.active_vehicles);
    if (city && city.toLowerCase() !== 'all') {
      return list.filter(v => 
        (v.city || 'delhi').toLowerCase() === city.toLowerCase() ||
        (v.state || '').toLowerCase() === city.toLowerCase()
      );
    }
    return list;
  }

  // Routes & Stops
  getRoutes(city = null) {
    if (city && city.toLowerCase() !== 'all') {
      return this.data.routes.filter(r => 
        (r.city || 'delhi').toLowerCase() === city.toLowerCase() ||
        (r.state || '').toLowerCase().includes(city.toLowerCase())
      );
    }
    return this.data.routes;
  }

  getRouteById(routeId) {
    return this.data.routes.find(r => r.id === routeId || r.routeNumber === routeId);
  }

  getStops(city = null) {
    if (city && city.toLowerCase() !== 'all') {
      return this.data.stops.filter(s => 
        (s.city || 'delhi').toLowerCase() === city.toLowerCase() ||
        (s.state || '').toLowerCase().includes(city.toLowerCase())
      );
    }
    return this.data.stops;
  }

  // Fare Reports
  getFareReports(city = null) {
    if (city) {
      return this.data.fare_reports.filter(f => !f.city || f.city.toLowerCase() === city.toLowerCase());
    }
    return this.data.fare_reports;
  }

  addFareReport(report) {
    this.data.fare_reports.unshift(report);
    this.saveData();
    return report;
  }

  upvoteFareReport(id) {
    const report = this.data.fare_reports.find(r => r.id === id);
    if (report) {
      report.upvotes = (report.upvotes || 0) + 1;
      this.saveData();
      return report;
    }
    return null;
  }

  // Rewards
  getUserRewards(userId) {
    return this.data.rewards.filter(r => r.userId === userId);
  }

  addRewardTransaction(tx) {
    this.data.rewards.push(tx);
    const user = this.data.users.find(u => u.id === tx.userId);
    if (user) {
      user.rewardPoints = (user.rewardPoints || 0) + tx.points;
    }
    this.saveData();
    return tx;
  }

  // Support
  getTickets(userId = null) {
    if (userId) {
      return this.data.support_tickets.filter(t => t.userId === userId);
    }
    return this.data.support_tickets;
  }

  createTicket(ticket) {
    this.data.support_tickets.unshift(ticket);
    this.saveData();
    return ticket;
  }

  // ==========================================
  // OTP Management (Secure, Persistent, Time-Bound)
  // ==========================================
  saveOtp(type, identifier, code, expiresAt, metadata = {}) {
    if (!this.data.otps) this.data.otps = [];
    const cleanId = identifier.toString().toLowerCase().trim();
    // Remove previous active OTP for this identifier & type
    this.data.otps = this.data.otps.filter(o => !(o.type === type && o.identifier.toLowerCase() === cleanId));
    
    const record = {
      id: 'otp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type, // 'EMAIL' | 'PHONE' | 'AADHAAR'
      identifier: cleanId,
      code: code.toString().trim(),
      createdAt: Date.now(),
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      verified: false,
      metadata
    };
    
    this.data.otps.push(record);
    this.saveData();
    return record;
  }

  getOtp(type, identifier) {
    if (!this.data.otps) this.data.otps = [];
    const cleanId = identifier.toString().toLowerCase().trim();
    return this.data.otps.find(o => o.type === type && o.identifier.toLowerCase() === cleanId);
  }

  incrementOtpAttempts(type, identifier) {
    const record = this.getOtp(type, identifier);
    if (record) {
      record.attempts = (record.attempts || 0) + 1;
      this.saveData();
      return record.attempts;
    }
    return 0;
  }

  markOtpVerified(type, identifier) {
    const record = this.getOtp(type, identifier);
    if (record) {
      record.verified = true;
      record.verifiedAt = Date.now();
      this.saveData();
      return true;
    }
    return false;
  }

  deleteOtp(type, identifier) {
    if (!this.data.otps) return;
    const cleanId = identifier.toString().toLowerCase().trim();
    this.data.otps = this.data.otps.filter(o => !(o.type === type && o.identifier.toLowerCase() === cleanId));
    this.saveData();
  }
}

const db = new Database();
module.exports = db;
