/**
 * Task Status Donut Chart - Modern Professional Design
 * Shows distribution of tasks by status with gradient styling
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  pending: '#f59e0b',
  'in-progress': '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  'on-hold': '#6b7280'
};

const STATUS_LABELS = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'on-hold': 'On Hold'
};

const TaskStatusChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">📊 Task Status Overview</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">📋</span>
            <p className="text-sm">No task data available</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: STATUS_LABELS[item.status] || item.status,
    value: item.count,
    status: item.status
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600 mt-1">Count: <span className="font-semibold text-gray-900">{payload[0].value}</span></p>
          <p className="text-sm text-blue-600 font-semibold">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">📊 Task Status Overview</h3>
        {onRefresh && (
          <button onClick={() => onRefresh('taskStatus')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        <div className="text-center mb-4">
          <p className="text-4xl font-black text-gray-800">{total}</p>
          <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={110}
              fill="#8884d8"
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={1200}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.status] || '#999999'} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm font-medium text-gray-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Status breakdown bars */}
        <div className="mt-4 space-y-2">
          {chartData.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[item.status] || '#999' }}></div>
              <span className="text-xs font-medium text-gray-600 w-24">{item.name}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: COLORS[item.status] || '#999' }}
                ></div>
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskStatusChart;
