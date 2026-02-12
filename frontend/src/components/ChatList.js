import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { chatAPI, employeeAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import io from 'socket.io-client';

const ChatList = ({ onSelectChat, activeChat }) => {
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const socketRef = useRef(null);

  const loadChats = useCallback(async () => {
    try {
      const response = await chatAPI.getChatList();
      console.log('📋 Full response:', response);
      console.log('📋 response.data:', response.data);
      console.log('📋 response.data type:', typeof response.data);
      console.log('📋 Is array?', Array.isArray(response.data));
      
      // Handle both formats: {chats: [...]} or direct array
      const chatData = response.data.chats || response.data || [];
      console.log('📋 Chat data to set:', chatData);
      console.log('📋 Number of chats:', chatData.length);
      
      // Log each chat item
      chatData.forEach((chat, index) => {
        console.log(`📋 Chat ${index}:`, chat);
        console.log(`  - _id: ${chat?._id}`);
        console.log(`  - otherParticipant:`, chat?.otherParticipant);
        console.log(`  - lastMessage: ${chat?.lastMessage}`);
      });
      
      setChats(chatData);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading chats:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUserId = user?.employeeId || user?._id;
    console.log('🎯 ChatList mounting/updating');
    console.log('👤 User object:', user);
    console.log('🆔 Current user ID:', currentUserId);
    
    if (!currentUserId) {
      console.log('⚠️ No user ID found, skipping setup');
      return;
    }
    
    console.log('✅ Setting up ChatList...');
    loadChats();
    loadEmployees();

    // Setup socket connection for real-time chat updates
    const socketBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : window.location.origin;

    console.log('🔌 Connecting socket to:', socketBase);
    const socket = io(socketBase);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      // Update employee's socketId in database
      if (currentUserId) {
        employeeAPI.updateOnlineStatus({
          employeeId: currentUserId,
          isOnline: true,
          socketId: socket.id
        }).catch(err => console.error('Failed to update socketId:', err));
        // Identify with server so it can map socket -> employee
        try {
          socket.emit('identify', currentUserId);
        } catch (err) {
          console.warn('Failed to emit identify:', err);
        }
      }
    });

    // Listen for new chat messages to refresh chat list
    socket.on('chat-message', (message) => {
      console.log('🔔 Received chat-message:', message);
      // If this is a private message and involves current user, reload chats
      if (message.chatType === 'private') {
        const isInvolved = message.receiver_id === currentUserId || message.sender_id === currentUserId;
        console.log('👤 Current user ID:', currentUserId);
        console.log('📨 Message receiver:', message.receiver_id);
        console.log('📤 Message sender:', message.sender_id);
        console.log('✅ Is user involved?', isInvolved);
        
        if (isInvolved) {
          console.log('🔄 Reloading chats...');
          loadChats(); // Refresh chat list to show new conversation
        }
      }
    });

    return () => {
      console.log('🔌 Disconnecting socket');
      socket.disconnect();
    };
  }, [user?.employeeId, user?._id, loadChats]);

  // Listen for chatSeen events dispatched by ChatRoom to update unread counts immediately
  useEffect(() => {
    const handleChatSeen = (e) => {
      const detail = e?.detail || {};
      const seenUserId = detail.userId;
      if (!seenUserId) return;
      setChats(prev => prev.map(c => {
        const otherId = c?.otherParticipant?._id || c?.otherParticipant;
        if (!otherId) return c;
        if (String(otherId) === String(seenUserId)) {
          return { ...c, unreadCount: 0 };
        }
        return c;
      }));
    };
    window.addEventListener('chatSeen', handleChatSeen);
    return () => window.removeEventListener('chatSeen', handleChatSeen);
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      // Filter out current user using both employeeId and _id
      const currentUserId = user?.employeeId || user?._id;
      const otherEmployees = response.data.filter(
        emp => emp._id !== currentUserId
      );
      setEmployees(otherEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const startPrivateChat = (employee) => {
    onSelectChat({
      type: 'private',
      userId: employee._id,
      userName: employee.name,
      isOnline: employee.isOnline
    });
    setShowNewChatModal(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-teal-500',
    ];
    if (!id) return colors[0];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}d ago`;
    }
    
    // Show date
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Chat
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Team Chat - Always first */}
        <div
          onClick={() => onSelectChat({ type: 'team' })}
          className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
            activeChat?.type === 'team'
              ? 'bg-blue-50 border-l-4 border-l-blue-600'
              : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg mr-3">
              👥
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-800 truncate">Team Chat</h3>
              </div>
              <p className="text-sm text-gray-500 truncate">All team members</p>
            </div>
          </div>
        </div>

        {/* Private Chats */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2">Loading chats...</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No private chats yet</p>
            <p className="text-xs mt-1">Click "New Chat" to start</p>
          </div>
        ) : (
          chats.filter(chat => chat && chat.otherParticipant).map((chat) => {
            const otherParticipant = chat.otherParticipant;
            const unreadCount = chat.unreadCount || 0;
            
            return (
              <div
                key={chat._id}
                onClick={() => onSelectChat({
                  type: 'private',
                  userId: otherParticipant._id,
                  userName: otherParticipant.name,
                  isOnline: otherParticipant.isOnline
                })}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  activeChat?.type === 'private' && activeChat?.userId === otherParticipant._id
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full ${getAvatarColor(
                        otherParticipant._id
                      )} flex items-center justify-center text-white text-sm font-bold shadow mr-3`}
                    >
                      {getInitials(otherParticipant.name)}
                    </div>
                    {otherParticipant.isOnline && (
                      <div className="absolute bottom-0 right-3 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate flex items-center">
                        {otherParticipant.name}
                        {otherParticipant.isOnline && (
                          <span className="ml-2 text-xs text-green-600">●</span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-400 ml-2">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate flex-1">
                        {chat.lastMessage || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-semibold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Start New Chat</h3>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {employees.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No team members available</p>
              ) : (
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <div
                      key={employee._id}
                      onClick={() => startPrivateChat(employee)}
                      className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-full ${getAvatarColor(
                            employee._id
                          )} flex items-center justify-center text-white text-sm font-bold shadow mr-3`}
                        >
                          {getInitials(employee.name)}
                        </div>
                        {employee.isOnline && (
                          <div className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">
                          {employee.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {employee.email || employee.position || 'Team member'}
                        </p>
                      </div>
                      {employee.isOnline && (
                        <span className="text-xs text-green-600 font-semibold">Online</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
