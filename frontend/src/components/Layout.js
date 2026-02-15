import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';

/**
 * Shared Layout component — wraps Sidebar + Header + main content.
 * Every page should use this instead of manually rendering Sidebar/Header.
 *
 * Props:
 *  - children: page content
 *  - user, onLogout, etc.: forwarded to Header
 *  - className: optional extra class for the outer wrapper
 *  - bgClass: background gradient class (default: white)
 *  - headerProps: additional props forwarded to Header
 */
export default function Layout({
  children,
  user,
  onLogout,
  className = '',
  bgClass = 'bg-white',
  headerProps = {},
}) {
  const sidebarCollapsed = useSidebarCollapsed();

  return (
    <div className={`flex h-screen w-full ${bgClass} ${className}`}>
      {/* Desktop sidebar — hidden on mobile, shown md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content column */}
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Header user={user} onLogout={onLogout} {...headerProps} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
