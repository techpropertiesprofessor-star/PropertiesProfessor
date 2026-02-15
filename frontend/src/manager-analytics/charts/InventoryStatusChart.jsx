/**
 * Inventory Status Chart - Modern Professional Design
 * Shows inventory distribution by status with donut chart
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const STATUS_COLORS = {
  available: '#10b981',
  sold: '#3b82f6',
  reserved: '#f59e0b',
  unavailable: '#ef4444'
};

const InventoryStatusChart = ({ data, onRefresh }) => {
  if (!data || !data.byStatus || data.byStatus.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">🏢 Inventory Status</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">🏢</span>
            <p className="text-sm">No inventory data available</p>
          </div>
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
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-100 rounded-xl shadow-2xl">
          <p className="font-bold text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600 mt-1">Count: <span className="font-semibold text-gray-900">{payload[0].value}</span></p>
          <p className="text-sm text-gray-600">Value: <span className="font-semibold">₹{payload[0].payload.totalValue.toLocaleString()}</span></p>
          <p className="text-sm font-semibold text-blue-600 mt-1">{percentage}%</p>
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
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">🏢 Inventory Status</h3>
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/90 font-medium">Live</span>
          </div>
        </div>
        {onRefresh && (
          <button onClick={() => onRefresh('inventory')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-2xl font-black text-gray-800">{total}</p>
            <p className="text-xs text-gray-500 font-medium">Total Units</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-2xl font-black text-gray-800">₹{totalValue >= 10000000 ? `${(totalValue / 10000000).toFixed(1)}Cr` : totalValue >= 100000 ? `${(totalValue / 100000).toFixed(1)}L` : totalValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500 font-medium">Total Value</p>
          </div>
        </div>

        {lowStockCount > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ <span className="font-bold">{lowStockCount}</span> item(s) low on stock
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              fill="#8884d8"
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={1200}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#999999'} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '15px' }}
              formatter={(value) => <span className="text-sm font-medium text-gray-700">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Status breakdown */}
        <div className="mt-4 space-y-2">
          {chartData.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[item.status] || '#999' }}></div>
              <span className="text-xs font-medium text-gray-600 w-24">{item.name}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: STATUS_COLORS[item.status] || '#999' }}></div>
              </div>
              <span className="text-xs font-bold text-gray-700 w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryStatusChart;
