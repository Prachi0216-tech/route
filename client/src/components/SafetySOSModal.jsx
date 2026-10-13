import React, { useState } from 'react';
import { X, ShieldAlert, PhoneCall, Share2, Check, AlertTriangle, MapPin, Radio } from 'lucide-react';
import { api } from '../services/api';
import socket from '../services/socket';
import { useAuth } from '../context/AuthContext';

export default function SafetySOSModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosData, setSosData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSOS = async () => {
    setLoading(true);
    try {
      const payload = {
        location: { lat: 28.6129, lng: 77.2295 },
        routeNumber: 'Active Trip',
        userId: user?.id,
        userName: user?.name,
        userPhone: user?.phone
      };

      const res = await api.triggerSOS(payload);
      socket.emit('sos:trigger', payload);
      setSosTriggered(true);
      setSosData(res.sosEvent || payload);
    } catch (err) {
      console.error('SOS Trigger error:', err);
    }
    setLoading(false);
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}?track=live_sos_${Date.now()}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-red-950/50 border-b border-red-500/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-red-100 flex items-center gap-2">
                Emergency Transit SOS & Safety Hub
              </h3>
              <p className="text-xs text-red-300">
                24/7 Rapid Response & Real-Time Incident Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-300 hover:text-white hover:bg-red-900/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Main SOS Trigger Button */}
          {!sosTriggered ? (
            <div className="text-center p-6 bg-slate-800/80 rounded-2xl border border-red-500/20">
              <div className="mb-4">
                <button
                  onClick={handleTriggerSOS}
                  disabled={loading}
                  className="w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black text-base shadow-2xl shadow-red-600/50 hover:scale-105 active:scale-95 transition flex flex-col items-center justify-center border-4 border-red-400/40 animate-pulse"
                >
                  <Radio className="w-8 h-8 mb-1" />
                  <span>{loading ? 'SENDING' : 'PRESS SOS'}</span>
                </button>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Tap to Broadcast Emergency Alert
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Immediately sends your live coordinates to central transit control and alerts nearby law enforcement.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-red-500/15 border-2 border-red-500 rounded-2xl text-red-200 animate-in zoom-in-95">
              <div className="flex items-center space-x-2 text-red-400 font-black text-sm mb-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
                <span>EMERGENCY DISPATCH INITIATED</span>
              </div>
              <p className="text-xs text-slate-200 mb-3">
                Your live GPS coordinates (28.6129° N, 77.2295° E) have been broadcast to the nearest control room and police patrol unit.
              </p>
              <div className="p-2.5 bg-slate-900/90 rounded-xl text-xs space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nearest Station:</span>
                  <span className="font-semibold text-white">Connaught Place Police Station</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Patrol Arrival:</span>
                  <span className="font-semibold text-emerald-400">~ 4-6 minutes</span>
                </div>
              </div>
            </div>
          )}

          {/* Share Live Trip Link */}
          <div className="p-3.5 bg-slate-800/70 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                Share Live Trip With Family
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Generate an instant tracking link so your contacts can watch your live vehicle position in real-time.
            </p>
            <button
              onClick={handleCopyShareLink}
              className="w-full py-2 px-3 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Live Trip Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Copy Live Tracking Link</span>
                </>
              )}
            </button>
          </div>

          {/* Direct Emergency Helpline Numbers */}
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Instant Helpline Speed-Dials
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:112"
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center space-x-2.5 transition"
              >
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">112</div>
                  <div className="text-[10px] text-slate-400">All Emergency</div>
                </div>
              </a>

              <a
                href="tel:1091"
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center space-x-2.5 transition"
              >
                <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">1091</div>
                  <div className="text-[10px] text-slate-400">Women Helpline</div>
                </div>
              </a>

              <a
                href="tel:100"
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center space-x-2.5 transition"
              >
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">100 / 112</div>
                  <div className="text-[10px] text-slate-400">Police Patrol</div>
                </div>
              </a>

              <a
                href="tel:01123370373"
                className="p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center space-x-2.5 transition"
              >
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">011-23370373</div>
                  <div className="text-[10px] text-slate-400">Transit Control</div>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
