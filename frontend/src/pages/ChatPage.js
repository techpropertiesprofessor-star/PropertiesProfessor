import React, { useContext, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import ChatRoom from '../components/ChatRoom';
import ChatList from '../components/ChatList';
import { AuthContext } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { notificationAPI } from '../api/client';

export default function ChatPage({ newMessageCount = 0, resetNewMessageCount }) {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user, logout } = useContext(AuthContext);
  const { canViewChat, loading } = usePermissions();
  const [activeChat, setActiveChat] = useState({ type: 'team' });

  const handleSelectChat = (chatInfo) => {
    setActiveChat(chatInfo);
  };

  // Mark all team chat notifications as read when page opens
  useEffect(() => {
    const markTeamChatNotificationsAsRead = async () => {
      try {
        await notificationAPI.markTeamChatAsRead();
        console.log('✅ Team chat notifications marked as read');
      } catch (error) {
        console.error('Failed to mark team chat notifications as read:', error);
      }
    };

    if (user && canViewChat && !loading) {
      markTeamChatNotificationsAsRead();
    }
  }, [user, canViewChat, loading]);

  useEffect(() => {
    if (!loading && !canViewChat) {
      window.location.href = '/dashboard';
    }
  }, [canViewChat, loading]);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} onLogout={logout} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
          <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="text-gray-600 text-sm">Loading permissions...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!canViewChat) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} onLogout={logout} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
          <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You don't have permission to access the Chat module.</p>
              <p className="text-sm mt-4 text-red-600">Contact your administrator to request access.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>
      
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} onLogout={logout} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
        
        <main className="flex-1 min-h-0 overflow-hidden flex">
          {/* Chat List Sidebar */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 h-full overflow-y-auto">
            <ChatList 
              onSelectChat={handleSelectChat} 
              activeChat={activeChat}
            />
          </div>

          {/* Chat Room */}
          <div className="flex-1 h-full min-h-0 overflow-hidden">
            <ChatRoom 
              chatType={activeChat.type}
              userId={activeChat.userId}
              userName={activeChat.userName}
              isOnline={activeChat.isOnline}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
