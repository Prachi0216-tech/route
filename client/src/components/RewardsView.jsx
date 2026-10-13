import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Award, 
  Gift, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function RewardsView({ onOpenAuth }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { isDark } = useTheme();

  const [wallet, setWallet] = useState(null);
  const [redeemedCode, setRedeemedCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getWallet();
      setWallet(res);
    } catch (err) {
      console.error('Error loading wallet:', err);
    }
  };

  const handleRedeem = async (catalogItem) => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setLoading(true);
    try {
      const res = await api.redeemReward({
        rewardId: catalogItem.id,
        pointsCost: catalogItem.pointsCost,
        title: catalogItem.title
      });
      if (res.couponCode) {
        setRedeemedCode({
          code: res.couponCode,
          item: catalogItem
        });
        loadWallet();
        refreshUser();
      }
    } catch (err) {
      console.error('Error redeeming:', err);
    }
    setLoading(false);
  };

  const handleCopyCode = () => {
    if (redeemedCode?.code) {
      navigator.clipboard.writeText(redeemedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const points = user?.rewardPoints || 0;

  return (
    <div className={`max-w-5xl mx-auto px-4 py-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Wallet Balance Hero */}
      <div className={`border rounded-2xl p-6 shadow-xl ${
        isDark 
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border-emerald-500/30' 
          : 'bg-gradient-to-r from-emerald-100 via-white to-indigo-50 border-emerald-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Crowd-Sourced Transit Rewards Wallet</span>
            </div>
            <h2 className="text-2xl font-black">
              Your Commuter Points & Badges
            </h2>
            <p className={`text-xs mt-1 max-w-lg ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Earn reward points by submitting actual fares paid and verifying route delays. Redeem points for transit rebates and discount passes!
            </p>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center space-x-4 shadow-xl ${
            isDark ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-white border-emerald-300'
          }`}>
            <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl">
              <Coins className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Available Points</div>
              <div className="text-3xl font-black text-emerald-500">{points} <span className="text-sm font-bold opacity-70">PTS</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className={`border rounded-2xl p-5 shadow-xl ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Earned Commuter Badges</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {user?.badges?.map((badge, idx) => (
            <span
              key={idx}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                isDark ? 'bg-slate-800 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {badge}
            </span>
          )) || (
            <span className="text-xs text-slate-400">Sign in to view badges</span>
          )}
        </div>
      </div>

      {/* Redeemed Code Dialog Notice */}
      {redeemedCode && (
        <div className="p-5 bg-emerald-950/70 border-2 border-emerald-500 rounded-2xl text-white animate-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Reward Voucher Generated!</span>
            </div>
            <button
              onClick={() => setRedeemedCode(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-200">
            You successfully claimed: <strong>{redeemedCode.item.title}</strong>
          </p>
          <div className="flex items-center space-x-3 p-3 bg-slate-900 rounded-xl border border-emerald-500/30">
            <span className="font-mono text-lg font-black text-emerald-300 tracking-wider">
              {redeemedCode.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Catalog & Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Rewards Catalog */}
        <div className="md:col-span-7 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Gift className="w-4 h-4 text-sky-500" />
            <span>Redeem Points for Commuter Perks</span>
          </h3>

          <div className="space-y-3">
            {wallet?.catalog?.map((item) => {
              const canAfford = points >= item.pointsCost;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1 max-w-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold">{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-500 font-bold border border-sky-500/30">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>

                  <button
                    onClick={() => handleRedeem(item)}
                    disabled={!canAfford || loading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow ${
                      canAfford
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <span>{item.pointsCost} Pts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Points History */}
        <div className="md:col-span-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>Points Activity Log</span>
          </h3>

          <div className={`border rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {wallet?.transactions?.length > 0 ? (
              wallet.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{tx.reason}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`font-black ${tx.points > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.points > 0 ? `+${tx.points}` : tx.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No transactions yet. Submit a fare report to earn your first +25 points!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
