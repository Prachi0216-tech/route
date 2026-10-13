const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('./auth');

// Get current user rewards & transactions
router.get('/wallet', authenticateToken, (req, res) => {
  const user = db.data.users.find(u => u.id === req.user.id);
  const transactions = db.getUserRewards(req.user.id);

  const availableCatalog = [
    {
      id: 'voucher_10',
      title: '₹10 Bus Pass Rebate Voucher',
      pointsCost: 50,
      description: 'Redeemable on DTC and state transport smart passes.',
      badge: 'Popular'
    },
    {
      id: 'voucher_25',
      title: '₹25 Auto Ride Discount Coupon',
      pointsCost: 100,
      description: 'Get ₹25 off on verified metered auto rides in city network.',
      badge: 'Best Value'
    },
    {
      id: 'voucher_pass',
      title: 'Free 1-Day Unlimited Transit Pass',
      pointsCost: 200,
      description: 'Unlimited free travel across all city AC & Non-AC buses for 1 day.',
      badge: 'Super Saver'
    },
    {
      id: 'badge_green',
      title: 'Green Commuter Certified Badge',
      pointsCost: 75,
      description: 'Special commuter status badge with 2x point multiplier on reports.',
      badge: 'Badge'
    }
  ];

  res.json({
    rewardPoints: user ? user.rewardPoints || 0 : 0,
    badges: user ? user.badges || [] : [],
    transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
    catalog: availableCatalog
  });
});

// Redeem reward item
router.post('/redeem', authenticateToken, (req, res) => {
  const { rewardId, pointsCost, title } = req.body;
  const user = db.data.users.find(u => u.id === req.user.id);

  if (!user || (user.rewardPoints || 0) < pointsCost) {
    return res.status(400).json({ error: 'Insufficient reward points to redeem this item' });
  }

  // Deduct points
  const deductionTx = {
    id: 'rwd_' + uuidv4().slice(0, 8),
    userId: req.user.id,
    points: -Math.abs(pointsCost),
    reason: `Redeemed: ${title}`,
    date: new Date().toISOString()
  };

  db.addRewardTransaction(deductionTx);

  const couponCode = 'MYROUTE-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  res.json({
    message: 'Reward redeemed successfully! Your promo coupon code is generated.',
    couponCode,
    remainingPoints: user.rewardPoints
  });
});

module.exports = router;
