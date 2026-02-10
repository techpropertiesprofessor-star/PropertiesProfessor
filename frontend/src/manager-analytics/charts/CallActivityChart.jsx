/**
 * Call Activity Chart
 * Shows call activity over the last 7 days
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CallActivityChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Call Activity (Last 7 Days)</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('callActivity')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No call activity data available
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map(item => {
    const date = new Date(item.date);
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
    
    const result = {
      date: formattedDate,
      total: item.totalCalls
    };

    // Add call types
    if (item.callTypes) {
      item.callTypes.forEach(ct => {
        result[ct.type] = ct.count;
      });
    }

    return result;
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {item.value}
            </p>
          ))}
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
          <h3 className="text-lg font-semibold text-gray-800">Call Activity (Last 7 Days)</h3>
          <span className="text-xs text-gray-400">Real-time</span>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh('callActivity')}
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors hover:scale-105 transform"
            title="Refresh calls data"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} name="Total Calls" />
          <Line type="monotone" dataKey="inbound" stroke="#10B981" strokeWidth={2} name="Inbound" />
          <Line type="monotone" dataKey="outbound" stroke="#F59E0B" strokeWidth={2} name="Outbound" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CallActivityChart;
