/**
 * Employee Task Load Chart - Modern Professional Design
 * Shows task distribution across employees (Horizontal Stacked Bar)
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  completed: '#10b981',
  inProgress: '#3b82f6',
  pending: '#f59e0b'
};

const EmployeeTaskLoadChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">👥 Employee Task Load</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">👥</span>
            <p className="text-sm">No employee task data available</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.employeeName || 'Unknown',
    Completed: item.completedTasks || 0,
    'In Progress': item.inProgressTasks || 0,
    Pending: item.pendingTasks || 0,
    total: item.totalTasks || 0
  }));

  const totalTasks = chartData.reduce((sum, item) => sum + item.total, 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, item) => sum + item.value, 0);
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((item, index) => (
            <p key={index} className="text-sm flex justify-between gap-4" style={{ color: item.color }}>
              <span>{item.name}:</span>
              <span className="font-semibold">{item.value}</span>
            </p>
          ))}
          <p className="text-sm font-bold mt-2 pt-2 border-t border-gray-200 text-gray-800">Total: {total}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">👥 Employee Task Load</h3>
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/90 font-medium">Live</span>
          </div>
        </div>
        {onRefresh && (
          <button onClick={() => onRefresh('employeeLoad')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        <div className="text-center mb-4">
          <p className="text-4xl font-black text-gray-800">{totalTasks}</p>
          <p className="text-sm text-gray-500 font-medium">Total Tasks Across {chartData.length} Employees</p>
        </div>

        <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 50)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fill: '#6b7280' }} />
            <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => <span className="text-sm font-medium text-gray-700">{value}</span>}
            />
            <Bar dataKey="Completed" stackId="a" fill={COLORS.completed} radius={[0, 0, 0, 0]} animationDuration={1200} />
            <Bar dataKey="In Progress" stackId="a" fill={COLORS.inProgress} />
            <Bar dataKey="Pending" stackId="a" fill={COLORS.pending} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Status summary cards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-lg font-bold text-emerald-700">{chartData.reduce((s, d) => s + d.Completed, 0)}</p>
            <p className="text-xs text-emerald-600 font-medium">Completed</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-lg font-bold text-blue-700">{chartData.reduce((s, d) => s + d['In Progress'], 0)}</p>
            <p className="text-xs text-blue-600 font-medium">In Progress</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-lg font-bold text-amber-700">{chartData.reduce((s, d) => s + d.Pending, 0)}</p>
            <p className="text-xs text-amber-600 font-medium">Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTaskLoadChart;
