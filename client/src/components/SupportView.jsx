import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  PhoneCall, 
  FileQuestion, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Inbox
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { useTheme } from '../context/ThemeContext';

export default function SupportView({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const { currentCity, activeCityConfig } = useCity();
  const { isDark } = useTheme();

  const [faqs, setFaqs] = useState([]);
  const [helplines, setHelplines] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(0);

  const [formData, setFormData] = useState({
    subject: '',
    category: 'Lost & Found',
    routeNumber: '252',
    vehicleNumber: '',
    priority: 'Normal',
    message: ''
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSupportData();
  }, [user, currentCity]);

  const loadSupportData = async () => {
    try {
      const infoRes = await api.getSupportInfo();
      if (infoRes.faqs) setFaqs(infoRes.faqs);
      if (infoRes.helplines) setHelplines(infoRes.helplines);

      if (isAuthenticated) {
        const ticketRes = await api.getTickets();
        if (ticketRes.tickets) setTickets(ticketRes.tickets);
      }
    } catch (err) {
      console.error('Error loading support info:', err);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onOpenAuth();
      return;
    }
    setLoading(true);
    try {
      const res = await api.submitTicket(formData);
      setSuccessMsg('Ticket submitted successfully! Transit desk will review it.');
      setFormData({
        subject: '',
        category: 'Lost & Found',
        routeNumber: '252',
        vehicleNumber: '',
        priority: 'Normal',
        message: ''
      });
      loadSupportData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error submitting ticket:', err);
    }
    setLoading(false);
  };

  return (
    <div className={`max-w-5xl mx-auto px-4 py-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Hero Header */}
      <div className={`border rounded-2xl p-6 shadow-xl ${
        isDark 
          ? 'bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border-sky-500/30' 
          : 'bg-gradient-to-r from-sky-100 via-white to-indigo-50 border-sky-300'
      }`}>
        <div className="flex items-center space-x-2 text-sky-500 text-xs font-bold uppercase tracking-wider mb-1">
          <HelpCircle className="w-4 h-4" />
          <span>24/7 Commuter & Driver Assistance • {activeCityConfig.name}</span>
        </div>
        <h2 className="text-2xl font-black">
          Help Desk, FAQs & Lost and Found
        </h2>
        <p className={`text-xs mt-1 max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Need assistance with your route, lost belongings on a bus or auto, or have service feedback? Our transit desk is here to help.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: FAQs & Helplines */}
        <div className="md:col-span-7 space-y-6">
          
          {/* FAQ Accordion */}
          <div className={`border rounded-2xl p-5 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-sky-500" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl overflow-hidden ${
                    isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? -1 : idx)}
                    className="w-full p-3.5 text-left text-xs font-bold flex items-center justify-between"
                  >
                    <span>{faq.q}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-sky-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className={`p-3.5 pt-0 text-xs border-t leading-relaxed ${
                      isDark ? 'border-slate-800/60 bg-slate-900/50 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
                    }`}>
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Helplines List */}
          <div className={`border rounded-2xl p-5 shadow-xl space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-500" />
              <span>Transit & Emergency Helplines</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {helplines.map((line, idx) => (
                <a
                  key={idx}
                  href={`tel:${line.number}`}
                  className={`p-3 border rounded-xl flex items-center justify-between group transition ${
                    isDark ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold group-hover:text-emerald-500">
                      {line.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{line.type}</div>
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-500">
                    {line.number}
                  </span>
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Ticket Form & My Tickets */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Submit Ticket Form */}
          <div className={`border rounded-2xl p-5 shadow-xl space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <span>Submit Request / Report</span>
            </h3>

            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject / Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Left bag on Bus"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`w-full px-2 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Lost & Found">Lost & Found</option>
                    <option value="Transit Feedback">Transit Feedback</option>
                    <option value="Driver Rating">Driver Feedback</option>
                    <option value="Fare Dispute">Fare Dispute</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Route No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 252, 212"
                    value={formData.routeNumber}
                    onChange={(e) => setFormData({ ...formData, routeNumber: e.target.value })}
                    className={`w-full px-2 py-2 rounded-xl text-xs border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Description / Details</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe what happened, timestamp, or lost item details..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-sky-600/25 transition flex items-center justify-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </form>
          </div>

          {/* User's Previous Logged Tickets */}
          <div className={`border rounded-2xl p-5 shadow-xl space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5 text-indigo-500" />
              <span>Your Support Requests ({tickets.length})</span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tickets.length > 0 ? (
                tickets.map((tkt) => (
                  <div key={tkt.id} className={`p-3 rounded-xl border text-xs space-y-1 ${
                    isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{tkt.subject}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        tkt.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {tkt.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{tkt.message}</p>
                    {tkt.reply && (
                      <div className={`p-2 rounded-lg text-[11px] border mt-1 ${
                        isDark ? 'bg-slate-900/90 border-sky-500/20 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-800'
                      }`}>
                        <strong>Transit Desk Reply:</strong> {tkt.reply}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                  No previous tickets found.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
