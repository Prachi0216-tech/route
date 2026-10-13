import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Copy, 
  Zap, 
  X, 
  Check, 
  Bell, 
  Smartphone,
  Sparkles
} from 'lucide-react';

export default function PhoneNotificationToast({ notification, onClose, onAutoFill }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!notification) return;

    // Trigger browser Web Notification if supported and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title || 'MyRoute Verification OTP', {
          body: notification.body || `Your verification code is ${notification.otpCode}`,
          icon: '/favicon.ico'
        });
      } catch (e) {}
    } else if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {}
    }

    // Auto dismiss after 14 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 14000);

    return () => clearTimeout(timer);
  }, [notification]);

  if (!notification) return null;

  const isSMS = notification.type === 'SMS';
  const isEmail = notification.type === 'EMAIL';
  const isAadhaar = notification.type === 'AADHAAR';

  const handleCopy = () => {
    if (notification.otpCode) {
      navigator.clipboard.writeText(notification.otpCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[94%] sm:w-full animate-in slide-in-from-top-6 duration-300">
      
      {/* Smartphone Floating Push Notification Card */}
      <div className={`p-4 rounded-3xl shadow-2xl border backdrop-blur-xl transition-all ${
        isAadhaar
          ? 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/40 ring-2 ring-emerald-500/20'
          : isSMS
          ? 'bg-slate-900/95 text-white border-amber-500/50 shadow-amber-950/40 ring-2 ring-amber-500/20'
          : 'bg-slate-900/95 text-white border-sky-500/50 shadow-sky-950/40 ring-2 ring-sky-500/20'
      }`}>
        
        {/* Top Status Line */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg ${
              isAadhaar ? 'bg-emerald-500 text-slate-950' : isSMS ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-white'
            }`}>
              {isAadhaar ? <Sparkles className="w-3.5 h-3.5" /> : isSMS ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            </div>
            <span className="font-bold uppercase tracking-wider text-slate-300">
              {isAadhaar ? 'UIDAI (Aadhaar Gov) • OTP' : isSMS ? 'Messages (SMS) • VK-MYROUT' : 'Gmail • MyRoute Transit'}
            </span>
            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">now</span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Content */}
        <div className="space-y-2">
          <div className="text-xs font-semibold leading-relaxed text-slate-100">
            {isAadhaar ? (
              <span>
                <strong className="text-emerald-400 font-bold">{notification.otpCode}</strong> is your UIDAI Aadhaar verification OTP for Driver Onboarding. Valid for 10 mins.
              </span>
            ) : isSMS ? (
              <span>
                <strong className="text-amber-400 font-bold">{notification.otpCode}</strong> is your MyRoute Phone verification OTP. Valid for 10 mins. Do not share with anyone.
              </span>
            ) : (
              <span>
                Your MyRoute Email Verification Code is <strong className="text-sky-400 font-bold">{notification.otpCode}</strong>. Use this code to complete registration.
              </span>
            )}
          </div>

          {/* Action Buttons: Auto-Fill & Copy */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>

            {onAutoFill && (
              <button
                onClick={() => {
                  onAutoFill(notification.otpCode, notification.type);
                  onClose();
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-lg transition transform active:scale-95 ${
                  isSMS 
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25' 
                    : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/25'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Auto-Fill OTP</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
