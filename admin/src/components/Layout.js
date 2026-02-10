import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/activity', label: 'Activity Logs', icon: '📝' },
    { path: '/api-logs', label: 'API Logs', icon: '🌐' },
    { path: '/metrics', label: 'Metrics', icon: '📈' },
    { path: '/bandwidth', label: 'Bandwidth', icon: '📡' },
    { path: '/crashes', label: 'Crashes', icon: '💥' },
  ];

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar - Fixed, No Scroll */}
      <div className="w-64 bg-dark-panel border-r border-gray-700 flex flex-col h-screen fixed left-0 top-0">
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <h1 className="text-xl font-bold text-white">⚙️ Admin Panel</h1>
          <p className="text-xs text-gray-400 mt-1">Observability</p>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors text-sm ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-dark-card'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.username || 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-xs transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content - Offset for fixed sidebar */}
      <div className="flex-1 ml-64 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
