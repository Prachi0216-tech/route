import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  IndianRupee, 
  Moon, 
  Sun, 
  ThumbsUp, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  TrendingUp,
  Coins
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { useTheme } from '../context/ThemeContext';

export default function FareCalculator({ onOpenAuth }) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { currentCity, activeCityConfig } = useCity();
  const { isDark } = useTheme();

  const [distanceKm, setDistanceKm] = useState(8);
  const [isNight, setIsNight] = useState(false);
  const [fareEstimate, setFareEstimate] = useState(null);
  
  const [fareReports, setFareReports] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newReport, setNewReport] = useState({
    fromStop: '',
    toStop: '',
    mode: 'BUS_252',
    reportedFare: '',
    notes: ''
  });
  const [reportSuccessMsg, setReportSuccessMsg] = useState('');

  useEffect(() => {
    fetchEstimates(distanceKm, isNight);
    loadFareReports();
  }, [currentCity]);

  const fetchEstimates = async (dist, night) => {
    try {
      const res = await api.calculateFare(dist, night, currentCity);
      setFareEstimate(res.estimates);
    } catch (err) {
      console.error('Error fetching estimates:', err);
    }
  };

  const loadFareReports = async () => {
    try {
      const res = await api.getFareReports(currentCity);
      if (res && res.reports) setFareReports(res.reports);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const handleDistanceChange = (val) => {
    setDistanceKm(val);
    fetchEstimates(val, isNight);
  };

  const handleNightToggle = () => {
    const nextNight = !isNight;
    setIsNight(nextNight);
    fetchEstimates(distanceKm, nextNight);
  };

  const handleUpvote = async (id) => {
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    try {
      await api.upvoteFareReport(id);
      loadFareReports();
      refreshUser();
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    try {
      const res = await api.submitFareReport({ ...newReport, city: currentCity });
      setReportSuccessMsg(res.message || 'Fare reported! +25 Points added to your wallet.');
      setShowReportModal(false);
      setNewReport({ fromStop: '', toStop: '', mode: 'BUS_252', reportedFare: '', notes: '' });
      loadFareReports();
      refreshUser();
      setTimeout(() => setReportSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error submitting fare:', err);
    }
  };

  return (
    <div className={`max-w-6xl mx-auto px-4 py-6 space-y-8 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Hero Banner */}
      <div className={`border rounded-2xl p-6 shadow-xl ${
        isDark 
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-sky-950/40 border-amber-500/30' 
          : 'bg-gradient-to-r from-amber-100 via-white to-sky-50 border-amber-300'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Calculator className="w-4 h-4" />
              <span>{activeCityConfig.name} Regulated Fares & Crowdsourcing</span>
            </div>
            <h2 className="text-2xl font-black">
              Official Tariff Estimator & Ground Truth Verifier
            </h2>
            <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Calculate official bus and auto fares accurately. Report what you actually paid to earn reward points and keep transport transparent for the city!
            </p>
          </div>

          <button
            onClick={() => setShowReportModal(true)}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 transition whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Actual Fare (+25 Pts)</span>
          </button>
        </div>
      </div>

      {reportSuccessMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4" />
          <span>{reportSuccessMsg}</span>
        </div>
      )}

      {/* Dynamic Interactive Calculator */}
      <div className={`border rounded-2xl p-6 shadow-xl ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h3 className="text-base font-black mb-4 flex items-center justify-between">
          <span>Live Fare Matrix Estimator ({activeCityConfig.name})</span>
          <button
            onClick={handleNightToggle}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              isNight
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>Night Tariff (11PM-5AM): {isNight ? 'ON (+25%)' : 'OFF'}</span>
          </button>
        </h3>

        {/* Distance Slider */}
        <div className={`mb-6 p-4 rounded-xl border ${
          isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-400">
              Trip Distance: <strong className="text-sky-500 text-base">{distanceKm} km</strong>
            </label>
            <span className="text-[11px] text-slate-400">Regulated City Distance Scale</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={distanceKm}
            onChange={(e) => handleDistanceChange(Number(e.target.value))}
            className="w-full accent-sky-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>1 km (Local)</span>
            <span>10 km (Cross-city)</span>
            <span>20 km</span>
            <span>30 km (Suburban)</span>
          </div>
        </div>

        {/* Fares Cards Grid */}
        {fareEstimate && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Standard Bus */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-800/80 border-sky-500/30' : 'bg-sky-50/60 border-sky-200'
            }`}>
              <div className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">
                Standard Non-AC Bus
              </div>
              <div className="text-3xl font-black mb-1">
                ₹{fareEstimate.bus.estimatedFare}
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                City state transport slab. AC Bus: ₹{fareEstimate.bus.acBusFare}
              </p>
              <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2">
                Base fare ₹{fareEstimate.bus.baseFare} • Max ₹{fareEstimate.bus.maxFare}
              </div>
            </div>

            {/* Auto Rickshaw Meter */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-800/80 border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
            }`}>
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">
                Auto Rickshaw (Metered)
              </div>
              <div className="text-3xl font-black text-amber-500 mb-1">
                ₹{fareEstimate.auto.estimatedFare}
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                {fareEstimate.auto.notes}
              </p>
              <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2">
                First 1.5 km: ₹25 • Then ₹9.50/km
              </div>
            </div>

            {/* Shared Auto / Metro Feeder */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-800/80 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">
                Shared Auto / Shuttle
              </div>
              <div className="text-3xl font-black text-emerald-500 mb-1">
                ₹{fareEstimate.auto.sharedAutoFare}
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Fixed seat-share point to point
              </p>
              <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-2">
                Standard ₹15-₹30 per seat
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Crowd-Sourced Real Fares Directory */}
      <div className={`border rounded-2xl p-6 shadow-xl space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Crowd-Sourced Real Commuter Fares ({activeCityConfig.name})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Verified ground-truth prices submitted by commuters
            </p>
          </div>
          <div className="text-xs text-emerald-500 font-semibold hidden sm:flex items-center gap-1">
            <Coins className="w-3.5 h-3.5" />
            <span>Upvote reports to earn +5 pts</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fareReports.map((report) => (
            <div
              key={report.id}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                isDark ? 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-500 border border-sky-500/30">
                    {report.mode}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-xs font-bold mb-1">
                  {report.fromStop} ➔ {report.toStop}
                </div>

                <div className="flex items-baseline space-x-2 my-2">
                  <span className="text-xl font-black text-amber-500">₹{report.reportedFare}</span>
                  {report.standardFare && (
                    <span className="text-[11px] text-slate-400 line-through">
                      Std: ₹{report.standardFare}
                    </span>
                  )}
                </div>

                {report.notes && (
                  <p className="text-[11px] text-slate-400 italic mb-2">"{report.notes}"</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-700/60 pt-2 mt-2">
                <span className="text-[10px] text-slate-400">By {report.userName}</span>
                <button
                  onClick={() => handleUpvote(report.id)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-sky-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-sky-600'
                  }`}
                  title="Verify this fare and earn +5 points"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{report.upvotes || 0}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <span>Submit Actual Fare Paid ({activeCityConfig.name})</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">From Location / Stop</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Connaught Place"
                  value={newReport.fromStop}
                  onChange={(e) => setNewReport({ ...newReport, fromStop: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">To Location / Destination</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saket District Centre"
                  value={newReport.toStop}
                  onChange={(e) => setNewReport({ ...newReport, toStop: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Mode of Transport</label>
                  <select
                    value={newReport.mode}
                    onChange={(e) => setNewReport({ ...newReport, mode: e.target.value })}
                    className={`w-full px-2 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="BUS">City Bus</option>
                    <option value="AUTO">Auto Rickshaw</option>
                    <option value="SHARED_AUTO">Shared Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fare Paid (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15"
                    value={newReport.reportedFare}
                    onChange={(e) => setNewReport({ ...newReport, reportedFare: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Optional Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Regular meter fare, smooth ride"
                  value={newReport.notes}
                  onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/25 transition mt-2"
              >
                Submit Fare & Earn +25 Points
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
