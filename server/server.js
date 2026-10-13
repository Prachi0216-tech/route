require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const { router: authRouter } = require('./routes/auth');
const transitRouter = require('./routes/transit');
const faresRouter = require('./routes/fares');
const rewardsRouter = require('./routes/rewards');
const supportRouter = require('./routes/support');

const app = express();
const server = http.createServer(app);

// Enable CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/transit', transitRouter);
app.use('/api/fares', faresRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/support', supportRouter);

// Base health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'MyRoute Real Transit Core',
    activeDrivers: db.getActiveVehicles().length,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static assets from client/dist if built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback all non-API GET requests to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>MyRoute Transit Server</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1 style="color: #38bdf8;">🚍 MyRoute Real-Time Transit Backend</h1>
          <p>API & WebSocket servers are online.</p>
          <p>Please open the frontend application on <a href="http://localhost:5173" style="color: #f59e0b; font-weight: bold; font-size: 18px;">http://localhost:5173</a></p>
        </body>
        </html>
      `);
    }
  });
});

// Real-Time Socket.IO Engine (Driven ONLY by Real Connected Drivers)
io.on('connection', (socket) => {
  // Send current real active vehicles immediately
  socket.emit('vehicles:initial', db.getActiveVehicles());

  // Real Driver Location Broadcast
  socket.on('driver:location_update', (data) => {
    const { driverId, driverName, driverPhone, city, location, speedKmh, heading, routeNumber, vehicleType, vehicleNumber, availableSeats, totalSeats, nextStop, crowdDensity } = data;
    
    if (driverId && location) {
      const updatedVehicle = db.updateVehiclePosition(driverId, {
        driverId,
        driverName: driverName || 'Commercial Driver',
        driverPhone: driverPhone || '',
        city: (city || 'delhi').toLowerCase(),
        location,
        speedKmh: speedKmh || 0,
        heading: heading || 0,
        routeNumber: routeNumber || 'N/A',
        vehicleType: vehicleType || 'BUS',
        vehicleNumber: vehicleNumber || '',
        availableSeats: availableSeats !== undefined ? availableSeats : 20,
        totalSeats: totalSeats || 40,
        nextStop: nextStop || '',
        crowdDensity: crowdDensity || 'AVAILABLE'
      });

      // Broadcast live position to all listening commuters
      io.emit('vehicle:updated', updatedVehicle);

      if (routeNumber) {
        io.to(`route:${routeNumber}`).emit('route:vehicle_update', updatedVehicle);
      }
    }
  });

  // Real Driver Shift Status Toggle (Online / Take Break / Offline)
  socket.on('driver:status_change', ({ driverId, city, isOnline, currentStatus, routeNumber }) => {
    if (driverId) {
      db.updateDriver(driverId, { isOnline, currentStatus });
      if (!isOnline) {
        db.removeVehiclePosition(driverId);
        io.emit('vehicle:removed', { driverId });
      } else {
        const driver = db.findDriverById(driverId);
        if (driver) {
          const v = db.updateVehiclePosition(driverId, {
            driverId,
            driverName: driver.name,
            driverPhone: driver.phone,
            city: (driver.city || 'delhi').toLowerCase(),
            vehicleType: driver.vehicleType,
            routeNumber: driver.routeNumber,
            vehicleNumber: driver.vehicleNumber,
            vehicleModel: driver.vehicleModel,
            location: driver.currentLocation || { lat: 28.6129, lng: 77.2295 },
            heading: driver.heading || 0,
            speedKmh: driver.speedKmh || 0,
            availableSeats: driver.availableSeats,
            totalSeats: driver.totalSeats,
            nextStop: driver.nextStop,
            crowdDensity: driver.crowdDensity
          });
          io.emit('vehicle:updated', v);
        }
      }
      io.emit('driver:status_broadcast', { driverId, isOnline, currentStatus });
    }
  });

  // Passenger Route Subscription
  socket.on('passenger:subscribe_route', (routeNumber) => {
    socket.join(`route:${routeNumber}`);
  });

  socket.on('passenger:unsubscribe_route', (routeNumber) => {
    socket.leave(`route:${routeNumber}`);
  });

  // Emergency SOS Real-Time Alert
  socket.on('sos:trigger', (sosData) => {
    io.emit('sos:broadcast', {
      ...sosData,
      alertId: 'sos_' + Date.now(),
      broadcastTime: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MyRoute Real Transit Server running on http://localhost:${PORT}`);
  console.log(`📡 Real-Time Driver Broadcast Engine Active (Zero Mock Drivers)`);
});
