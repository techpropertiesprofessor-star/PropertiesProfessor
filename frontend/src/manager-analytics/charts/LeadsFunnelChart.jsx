/**
 * Leads Funnel Chart
 * Shows lead distribution across stages as a pie chart
 */

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const STAGE_COLORS = {
  new: '#3B82F6',
  contacted: '#8B5CF6',
  qualified: '#EC4899',
  proposal: '#F59E0B',
  negotiation: '#EF4444',
  won: '#10B981',
  lost: '#6B7280'
};

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

const LeadsFunnelChart = ({ data, onRefresh }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Leads Funnel</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('leadsFunnel')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No leads data available
        </div>
      </div>
    );
  }

  const chartData = data
    .map(item => ({
      stage: STAGE_LABELS[item.stage] || item.stage,
      count: item.count,
      stageKey: item.stage
    }))
    .filter(item => item.count > 0); // Only show stages with leads

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS[entry.payload.stageKey] || '#999' }}></div>
            <p className="font-bold text-gray-800">{entry.payload.stage}</p>
          </div>
          <p className="text-sm text-gray-700">Count: <span className="font-semibold">{entry.value}</span></p>
          <p className="text-sm text-gray-500">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  // Custom label on pie slices
  const renderLabel = ({ stage, count, cx, cy, midAngle, innerRadius, outerRadius }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;

    if (percentage < 5) return null; // Don't show label for very small slices

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
        {percentage}%
      </text>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">🎯 Leads Funnel</h3>
        {onRefresh && (
          <button onClick={() => onRefresh('leadsFunnel')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        {/* Pie Chart with center total */}
        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={130}
                paddingAngle={3}
                dataKey="count"
                nameKey="stage"
                animationDuration={1200}
                animationBegin={200}
                label={renderLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={STAGE_COLORS[entry.stageKey] || '#999999'}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center total overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-black text-gray-800">{total}</p>
              <p className="text-xs text-gray-500 font-medium">Total Leads</p>
            </div>
          </div>
        </div>

        {/* Stage summary pills */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {data.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLORS[item.stage] || '#999' }}></div>
              <span className="text-xs font-semibold text-gray-700">
                {STAGE_LABELS[item.stage] || item.stage}: {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadsFunnelChart;
