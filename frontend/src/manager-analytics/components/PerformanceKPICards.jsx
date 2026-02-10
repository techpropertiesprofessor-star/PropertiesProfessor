/**
 * Performance KPI Cards
 * Displays key performance indicators
 */

import React from 'react';

const KPICard = ({ title, value, subtitle, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600'
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-50">{icon}</div>
        )}
      </div>
    </div>
  );
};

const PerformanceKPICards = ({ data, onRefresh }) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Performance KPIs</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('kpis')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-32 text-gray-500">
          No KPI data available
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Active Employees',
      value: data.employees?.total || 0,
      subtitle: `${data.employees?.presentToday || 0} present today`,
      icon: '👥',
      color: 'blue'
    },
    {
      title: 'Total Tasks',
      value: data.tasks?.total || 0,
      subtitle: `${data.tasks?.completedToday || 0} completed today`,
      icon: '✓',
      color: 'green'
    },
    {
      title: 'Total Leads',
      value: data.leads?.total || 0,
      subtitle: `${data.leads?.wonThisMonth || 0} won this month`,
      icon: '🎯',
      color: 'purple'
    },
    {
      title: 'Inventory Items',
      value: data.inventory?.total || 0,
      subtitle: data.inventory?.lowStock > 0 
        ? `⚠️ ${data.inventory.lowStock} low stock` 
        : 'All stocked',
      icon: '📦',
      color: data.inventory?.lowStock > 0 ? 'yellow' : 'blue'
    },
    {
      title: 'Calls Today',
      value: data.calls?.today || 0,
      subtitle: 'Total calls',
      icon: '📞',
      color: 'green'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Performance KPIs</h3>
        {onRefresh && (
          <button
            onClick={() => onRefresh('kpis')}
            className="text-blue-600 hover:text-blue-800 text-sm"
            title="Refresh KPIs"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>
    </div>
  );
};

export default PerformanceKPICards;
