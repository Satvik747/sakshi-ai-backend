import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Copy, Activity, ShieldCheck, Database, Server } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  const [anomalies, setAnomalies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data from backend:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-xl font-semibold tracking-wide">Initializing SAKSHI-AI Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Top Navigation Wrapper */}
      <nav className="bg-slate-900 text-white px-8 py-4 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SAKSHI-AI</h1>
            <p className="text-xs text-slate-400">Autonomous MP Fund Utilization & Fraud Auditing System</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
          <span className="flex items-center text-emerald-400 font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
            System Online
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 flex items-center"><Server size={14} className="mr-1" /> FastAPI v1.0</span>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="p-8 max-w-7xl mx-auto">
        
        {/* Section Intro */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Executive Audit Overview</h2>
            <p className="text-slate-500 text-sm mt-1">Real-time anomaly metrics and semantic fraud detection across parliamentary constituencies.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <Database size={12} className="mr-1.5" /> 74,313 Transactions Audited
            </span>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">High-Risk Anomalies</p>
                <p className="text-3xl font-extrabold text-rose-600 mt-2">{anomalies.length}</p>
                <p className="text-xs text-rose-500 mt-1 font-medium">Top 1% Isolation Forest Outliers</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl text-rose-600"><AlertTriangle size={24} /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disguised Duplicates</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-2">{duplicates.length}</p>
                <p className="text-xs text-amber-500 mt-1 font-medium">TF-IDF Semantic Similarity &gt; 85%</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Copy size={24} /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Constituencies Tracked</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-2">{segments.length}</p>
                <p className="text-xs text-blue-500 mt-1 font-medium">K-Means Clustered Segments</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Activity size={24} /></div>
            </div>
          </div>

        </div>

        {/* Data Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* NLP Duplicates Table Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Copy className="mr-2 text-blue-600" size={18}/> Disguised Project Duplicates
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Live Intercepts</span>
            </div>
            <div className="overflow-auto max-h-[380px] border border-slate-100 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3 font-semibold text-slate-600">MP Name</th>
                    <th className="p-3 font-semibold text-slate-600">Match</th>
                    <th className="p-3 font-semibold text-slate-600">Work Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {duplicates.map((dup, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-medium text-slate-900 capitalize">{dup.MP_Name}</td>
                      <td className="p-3 text-rose-600 font-bold">{dup['Similarity_Score_%']}%</td>
                      <td className="p-3 text-slate-600 truncate max-w-xs" title={dup.Work_A}>{dup.Work_A}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Risk Clustering Chart Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Activity className="mr-2 text-blue-600" size={18}/> MP Fund Utilization Pacing
              </h3>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">Top 15 Outlays</span>
            </div>
            <div className="h-[380px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segments.slice(0, 15)} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="Normalized_MP_Name" angle={-35} textAnchor="end" height={50} tick={{fontSize: 10, fill: '#64748B'}} interval={0} />
                  <YAxis tick={{fontSize: 12, fill: '#64748B'}} />
                  <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px'}}/>
                  <Bar dataKey="Total_Expenditure" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}

export default App;