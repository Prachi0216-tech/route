const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('./auth');

// Calculate Fare Estimate based on distance
router.post('/calculate', (req, res) => {
  const { distanceKm, isNight = false, vehicleType = 'ALL' } = req.body;
  const dist = parseFloat(distanceKm) || 5;

  const estimates = {
    bus: {
      mode: 'Standard Non-AC Bus',
      baseFare: 5,
      minFare: 5,
      maxFare: 15,
      estimatedFare: dist <= 4 ? 5 : dist <= 10 ? 10 : 15,
      acBusFare: dist <= 4 ? 10 : dist <= 8 ? 15 : dist <= 12 ? 20 : 25,
      notes: 'Standard DTC / Cluster fare rules apply'
    },
    auto: {
      mode: 'Auto Rickshaw (Meter Fare)',
      baseFare: 25, // First 1.5 km
      perKm: 9.5,
      nightSurchargePct: isNight ? 25 : 0,
      estimatedFare: Math.round((25 + Math.max(0, dist - 1.5) * 9.5) * (isNight ? 1.25 : 1)),
      sharedAutoFare: Math.round(Math.min(30, Math.max(15, dist * 3.5))),
      notes: isNight ? 'Includes 25% night surcharge (11 PM - 5 AM)' : 'Regulated meter tariff'
    },
    metroConnector: {
      mode: 'Metro Feeder / Shuttle Bus',
      estimatedFare: dist <= 3 ? 5 : dist <= 8 ? 10 : 15,
      notes: 'Integrated smart card discount eligible'
    }
  };

  res.json({
    distanceKm: dist,
    isNight,
    estimates
  });
});

// Get Crowd-sourced Fare Reports
router.get('/reports', (req, res) => {
  const reports = db.getFareReports();
  res.json({ reports });
});

// Submit a new crowd-sourced fare report (awards reward points!)
router.post('/report', authenticateToken, (req, res) => {
  const { fromStop, toStop, mode, reportedFare, standardFare, notes } = req.body;

  if (!fromStop || !toStop || !reportedFare) {
    return res.status(400).json({ error: 'Please provide from, to, and reported fare' });
  }

  const newReport = {
    id: 'fare_' + uuidv4().slice(0, 8),
    userId: req.user.id,
    userName: req.user.name || 'Anonymous Commuter',
    fromStop,
    toStop,
    mode: mode || 'BUS',
    reportedFare: parseFloat(reportedFare),
    standardFare: parseFloat(standardFare) || parseFloat(reportedFare),
    notes: notes || '',
    isPeakHour: new Date().getHours() >= 8 && new Date().getHours() <= 11,
    timestamp: new Date().toISOString(),
    upvotes: 1,
    verified: false
  };

  db.addFareReport(newReport);

  // Award 25 reward points to user!
  const rewardTx = {
    id: 'rwd_' + uuidv4().slice(0, 8),
    userId: req.user.id,
    points: 25,
    reason: `Crowd-sourced fare report submitted for ${fromStop} -> ${toStop}`,
    date: new Date().toISOString()
  };
  db.addRewardTransaction(rewardTx);

  res.json({
    message: 'Fare report submitted! You earned +25 Reward Points 🎉',
    report: newReport,
    pointsAwarded: 25
  });
});

// Upvote / Verify a crowd-sourced fare report
router.post('/upvote/:id', authenticateToken, (req, res) => {
  const report = db.upvoteFareReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Fare report not found' });
  }

  // Award 5 verification points
  const rewardTx = {
    id: 'rwd_' + uuidv4().slice(0, 8),
    userId: req.user.id,
    points: 5,
    reason: `Verified fare report #${req.params.id.slice(0, 6)}`,
    date: new Date().toISOString()
  };
  db.addRewardTransaction(rewardTx);

  res.json({
    message: 'Thank you for verifying! You earned +5 points.',
    report
  });
});

module.exports = router;
