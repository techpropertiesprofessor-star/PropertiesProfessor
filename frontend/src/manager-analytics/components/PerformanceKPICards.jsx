/**
 * Performance KPI Cards - Modern Professional Design
 * Displays key performance indicators with animated counters and gradients
 */

import React, { useState, useEffect, useRef } from 'react';

const AnimatedCounter = ({ value, duration = 1200 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = typeof value === 'number' ? value : parseInt(value) || 0;
    if (start === end) { setDisplayValue(end); return; }
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    prevValue.current = end;
  }, [value, duration]);

  return <span>{displayValue}</span>;
};

const KPICard = ({ title, value, subtitle, icon, gradient, delay = 0 }) => {
  return (
    <div
      className="relative group rounded-2xl p-5 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-default"
      style={{ background: gradient, animationDelay: `${delay}ms` }}
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-700"></div>
      <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5"></div>
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white/80 mb-1 tracking-wide uppercase">{title}</p>
          <p className="text-4xl font-black text-white mt-2 tracking-tight drop-shadow-sm">
            <AnimatedCounter value={value} />
          </p>
          {subtitle && (
            <p className="text-xs text-white/70 mt-2 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"></span>
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-4xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-500 drop-shadow-lg select-none">
          {icon}
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  );
};

const PerformanceKPICards = ({ data, onRefresh }) => {
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    setLastRefresh(new Date());
  }, [data]);

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100/50">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Performance KPIs</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-400">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-3"></div>
            <p className="text-sm">Loading KPI data...</p>
          </div>
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
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Total Tasks',
      value: data.tasks?.total || 0,
      subtitle: `${data.tasks?.completedToday || 0} completed today`,
      icon: '✅',
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
    },
    {
      title: 'Total Leads',
      value: data.leads?.total || 0,
      subtitle: `${data.leads?.wonThisMonth || 0} won this month`,
      icon: '🎯',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
    },
    {
      title: 'Inventory Items',
      value: data.inventory?.total || 0,
      subtitle: data.inventory?.lowStock > 0
        ? `⚠️ ${data.inventory.lowStock} low stock`
        : 'All stocked',
      icon: '📦',
      gradient: data.inventory?.lowStock > 0
        ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
    },
    {
      title: 'Calls Today',
      value: data.calls?.today || 0,
      subtitle: 'Total calls',
      icon: '📞',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100/50">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Performance KPIs</h3>
            <p className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString()}</p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh('kpis')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 text-sm font-semibold transition-all duration-300 hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} delay={index * 100} />
        ))}
      </div>
    </div>
  );
};

export default PerformanceKPICards;
