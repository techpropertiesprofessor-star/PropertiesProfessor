/**
 * Lead Source Analysis Chart - Modern Professional Design
 * Shows lead distribution and conversion by source
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LeadSourceChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">📊 Lead Source Analysis</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">📊</span>
            <p className="text-sm">No lead source data available</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    source: item.source,
    Total: item.count,
    Won: item.wonCount,
    conversionRate: item.conversionRate
  }));

  const totalLeads = chartData.reduce((s, d) => s + d.Total, 0);
  const totalWon = chartData.reduce((s, d) => s + d.Won, 0);
  const avgConversion = totalLeads > 0 ? ((totalWon / totalLeads) * 100).toFixed(1) : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const conversionRate = payload[0].payload.conversionRate || 0;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          <p className="text-sm text-blue-600">Total Leads: <span className="font-semibold">{payload[0].value}</span></p>
          <p className="text-sm text-emerald-600">Won: <span className="font-semibold">{payload[1]?.value || 0}</span></p>
          <p className="text-sm font-bold mt-2 pt-2 border-t border-gray-200 text-gray-800">
            Conversion: {conversionRate.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">📊 Lead Source Analysis</h3>
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/90 font-medium">Live</span>
          </div>
        </div>
        {onRefresh && (
          <button onClick={() => onRefresh('leadSources')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{totalLeads}</p>
            <p className="text-xs text-blue-600 font-medium">Total Leads</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-lg font-bold text-emerald-700">{totalWon}</p>
            <p className="text-xs text-emerald-600 font-medium">Won</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-lg font-bold text-purple-700">{avgConversion}%</p>
            <p className="text-xs text-purple-600 font-medium">Avg Conversion</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="source" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fill: '#6b7280' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(value) => <span className="text-sm font-medium text-gray-700">{value}</span>} />
            <Bar dataKey="Total" fill="#6366f1" radius={[10, 10, 0, 0]} animationDuration={1200} />
            <Bar dataKey="Won" fill="#10b981" radius={[10, 10, 0, 0]} animationDuration={1200} />
          </BarChart>
        </ResponsiveContainer>

        {/* Conversion rate breakdown */}
        <div className="mt-4">
          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">📈 Conversion Rates</h4>
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-28 truncate">{item.source}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000" style={{ width: `${Math.min(item.conversionRate, 100)}%` }}></div>
                </div>
                <span className="text-xs font-bold text-gray-700 w-14 text-right">{item.conversionRate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadSourceChart;
