/**
 * Call Activity Chart - Modern Professional Design
 * Shows call activity over the last 7 days with area fills
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CallActivityChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">📞 Call Activity (Last 7 Days)</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">📞</span>
            <p className="text-sm">No call activity data available</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => {
    const date = new Date(item.date);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    const result = { date: formattedDate, total: item.totalCalls };
    if (item.callTypes) {
      item.callTypes.forEach(ct => { result[ct.type] = ct.count; });
    }
    return result;
  });

  const totalCalls = chartData.reduce((s, d) => s + (d.total || 0), 0);
  const avgCalls = chartData.length > 0 ? Math.round(totalCalls / chartData.length) : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800 mb-2">Date: {label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm flex justify-between gap-4" style={{ color: item.color }}>
              <span>{item.name}:</span>
              <span className="font-semibold">{item.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">📞 Call Activity (Last 7 Days)</h3>
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/90 font-medium">Live</span>
          </div>
        </div>
        {onRefresh && (
          <button onClick={() => onRefresh('callActivity')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-2xl font-black text-rose-700">{totalCalls}</p>
            <p className="text-xs text-rose-600 font-medium">Total Calls</p>
          </div>
          <div className="text-center p-3 bg-pink-50 rounded-xl border border-pink-100">
            <p className="text-2xl font-black text-pink-700">{avgCalls}</p>
            <p className="text-xs text-pink-600 font-medium">Daily Average</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <YAxis tick={{ fill: '#6b7280' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => <span className="text-sm font-medium text-gray-700">{value}</span>} />
            <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorTotal)" name="Total Calls" dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1200} />
            <Area type="monotone" dataKey="inbound" stroke="#10b981" strokeWidth={2} fill="url(#colorInbound)" name="Inbound" dot={{ r: 3 }} animationDuration={1200} />
            <Area type="monotone" dataKey="outbound" stroke="#f59e0b" strokeWidth={2} fill="url(#colorOutbound)" name="Outbound" dot={{ r: 3 }} animationDuration={1200} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CallActivityChart;
