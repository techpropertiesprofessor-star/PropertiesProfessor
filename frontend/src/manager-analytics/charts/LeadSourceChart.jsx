/**
 * Lead Source Analysis Chart
 * Shows lead distribution and conversion by source
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const LeadSourceChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Lead Source Analysis</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('leadSources')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No lead source data available
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const conversionRate = payload[0].payload.conversionRate || 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          <p className="text-sm">Total Leads: {payload[0].value}</p>
          <p className="text-sm text-green-600">Won: {payload[1]?.value || 0}</p>
          <p className="text-sm font-semibold mt-1 pt-1 border-t">
            Conversion: {conversionRate.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 relative">
      {/* Real-time indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-500">Live</span>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800">Lead Source Analysis</h3>
          <span className="text-xs text-gray-400">Real-time</span>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh('leadSources')}
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors hover:scale-105 transform"
            title="Refresh chart"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="source" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Total" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Won" fill="#10B981" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Conversion Rates:</h4>
        <div className="grid grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <div key={index} className="text-xs flex justify-between border-b pb-1">
              <span className="text-gray-600">{item.source}:</span>
              <span className="font-semibold">{item.conversionRate.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadSourceChart;
