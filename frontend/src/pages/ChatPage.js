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
  // Mobile: track whether to show ChatRoom or ChatList
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const handleSelectChat = (chatInfo) => {
    setActiveChat(chatInfo);
    setMobileShowChat(true); // On mobile, switch to ChatRoom view
  };

  const handleBackToList = () => {
    setMobileShowChat(false); // On mobile, go back to ChatList
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
        
        <main className="flex-1 min-h-0 overflow-hidden flex relative">
          {/* Chat List Sidebar - full width on mobile, fixed 320px on desktop */}
          <div className={`${mobileShowChat ? 'hidden md:block' : 'block'} w-full md:w-80 flex-shrink-0 border-r border-gray-200 h-full overflow-y-auto bg-white`}>
            <ChatList 
              onSelectChat={handleSelectChat} 
              activeChat={activeChat}
            />
          </div>

          {/* Chat Room - full width on mobile, flex-1 on desktop */}
          {activeChat.userId || activeChat.type === 'team' ? (
            <div className={`${mobileShowChat ? 'block' : 'hidden md:block'} w-full md:w-auto md:flex-1 h-full min-h-0 overflow-hidden absolute md:relative inset-0 md:inset-auto bg-white z-10 md:z-auto`}>
              <ChatRoom 
                chatType={activeChat.type}
                userId={activeChat.userId}
                userName={activeChat.userName}
                isOnline={activeChat.isOnline}
                onBack={handleBackToList}
              />
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-400 text-lg font-medium">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
