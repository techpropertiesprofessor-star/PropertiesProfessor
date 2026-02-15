
import React, { useEffect, useState } from 'react';
import { notificationAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';

export default function NotificationsPage({ newMessageCount = 0, resetNewMessageCount }) {
  const sidebarCollapsed = useSidebarCollapsed();
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    // Try to load from localStorage first
    const localNotifs = JSON.parse(localStorage.getItem('notifications') || '[]');
    setNotifications(localNotifs);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={null} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Notifications</h2>
        {notifications.length === 0 ? (
          <div>No notifications found.</div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notif, idx) => (
              notif.type === 'ANNOUNCEMENT' ? (
                <li key={notif.id || idx} className="bg-blue-50 border border-blue-100 shadow rounded p-4">
                  <div className="font-semibold text-blue-700 flex items-center gap-2"><span role="img" aria-label="announcement">📢</span> {notif.title || 'Announcement'}</div>
                  <div className="text-gray-700">{notif.message}</div>
                  <div className="text-xs text-gray-400">{notif.created_at ? notif.created_at : ''}</div>
                </li>
              ) : (
                <li key={notif.id || idx} className="bg-white shadow rounded p-4">
                  <div className="font-semibold">{notif.title || 'Notification'}</div>
                  <div className="text-gray-700">{notif.message}</div>
                  <div className="text-xs text-gray-400">{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</div>
                </li>
              )
            ))}
          </ul>
        )}
        </main>
      </div>
    </div>
  );
}
