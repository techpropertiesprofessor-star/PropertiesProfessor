import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import Header from '../components/Header';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { useSocket } from '../context/SocketContext';
import useRealtimeData from '../hooks/useRealtimeData';

export default function AnnouncementsPage() {
  const { user } = useContext(AuthContext);
  const sidebarCollapsed = useSidebarCollapsed();
  const [announcements, setAnnouncements] = useState([]);

  const loadAnnouncements = useCallback(() => {
    api.get('/announcements').then(res => {
      setAnnouncements(res.data || []);
      localStorage.setItem('announcements', JSON.stringify(res.data || []));
    });
  }, []);

  // Load announcements from backend on mount
  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Real-time: listen for new announcements via shared socket
  const { on, off } = useSocket() || {};
  useEffect(() => {
    if (!on || !off) return;
    const handleNewAnnouncement = (announcement) => {
      setAnnouncements(prev => [announcement, ...prev]);
      localStorage.setItem('announcements', JSON.stringify([announcement, ...announcements]));
      const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      notifications.unshift({
        id: announcement.id,
        type: 'ANNOUNCEMENT',
        title: 'New Announcement',
        message: announcement.text,
        created_at: announcement.date
      });
      localStorage.setItem('notifications', JSON.stringify(notifications));
    };
    on('new-announcement', handleNewAnnouncement);
    return () => off('new-announcement', handleNewAnnouncement);
  }, [on, off, announcements]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const navigate = useNavigate();

  const handleAdd = () => {
    if (newAnnouncement.trim()) {
      // Send to backend
      api.post('/announcements', { text: newAnnouncement })
        .then(res => {
          // Announcement will be added via socket event
          setNewAnnouncement('');
        })
        .catch(() => {
          // fallback: add locally if backend fails
          const newAnn = { id: Date.now(), text: newAnnouncement, date: new Date().toLocaleString() };
          setAnnouncements(prev => [newAnn, ...prev]);
          localStorage.setItem('announcements', JSON.stringify([newAnn, ...announcements]));
          setNewAnnouncement('');
        });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-100 to-blue-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <div className="flex-1 relative p-3 sm:p-4 md:p-8 max-w-2xl mx-auto w-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-semibold shadow-sm transition-all duration-150"
            >
              &larr; Back
            </button>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Announcements</h1>
            <div style={{width: '70px'}}></div>
          </div>
          <div className="border-b border-gray-200 mb-6"></div>
          <div className="mb-6 flex gap-2 items-center bg-white rounded-lg shadow-md px-4 py-3 border border-gray-200">
            <input
              className="flex-1 border-none outline-none bg-transparent px-2 py-2 text-gray-800 text-base"
              type="text"
              placeholder="Add new announcement..."
              value={newAnnouncement}
              onChange={e => setNewAnnouncement(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow transition-transform duration-150 font-semibold text-base active:scale-95"
              onClick={handleAdd}
            >
              Add Announcement
            </button>
          </div>
          <ul className="space-y-4">
            {announcements.map(a => (
              <li key={a.id} className="bg-white rounded-lg shadow flex items-start gap-3 p-4 border border-gray-100">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  <span role="img" aria-label="announcement">📢</span>
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900 text-base">{a.text}</span>
                  <div className="text-xs text-gray-500 mt-1">{a.date}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
