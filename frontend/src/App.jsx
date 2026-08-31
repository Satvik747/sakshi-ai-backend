import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { AlertTriangle, Copy, Activity, ShieldCheck, Server, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function App() {
  const [anomalies, setAnomalies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendUp, setBackendUp] = useState(true);
  const [view, setView] = useState('ministry'); // ministry | district | mp
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anomaliesRes, duplicatesRes, segmentsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/anomalies`),
          axios.get(`${API_BASE}/api/duplicates`),
          axios.get(`${API_BASE}/api/mp-segments`)
        ]);
        setAnomalies(anomaliesRes.data);
        setDuplicates(duplicatesRes.data);
        setSegments(segmentsRes.data);
      } catch (error) {
        console.error('Error fetching data from backend:', error);
        setBackendUp(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const districtSummary = useMemo(() => {
    const map = {};
    anomalies.forEach((a) => {
      const ida = a.IDA || 'Unknown';
      if (!map[ida]) map[ida] = { IDA: ida, count: 0, total: 0 };
      map[ida].count += 1;
      map[ida].total += Number(a['Expenditure Amount (₹)']) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [anomalies]);

  const filteredMpAnomalies = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return anomalies.filter((a) => (a.Normalized_MP_Name || '').toLowerCase().includes(q));
  }, [anomalies, search]);

  const filteredMpDuplicates = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return duplicates.filter((d) => (d.MP_Name || '').toLowerCase().includes(q));
  }, [duplicates, search]);

  const filteredMpSegment = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return segments.find((s) => (s.Normalized_MP_Name || '').toLowerCase().includes(q));
  }, [segments, search]);
  const downloadCSV = () => {
  const rows = anomalies.slice().sort((a, b) => (b['Expenditure Amount (₹)'] || 0) - (a['Expenditure Amount (₹)'] || 0));
  const header = ['MP Name', 'Vendor', 'IDA', 'Amount', 'Status', 'Reason'];
  const csv = [header.join(',')].concat(
    rows.map(r => [r['MP Name'], r.Vendor, r.IDA, r['Expenditure Amount (₹)'], r['Payment Status'], r.Flag_Reason].map(v => `"${v ?? ''}"`).join(','))
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'flagged_anomalies.csv'; a.click();
};

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-navy text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold mb-4"></div>
        <p className="text-xl font-semibold tracking-wide font-heading">Initializing SAKSHI-AI Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-slate-800">
      <nav className="bg-navy text-white px-8 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gold rounded-lg">
            <ShieldCheck size={24} className="text-navy" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-heading">SAKSHI-AI</h1>
            <p className="text-xs text-slate-300">Autonomous MP Fund Utilization & Fraud Auditing System</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm bg-navy-light px-4 py-2 rounded-full border border-white/10">
          <span className={`flex items-center font-medium ${backendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${backendUp ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            {backendUp ? 'System Online' : 'Backend Unreachable'}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 flex items-center"><Server size={14} className="mr-1" /> FastAPI v1.0</span>
        </div>
      </nav>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-navy font-heading">Executive Audit Overview</h2>
            <p className="text-slate-500 text-sm mt-1">Real-time anomaly metrics and semantic fraud detection across parliamentary constituencies.</p>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            {['ministry', 'district', 'mp'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md capitalize transition-colors ${
                  view === v ? 'bg-navy text-white' : 'text-slate-500 hover:text-navy'
                }`}
              >
                {v === 'mp' ? 'MP View' : `${v} View`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border-t-4 border-rose-500 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">High-Risk Anomalies</p>
            <p className="text-3xl font-extrabold text-rose-600 mt-2 font-heading">{anomalies.length}</p>
            <p className="text-xs text-slate-500 mt-1">Top 1% Isolation Forest outliers (amount, vendor frequency, district baseline)</p>
          </div>
          <div className="bg-white p-6 rounded-lg border-t-4 border-amber-500 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disguised Duplicates</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-2 font-heading">{duplicates.length}</p>
            <p className="text-xs text-slate-500 mt-1">TF-IDF semantic similarity &gt; 85%</p>
          </div>
          <div className="bg-white p-6 rounded-lg border-t-4 border-navy shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Constituencies Tracked</p>
            <p className="text-3xl font-extrabold text-navy mt-2 font-heading">{segments.length}</p>
            <p className="text-xs text-slate-500 mt-1">K-Means clustered segments</p>
          </div>
        </div>

        {view === 'ministry' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-bold text-navy font-heading mb-4 flex items-center">
                <Copy className="mr-2 text-amber-600" size={18} /> Disguised Project Duplicates
              </h3>
              <div className="overflow-auto max-h-[380px] border border-slate-100 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-3 font-semibold text-slate-600">MP Name</th>
                      <th className="p-3 font-semibold text-slate-600">Match</th>
                      <th className="p-3 font-semibold text-slate-600">Work Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {duplicates.map((dup, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-medium text-slate-900 capitalize">{dup.MP_Name}</td>
                        <td className="p-3 text-rose-600 font-bold">{dup['Similarity_Score_%']}%</td>
                        <td className="p-3 text-slate-600 truncate max-w-xs" title={dup.Work_A}>{dup.Work_A}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="text-lg font-bold text-navy font-heading mb-4 flex items-center">
                <Activity className="mr-2 text-navy" size={18} /> MP Fund Utilization Pacing
              </h3>
              <div className="h-[380px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segments.slice(0, 15)} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="Normalized_MP_Name" angle={-35} textAnchor="end" height={50} tick={{ fontSize: 10, fill: '#64748B' }} interval={0} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} formatter={(v) => inr(v)} contentStyle={{ backgroundColor: '#101534', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                    <Bar dataKey="Total_Expenditure" fill="#101534" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-navy font-heading flex items-center">
                <AlertTriangle className="mr-2 text-rose-600" size={18} /> Flagged High-Risk Transactions
              </h3>
              <div className="flex items-center">
                <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1.5 mr-2">
                  <option value="all">All Reasons</option>
                  <option value="Unusually large payment amount">Large Amount</option>
                  <option value="Vendor receiving abnormally frequent payments">Vendor Frequency</option>
                  <option value="Amount far from district average">District Deviation</option>
                </select>
                <button onClick={downloadCSV} className="text-xs font-semibold bg-navy text-white px-3 py-1.5 rounded-md hover:bg-navy-light">
                  Export CSV
                </button>
              </div>
            </div>
              <div className="overflow-auto max-h-[420px] border border-slate-100 rounded-lg">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-3 font-semibold text-slate-600">MP Name</th>
                      <th className="p-3 font-semibold text-slate-600">Vendor</th>
                      <th className="p-3 font-semibold text-slate-600">IDA</th>
                      <th className="p-3 font-semibold text-slate-600">Amount</th>
                      <th className="p-3 font-semibold text-slate-600">Status</th>
                      <th className="p-3 font-semibold text-slate-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {anomalies
                        .filter(a => reasonFilter === 'all' || a.Flag_Reason === reasonFilter)
                        .slice()
                        .sort((a, b) => (b['Expenditure Amount (₹)'] || 0) - (a['Expenditure Amount (₹)'] || 0))
                        .slice(0, 50)
                        .map((a, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-3 font-medium text-slate-900 capitalize">{a['MP Name']}</td>
                          <td className="p-3 text-slate-600">{a.Vendor}</td>
                          <td className="p-3 text-slate-600 truncate max-w-[160px]" title={a.IDA}>{a.IDA}</td>
                          <td className="p-3 font-bold text-rose-600">{inr(a['Expenditure Amount (₹)'])}</td>
                          <td className="p-3 text-slate-600">{a['Payment Status']}</td>
                          <td className="p-3 text-xs text-slate-500 italic">{a.Flag_Reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">Showing top 50 of {anomalies.length} flagged transactions by amount.</p>
            </div>
          </div>
        )}

        {view === 'district' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <h3 className="text-lg font-bold text-navy font-heading mb-4 flex items-center">
              <Activity className="mr-2 text-navy" size={18} /> Risk by Implementing District Authority (IDA)
            </h3>
            <div className="overflow-auto max-h-[500px] border border-slate-100 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold text-slate-600">IDA / District</th>
                    <th className="p-3 font-semibold text-slate-600">Flagged Transactions</th>
                    <th className="p-3 font-semibold text-slate-600">Total Flagged Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {districtSummary.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-3 font-medium text-slate-900">{d.IDA}</td>
                      <td className="p-3 text-slate-600">{d.count}</td>
                      <td className="p-3 font-bold text-rose-600">{inr(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'mp' && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="relative mb-6 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search MP name..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>

            {!search.trim() && <p className="text-slate-400 text-sm">Start typing an MP's name to see their fund utilization, flagged transactions, and duplicate work proposals.</p>}

            {search.trim() && (
              <div className="space-y-6">
                {filteredMpSegment && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-500">Fund Utilization Segment</p>
                    <p className="text-lg font-bold text-navy font-heading capitalize">{filteredMpSegment.Normalized_MP_Name}</p>
                    <p className="text-sm mt-1">{filteredMpSegment.Segment_Label} — {inr(filteredMpSegment.Total_Expenditure)} across {filteredMpSegment.Total_Works} works</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-2">Flagged Transactions ({filteredMpAnomalies.length})</p>
                  {filteredMpAnomalies.length === 0 ? (
                    <p className="text-sm text-slate-400">No anomalies found for this MP.</p>
                  ) : (
                    <div className="overflow-auto max-h-[300px] border border-slate-100 rounded-lg">
                      <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-slate-100">
                          {filteredMpAnomalies.map((a, idx) => (
                            <tr key={idx}>
                              <td className="p-3 text-slate-600">{a.Vendor}</td>
                              <td className="p-3 font-bold text-rose-600">{inr(a['Expenditure Amount (₹)'])}</td>
                              <td className="p-3 text-slate-500">{a['Payment Status']}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-2">Duplicate Work Proposals ({filteredMpDuplicates.length})</p>
                  {filteredMpDuplicates.length === 0 ? (
                    <p className="text-sm text-slate-400">No duplicate proposals found for this MP.</p>
                  ) : (
                    filteredMpDuplicates.map((d, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm mb-2">
                        <span className="font-bold text-amber-700">{d['Similarity_Score_%']}% match</span> — {d.Work_A}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;