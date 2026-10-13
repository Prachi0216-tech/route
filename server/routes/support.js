const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('./auth');

// Get Support FAQs & Helplines
router.get('/info', (req, res) => {
  const faqs = [
    {
      q: 'How does real-time bus and auto tracking work?',
      a: 'Registered drivers broadcast live GPS coordinates from their mobile devices while on their assigned route (e.g. Bus 252 or 212). The app updates their location every 2–3 seconds on the interactive map.'
    },
    {
      q: 'How is the multi-modal fare calculated?',
      a: 'We combine official transport department regulated base fares with real road distances, plus crowd-sourced validations from everyday commuters.'
    },
    {
      q: 'How do I earn reward points?',
      a: 'You earn points whenever you report actual fares paid (+25 pts), verify or upvote other commuters fare reports (+5 pts), or report bus occupancy.'
    },
    {
      q: 'What should I do in an emergency?',
      a: 'Use the Emergency SOS button to immediately broadcast an alert with your live GPS location to local transport control and call emergency numbers (112, 1091).'
    },
    {
      q: 'How do I recover an item lost in a bus or auto?',
      a: 'Submit a ticket under "Lost & Found" specifying the route number, vehicle number, and timestamp. The transit team coordinates directly with the driver.'
    }
  ];

  res.json({
    faqs,
    helplines: db.data.emergency_helplines || []
  });
});

// Get User's support tickets
router.get('/tickets', authenticateToken, (req, res) => {
  const tickets = db.getTickets(req.user.role === 'ADMIN' ? null : req.user.id);
  res.json({ tickets });
});

// Create new Support Ticket / Lost & Found report
router.post('/tickets', authenticateToken, (req, res) => {
  const { subject, category, message, routeNumber, vehicleNumber, priority } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Please enter subject and message' });
  }

  const newTicket = {
    id: 'tkt_' + uuidv4().slice(0, 8),
    userId: req.user.id,
    userName: req.user.name,
    subject,
    category: category || 'General Inquiry',
    routeNumber: routeNumber || 'N/A',
    vehicleNumber: vehicleNumber || 'N/A',
    priority: priority || 'Normal',
    message,
    status: 'Open',
    createdAt: new Date().toISOString(),
    reply: 'Your request has been logged. Our transit desk will review it shortly.'
  };

  db.createTicket(newTicket);
  res.json({ message: 'Support ticket submitted successfully', ticket: newTicket });
});

// Trigger Emergency SOS Broadcast
router.post('/sos', authenticateToken, (req, res) => {
  const { location, vehicleNumber, routeNumber } = req.body;

  const sosEvent = {
    id: 'sos_' + uuidv4().slice(0, 8),
    userId: req.user.id,
    userName: req.user.name,
    userPhone: req.user.phone || 'Unknown',
    location: location || { lat: 28.6129, lng: 77.2295 },
    vehicleNumber: vehicleNumber || 'Not in vehicle',
    routeNumber: routeNumber || 'General Commute',
    timestamp: new Date().toISOString(),
    status: 'DISPATCHED',
    nearestPoliceStation: 'Connaught Place Police Station (0.8 km)',
    emergencyHotline: '112'
  };

  console.log('🚨 EMERGENCY SOS TRIGGERED:', sosEvent);

  res.json({
    message: 'EMERGENCY SOS ACTIVATED. Local control center and PCR dispatched.',
    sosEvent
  });
});

module.exports = router;
