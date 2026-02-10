/**
 * Employee Task Load Chart
 * Shows task distribution across employees (Horizontal Bar)
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
  completed: '#32CD32',
  inProgress: '#4169E1',
  pending: '#FFA500'
};

const EmployeeTaskLoadChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Employee Task Load</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('employeeLoad')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No employee task data available
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map(item => ({
    name: item.employeeName || 'Unknown',
    Completed: item.completedTasks || 0,
    'In Progress': item.inProgressTasks || 0,
    Pending: item.pendingTasks || 0,
    total: item.totalTasks || 0
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, item) => sum + item.value, 0);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {item.value}
            </p>
          ))}
          <p className="text-sm font-semibold mt-1 pt-1 border-t">Total: {total}</p>
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
          <h3 className="text-lg font-semibold text-gray-800">Employee Task Load</h3>
          <span className="text-xs text-gray-400">Real-time</span>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh('employeeLoad')}
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors hover:scale-105 transform"
            title="Refresh chart"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={90}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Completed" stackId="a" fill={COLORS.completed} />
          <Bar dataKey="In Progress" stackId="a" fill={COLORS.inProgress} />
          <Bar dataKey="Pending" stackId="a" fill={COLORS.pending} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.completed }}></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.inProgress }}></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.pending }}></div>
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTaskLoadChart;
