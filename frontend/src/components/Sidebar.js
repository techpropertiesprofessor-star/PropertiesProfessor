import React, { useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useNotificationCounts } from '../context/NotificationContext';
import { FiHome, FiClock, FiCheckSquare, FiPhone, FiUser, FiUsers, FiTrendingUp, FiPackage, FiChevronLeft, FiChevronRight, FiMessageCircle, FiBook, FiCalendar, FiEdit3, FiBarChart2 } from 'react-icons/fi';

import { useLocation } from 'react-router-dom';
export default function Sidebar({ 
  mobile = false,
  onClose = null
}) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  
  // Get notification counts from centralized context
  const { 
    leadsCount, 
    tasksCount, 
    teamChatCount, 
    callersCount, 
    calendarCount,
    clearSection 
  } = useNotificationCounts();
  useEffect(() => {
    try {
      console.log('Sidebar render debug:', { mobile, collapsed, hasOnClose: !!onClose });
    } catch (e) {
      /* ignore */
    }
  }, [mobile, collapsed, onClose]);
  // Clear section badge when visiting specific pages
  useEffect(() => {
    const pathToSection = {
      '/leads': 'leads',
      '/tasks': 'tasks',
      '/chat': 'teamChat',
      '/callers': 'callers',
      '/calendar': 'calendar',
      '/announcements': 'announcements'
    };
    const section = pathToSection[location.pathname];
    if (section) {
      clearSection(section);
    }
  }, [location.pathname, clearSection]);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebarCollapsed', String(next));
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: next } }));
  };

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
    
    // Manager Analytics - only for managers and admins
    if (item.managerOnly && userRole !== 'MANAGER' && userRole !== 'ADMIN') {
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

  // Outer wrapper reserves width in layout so main content stays offset
  const wrapperWidthClass = collapsed ? 'md:w-20' : 'md:w-64';

  const content = (
    /* Desktop fixed sidebar: render only the fixed <aside> so parent layout doesn't reserve width */
    <aside
      className={mobile ? `fixed inset-y-0 left-0 z-60 bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl sidebar-scroll scrollbar-hidden ${collapsed ? 'w-20' : 'w-64'}` : `hidden md:block fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl sidebar-scroll scrollbar-hidden ${collapsed ? 'w-20' : 'w-64'}`}
      style={mobile ? { width: collapsed ? '5rem' : '16rem' } : {}}
    >
        {mobile && (
          <div className="px-3 py-2 border-b border-slate-800/50 flex items-center justify-between">
            <div className="text-sm font-semibold">Menu</div>
            <button onClick={() => onClose && onClose()} className="p-2 rounded-md bg-slate-800/30 hover:bg-slate-800/50">✕</button>
          </div>
        )}
      {/* Brand Header with Collapse Toggle */}
      <div className="sticky top-0 z-30 px-4 py-4 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-br from-slate-800 to-slate-900">
        {!collapsed && (
          <div 
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/30 rounded-lg p-2 -m-2 transition-all duration-200"
            onClick={() => window.location.reload()}
            title="Click to refresh page"
          >
            <img src="/logo.png" alt="PP" className="w-12 h-12 rounded-full object-cover" />
            <div className="min-w-0">
              <h2 className="text-xs font-bold leading-tight text-slate-200">Properties Professor</h2>
              <p className="text-blue-400 text-xs opacity-80">System</p>
            </div>
          </div>
        )}
        <button 
          onClick={toggleCollapsed} 
          className="p-1.5 rounded-lg hover:bg-slate-800 transition-all duration-200 text-slate-400 hover:text-white ml-auto" 
          aria-label="Toggle sidebar"
        >
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>

      {/* Menu Items with Modern Styling */}
      <nav className={`${collapsed ? 'px-2' : 'px-3'} flex-1 py-4 space-y-1 pr-2`}>
        {filteredItems.map((item) => {
          // Determine badge count for each menu item
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
            onClick={() => navigate(item.path)}
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
            {/* Active Indicator Bar */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg"></div>
            )}
            
            <item.icon 
              size={20} 
              className={`flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`}
            />
            
            {!collapsed && (
              <span className={`truncate text-sm font-medium ${isActive ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </span>
            )}
            
            {/* Modern Notification Badge */}
            {badgeCount > 0 && (
              <span className={`
                ${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}
                bg-gradient-to-br from-red-500 to-pink-600 text-white 
                text-xs rounded-full h-5 min-w-[20px] 
                flex items-center justify-center px-1.5 
                font-bold shadow-lg border-2 border-slate-900
                animate-pulse
              `}>
                {badgeCount}
              </span>
            )}
          </button>
        )})}
      </nav>

      {/* User Section - Modern Profile Footer */}
      {!collapsed && user && (
        <div className="px-3 py-4 border-t border-slate-800/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-all duration-200">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-slate-700">
              {(user?.name?.[0] || user?.username?.[0] || user?.email?.[0])?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                {user?.name || user?.username || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">
                {user?.role?.toLowerCase() || 'Role'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed State User Avatar */}
      {collapsed && user && (
        <div className="px-2 py-4 border-t border-slate-800/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-slate-700 mx-auto" title={user?.name || user?.username || 'User'}>
            {(user?.name?.[0] || user?.username?.[0] || user?.email?.[0])?.toUpperCase() || 'U'}
          </div>
        </div>
      )}

      </aside>
  );

  if (mobile && typeof document !== 'undefined') {
    try {
      return createPortal(content, document.body);
    } catch (e) {
      console.error('Sidebar portal mount failed', e);
      return content;
    }
  }

  return content;

}
