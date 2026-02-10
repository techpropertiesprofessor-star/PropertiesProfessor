/**
 * Inventory Status Chart
 * Shows inventory distribution by status
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const STATUS_COLORS = {
  available: '#10B981',
  sold: '#3B82F6',
  reserved: '#F59E0B',
  unavailable: '#EF4444'
};

const InventoryStatusChart = ({ data, onRefresh }) => {
  if (!data || !data.byStatus || data.byStatus.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Inventory Status</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('inventory')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No inventory data available
        </div>
      </div>
    );
  }

  const chartData = data.byStatus.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    status: item.status,
    totalValue: item.totalValue || 0
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const totalValue = chartData.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockCount = data.lowStockCount || 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">Count: {payload[0].value}</p>
          <p className="text-sm">Value: ${payload[0].payload.totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-600">{percentage}%</p>
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
          <h3 className="text-lg font-semibold text-gray-800">Inventory Status</h3>
          <span className="text-xs text-gray-400">Real-time</span>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh('inventory')}
            className="text-blue-600 hover:text-blue-800 text-sm transition-colors hover:scale-105 transform"
            title="Refresh inventory"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{total}</p>
          <p className="text-xs text-gray-600">Total Items</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">${totalValue.toLocaleString()}</p>
          <p className="text-xs text-gray-600">Total Value</p>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ <span className="font-semibold">{lowStockCount}</span> item(s) low on stock
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#999999'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryStatusChart;
