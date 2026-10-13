import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    // Check if app is already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback instructions for iOS Safari or browsers without beforeinstallprompt
      alert("To install on iOS / Android:\n1. Tap the Share or 3-dots Menu button in your browser.\n2. Select 'Add to Home Screen' (होम स्क्रीन पर जोड़ें).\n3. Open MyRoute directly as a native App!");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className={`fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 p-3 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-300 ${
      isDark 
        ? 'bg-slate-900/95 border-sky-500/40 text-white shadow-sky-950/30' 
        : 'bg-white/95 border-sky-400 text-slate-900 shadow-slate-400/20'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black tracking-tight flex items-center gap-1.5">
              <span>Install MyRoute Mobile App</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500 text-white uppercase">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 truncate">
              Fast GPS tracking, offline access & live alerts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-md shadow-sky-600/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
            title="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
