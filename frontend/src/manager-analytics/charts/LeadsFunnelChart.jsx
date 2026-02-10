/**
 * Leads Funnel Chart
 * Shows lead conversion through stages
 */

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  const chartData = data.map(item => ({
    stage: STAGE_LABELS[item.stage] || item.stage,
    count: item.count,
    stageKey: item.stage
  }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{payload[0].payload.stage}</p>
          <p className="text-sm">Count: {payload[0].value}</p>
          <p className="text-sm text-gray-600">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Leads Funnel</h3>
        {onRefresh && (
          <button
            onClick={() => onRefresh('leadsFunnel')}
            className="text-blue-600 hover:text-blue-800 text-sm"
            title="Refresh chart"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <div className="text-center mb-4">
        <p className="text-2xl font-bold text-gray-800">{total}</p>
        <p className="text-sm text-gray-600">Total Leads</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="stage" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.stageKey] || '#999999'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LeadsFunnelChart;
