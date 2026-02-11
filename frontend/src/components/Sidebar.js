import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiHome, FiClock, FiCheckSquare, FiPhone, FiUser, FiUsers, FiTrendingUp, FiPackage, FiChevronLeft, FiChevronRight, FiMessageCircle, FiBook, FiCalendar, FiEdit3, FiBarChart2 } from 'react-icons/fi';

import { useLocation } from 'react-router-dom';
export default function Sidebar({ 
  notificationCount = 0, 
  clearLeadsBadge,
  leadsCount = 0,
  tasksCount = 0,
  teamChatCount = 0,
  callersCount = 0,
  calendarCount = 0
}) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Clear badge when visiting /leads
  useEffect(() => {
    if (location.pathname === '/leads' && clearLeadsBadge) {
      clearLeadsBadge();
    }
  }, [location.pathname, clearLeadsBadge]);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', String(next));
  };

  // Mobile sidebar open/close
  const toggleMobileSidebar = () => setMobileOpen((open) => !open);

  const menuItems = [
    { icon: FiHome, label: 'Dashboard', path: '/dashboard', permission: 'Dashboard' },
    { icon: FiClock, label: 'Attendance', path: '/attendance', permission: 'Attendance' },
    { icon: FiCheckSquare, label: 'Tasks', path: '/tasks', permission: 'Tasks' },
    { icon: FiMessageCircle, label: 'Team Chat', path: '/chat', permission: 'Team Chat' },
    { icon: FiTrendingUp, label: 'Leads', path: '/leads', permission: 'Leads' },
    { icon: FiPackage, label: 'Inventory', path: '/inventory', permission: 'Inventory' },
    { icon: FiPhone, label: 'Callers', path: '/callers', permission: 'Caller' },
    { icon: FiUsers, label: 'Employees', path: '/employees', permission: 'Employees' },
    { icon: FiCalendar, label: 'Calendar', path: '/calendar', permission: 'Calendar' },
    { icon: FiEdit3, label: 'Notes', path: '/notes', permission: 'Notes' },
    { icon: FiCheckSquare, label: 'Leave Requests', path: '/leaves', permission: 'Leave Request' },
    { icon: FiBook, label: 'Announcements', path: '/announcements', permission: 'Announcements' },
    { icon: FiBarChart2, label: 'Analytics', path: '/manager/analytics', permission: 'Manager Analytics', managerOnly: true },
    { icon: FiUser, label: 'Profile', path: '/profile', permission: 'Profile' },
  ];

  // Check if user has permission to view a menu item
  const hasPermission = (item) => {
    const userRole = user?.role?.toUpperCase();
    
    // Manager Analytics - only for managers
    if (item.managerOnly && userRole !== 'MANAGER') {
      return false;
    }
    
    // Debug logging
    if (userRole === 'EMPLOYEE') {
      console.log('🔍 Checking permission for:', item.label, '| User permissions:', user?.permissions);
    }
    
    // ADMIN and MANAGER have access to everything
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return true;
    }
    
    // For EMPLOYEE, check permissions array
    if (userRole === 'EMPLOYEE') {
      // Profile is always accessible
      if (item.permission === 'Profile') return true;
      
      // Check if permission exists in user's permissions array
      const hasAccess = user?.permissions?.includes(item.permission) || false;
      console.log('  → Has access to', item.label, ':', hasAccess);
      return hasAccess;
    }
    
    return false;
  };

  const filteredItems = menuItems.filter(item => hasPermission(item));

  const isActivePath = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile sidebar overlay and drawer */}
      <div className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} md:hidden`} onClick={toggleMobileSidebar}></div>
      <aside
        className={`
          fixed z-50 top-0 left-0 h-full bg-slate-900 border-r border-slate-800 text-white flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          w-64
          md:translate-x-0 md:static md:w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Sidebar"
      >
        {/* Brand Header with Collapse Toggle */}
        <div className="px-4 py-4 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-br from-slate-800/50 to-slate-900/50">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/30 rounded-lg p-2 -m-2 transition-all duration-200" onClick={() => window.location.reload()} title="Click to refresh page">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-700 font-bold text-sm">PP</div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold leading-tight text-slate-200">Properties Professor</h2>
              <p className="text-blue-400 text-xs opacity-80">System</p>
            </div>
          </div>
          <button
            onClick={mdCheck() ? toggleCollapsed : toggleMobileSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-all duration-200 text-slate-400 hover:text-white ml-auto md:hidden"
            aria-label="Toggle sidebar"
          >
            {mobileOpen ? <FiChevronLeft size={20} /> : <FiChevronRight size={20} />}
          </button>
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-all duration-200 text-slate-400 hover:text-white ml-auto hidden md:block"
            aria-label="Toggle collapse"
          >
            {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
          </button>
        </div>

        {/* Menu Items with Modern Styling */}
        <nav className={`${collapsed ? 'px-2 w-20' : 'px-3 w-64'} flex-1 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent`}> 
          {filteredItems.map((item) => {
            let badgeCount = 0;
            if (item.label === 'Leads') badgeCount = leadsCount;
            else if (item.label === 'Tasks') badgeCount = tasksCount;
            else if (item.label === 'Team Chat') badgeCount = teamChatCount;
            else if (item.label === 'Callers') badgeCount = callersCount;
            else if (item.label === 'Calendar') badgeCount = calendarCount;
            const isActive = isActivePath(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                title={collapsed ? item.label : ''}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  transition-all duration-200 ease-in-out text-left relative group
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }
                  ${isActive ? '' : 'hover:translate-x-1'}
                `}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
                )}
                <item.icon size={20} className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                {!collapsed && (
                  <span className={`truncate text-sm font-medium ${isActive ? 'font-semibold' : 'font-normal'}`}>{item.label}</span>
                )}
                {badgeCount > 0 && (
                  <span className={`
                    ${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
                    bg-gradient-to-br from-red-500 to-pink-600 text-white 
                    text-xs rounded-full h-5 min-w-[20px] 
                    flex items-center justify-center px-1.5 
                    font-bold shadow-lg border-2 border-slate-900
                    animate-pulse
                  `}>{badgeCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section - Modern Profile Footer */}
        {!collapsed && user && (
          <div className="px-3 py-4 border-t border-slate-800/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-all duration-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-slate-700">
                {(user?.name?.[0] || user?.username?.[0] || user?.email?.[0])?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.name || user?.username || 'User'}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.toLowerCase() || 'Role'}</p>
              </div>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="px-2 py-4 border-t border-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-slate-700 mx-auto" title={user?.name || user?.username || 'User'}>
              {(user?.name?.[0] || user?.username?.[0] || user?.email?.[0])?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar open button (hamburger) */}
      <button
        className="fixed z-50 bottom-6 left-6 md:hidden bg-blue-600 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        onClick={toggleMobileSidebar}
        aria-label="Open sidebar"
        style={{ display: mobileOpen ? 'none' : 'block' }}
      >
        <FiChevronRight size={24} />
      </button>
    </>
  );

  // Helper for md breakpoint
  function mdCheck() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 768;
  }
}
