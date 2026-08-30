import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Copy, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [anomalies, setAnomalies] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anomaliesRes, duplicatesRes, segmentsRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/api/anomalies'),
          axios.get('http://127.0.0.1:8000/api/duplicates'),
          axios.get('http://127.0.0.1:8000/api/mp-segments')
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold">Loading SAKSHI-AI Engine...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">SAKSHI-AI</h1>
        <p className="text-gray-500 mt-2 text-lg">MP Fund Utilization & Fraud Detection Dashboard</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">High-Risk Anomalies</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{anomalies.length}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full"><AlertTriangle className="text-red-500" size={24} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Disguised Duplicates</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{duplicates.length}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full"><Copy className="text-orange-500" size={24} /></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">MPs Audited</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{segments.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full"><Activity className="text-blue-500" size={24} /></div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* NLP Duplicates Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <Copy className="mr-2" size={20}/> NLP Semantic Duplicates
          </h2>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-3 font-semibold text-gray-600">MP Name</th>
                  <th className="p-3 font-semibold text-gray-600">Match %</th>
                  <th className="p-3 font-semibold text-gray-600">Work A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {duplicates.map((dup, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{dup.MP_Name}</td>
                    <td className="p-3 text-red-600 font-bold">{dup['Similarity_Score_%']}%</td>
                    <td className="p-3 text-gray-600 truncate max-w-xs" title={dup.Work_A}>{dup.Work_A}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Risk Clustering Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <Activity className="mr-2" size={20}/> MP Utilization Clusters
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segments.slice(0, 15)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="Normalized_MP_Name" angle={-45} textAnchor="end" height={60} tick={{fontSize: 10}} interval={0} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                <Bar dataKey="Total_Expenditure" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center">*Showing top 15 MPs by expenditure</p>
        </div>

      </div>
    </div>
  );
}

export default App;