import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { chatAPI, employeeAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { FiSend } from 'react-icons/fi';
import io from 'socket.io-client';
// Helper to group messages by date
function groupMessagesByDate(messages) {
  const groups = {};
  messages.forEach((msg) => {
    const date = new Date(msg.created_at).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return groups;
}

// WhatsApp-style message status ticks
const MessageStatusTick = ({ status }) => {
  if (status === 'sent') {
    // Single gray checkmark
    return (
      <span className="text-gray-400 ml-1 text-xs">✓</span>
    );
  } else if (status === 'delivered') {
    // Double gray checkmarks
    return (
      <span className="text-gray-400 ml-1 text-xs">✓✓</span>
    );
  } else if (status === 'seen') {
    // Double blue checkmarks
    return (
      <span className="text-blue-500 ml-1 text-xs">✓✓</span>
    );
  }
  return null;
};

/* ================================
   HELPERS
================================ */

// Initials (SK)
const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.split(' ');
  return (
    (parts[0]?.charAt(0).toUpperCase() || '') +
    (parts[1]?.charAt(0).toUpperCase() || '')
  );
};

// ✅ STABLE avatar color per USER (never per message)
const getAvatarColor = (userId) => {
  const safeKey = String(userId || 'unknown-user');

  const colors = [
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-teal-500',
  ];

  let hash = 0;
  for (let i = 0; i < safeKey.length; i++) {
    hash = safeKey.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export default function ChatRoom({ chatType = 'team', userId = null, userName = null, isOnline = false }) {
  const { user } = useContext(AuthContext);

  console.log('🔍 Current user from AuthContext:', user);
  console.log('🔍 ChatRoom props:', { chatType, userId, userName });

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // @ Tagging states
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [tagStartIndex, setTagStartIndex] = useState(-1);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const loadTeamMembers = useCallback(async () => {
    try {
      const res = await employeeAPI.getBasic();
      setTeamMembers(res.data);
    } catch {
      setTeamMembers([]);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const params = { chatType };
      if (chatType === 'private' && userId) {
        params.userId = userId;
      }
      const res = await chatAPI.getMessages(params);
      console.log('📨 getMessages response:', res);
      // Support both direct array and wrapped responses
      const msgs = Array.isArray(res.data) ? res.data : (res.data && (res.data.messages || res.data.msgs || res.data.data)) || [];
      console.log('📨 Parsed messages count:', Array.isArray(msgs) ? msgs.length : 0, msgs);
      setMessages(msgs || []);
      if ((msgs || []).length > 0) scrollToBottom();
      
      // Mark all messages as seen when opening private chat
      if (chatType === 'private' && userId) {
        try {
          const seenRes = await chatAPI.markChatAsSeen(userId);
          console.log('📘 markChatAsSeen response:', seenRes && seenRes.data);
          // Notify other components (ChatList) to update unread counts
          try {
            window.dispatchEvent(new CustomEvent('chatSeen', { detail: { userId, count: seenRes.data?.count || 0 } }));
          } catch (evErr) {
            console.warn('Failed to dispatch chatSeen event', evErr);
          }
        } catch (err) {
          console.error('Failed to mark as seen:', err);
        }
      }
    } catch {
      console.error('Failed to load messages', arguments);
    }
  }, [chatType, userId, scrollToBottom]);

  useEffect(() => {
    loadMessages();
    if (chatType === 'team') {
      loadTeamMembers();
    }

    const socketBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : window.location.origin;

    const socket = io(socketBase);
    socketRef.current = socket;

    // Update socketId when connected
    socket.on('connect', () => {
      console.log('✅ ChatRoom socket connected:', socket.id);
      // Update employee's socketId in database
      if (user?.employeeId) {
        employeeAPI.updateOnlineStatus({
          employeeId: user.employeeId,
          isOnline: true,
          socketId: socket.id
        }).catch(err => console.error('Failed to update socketId:', err));
        // Identify with server so it can map socket -> employee
        try {
          socket.emit('identify', user.employeeId || user.id);
        } catch (err) {
          console.warn('Failed to emit identify from ChatRoom:', err);
        }
      }
    });

    socket.on('chat-message', (message) => {
      console.log('📨 Received message in ChatRoom:', message);
      // Prevent duplicate messages
      setMessages((prev) => {
        const exists = prev.some(msg => msg.id === message.id);
        if (exists) {
          console.log('⚠️ Duplicate message detected, skipping');
          return prev;
        }
        console.log('✅ Adding new message to state');
        return [...prev, message];
      });
      scrollToBottom();
      
      // Mark as delivered if we're the receiver
      if (message.chatType === 'private' && message.receiver_id === user?.employeeId) {
        chatAPI.markAsDelivered(message.id).catch(err => console.error('Failed to mark as delivered:', err));
      }
    });

    // Listen for delivery confirmations
    socket.on('message-delivered', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, status: 'delivered', deliveredAt: data.deliveredAt }
            : msg
        )
      );
    });

    // Listen for seen confirmations
    socket.on('message-seen', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, status: 'seen', seenAt: data.seenAt }
            : msg
        )
      );
    });

    socket.on('typing', (data) => {
      if (data.userId !== user?.id) {
        setTypingUser(data.name);
      }
    });

    socket.on('stop-typing', () => {
      setTypingUser(null);
    });

    // Listen for user join/leave events for real-time member count
    socket.on('user-joined', () => {
      loadTeamMembers();
    });
    socket.on('user-left', () => {
      loadTeamMembers();
    });

    return () => socket.disconnect();
  }, [user?.id, user?.employeeId, chatType, userId, loadMessages, loadTeamMembers, scrollToBottom]);
  

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    const tempMessage = newMessage;
    setNewMessage('');
    
    // Hide employee dropdown if open
    setShowEmployeeDropdown(false);
    setTagStartIndex(-1);
    
    try {
      const messageData = {
        message: tempMessage,
        name: user?.name || 'User',
        sender_id: user?.employeeId || user?.id || null,
        chatType
      };
      
      // Add receiver for private chats
      if (chatType === 'private' && userId) {
        messageData.receiverId = userId;
      }
      
      await chatAPI.sendMessage(messageData);
      
      // Message will be added via socket event from backend
      socketRef.current?.emit('stop-typing');
      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
      setNewMessage(tempMessage); // Restore message on error
    } finally {
      setLoading(false);
    }
  };

  // Handle @ tagging functionality
  const handleInputChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewMessage(value);
    setCursorPosition(cursorPos);

    // Check for @ symbol
    const atIndex = value.lastIndexOf('@', cursorPos - 1);
    
    if (atIndex !== -1) {
      const textAfterAt = value.substring(atIndex + 1, cursorPos);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      // If there's no space after @, show dropdown
      if (spaceIndex === -1) {
        setTagStartIndex(atIndex);
        
        // Filter employees based on search term
        const filtered = teamMembers.filter(emp => 
          emp.name && emp.name.toLowerCase().includes(textAfterAt.toLowerCase())
        );
        
        setFilteredEmployees(filtered);
        setShowEmployeeDropdown(true);
      } else {
        setShowEmployeeDropdown(false);
      }
    } else {
      setShowEmployeeDropdown(false);
    }

    // Emit typing event
    if (socketRef.current) {
      socketRef.current.emit('typing', {
        userId: user?.id,
        name: user?.name || 'User',
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop-typing');
      }, 1000);
    }
  };

  // Handle employee selection from dropdown
  const handleEmployeeSelect = (employee) => {
    const beforeTag = newMessage.substring(0, tagStartIndex);
    const afterCursor = newMessage.substring(cursorPosition);
    const newText = `${beforeTag}@${employee.name} ${afterCursor}`;
    
    setNewMessage(newText);
    setShowEmployeeDropdown(false);
    setTagStartIndex(-1);
    
    // Focus back to input and set cursor position
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPos = beforeTag.length + employee.name.length + 2;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e) => {
    if (showEmployeeDropdown && filteredEmployees.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        setShowEmployeeDropdown(false);
        return;
      }
      if (e.key === 'Tab' && filteredEmployees.length > 0) {
        e.preventDefault();
        handleEmployeeSelect(filteredEmployees[0]);
        return;
      }
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showEmployeeDropdown && filteredEmployees.length > 0) {
        handleEmployeeSelect(filteredEmployees[0]);
      } else {
        handleSend();
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white overflow-hidden">
      {/* HEADER */}
      <div className="px-4 py-3 border-b bg-blue-600 text-white flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
            <span className="text-xl">{chatType === 'team' ? '💬' : '👤'}</span>
            {chatType === 'team' ? 'Team Chat' : userName || 'Private Chat'}
          </h3>
          <p className="text-xs text-blue-100 mt-0.5">
            {chatType === 'team' 
              ? `${teamMembers.length} Member${teamMembers.length !== 1 ? 's' : ''}`
              : isOnline ? '🟢 Online' : '⚪ Offline'
            }
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 bg-white/90">
        {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center text-xs text-gray-400 mb-2 font-semibold tracking-wide">{date}</div>
            <div className="space-y-3">
              {msgs.map((msg, msgIndex) => {
                // Compare with both user.id and user.employeeId to handle both User and Employee references
                const isMe = msg.sender_id && (
                  msg.sender_id.toString() === user?.id?.toString() || 
                  msg.sender_id.toString() === user?.employeeId?.toString()
                );
                
                const displayName = isMe
                  ? user?.name || 'You'
                  : (msg.name && msg.name !== 'Unknown' ? msg.name : (msg.sender_name || 'Unknown'));
                const avatarUserId = isMe ? (user?.employeeId || user?.id) : msg.sender_id;
                return (
                  <div
                    key={msg.id || `msg-${msgIndex}-${msg.created_at}`}
                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end ${isMe ? 'flex-row-reverse' : ''} w-fit max-w-full`} style={{marginLeft: isMe ? 'auto' : 0, marginRight: isMe ? 0 : 'auto'}}>
                      {/* Avatar for others */}
                      {!isMe && (
                        <div
                          className={`w-8 h-8 rounded-full ${getAvatarColor(
                            avatarUserId
                          )} flex items-center justify-center text-white text-sm font-bold shadow mr-2 border-2 border-white`}
                        >
                          {getInitials(displayName)}
                        </div>
                      )}
                      <div className={`max-w-xs ${isMe ? 'ml-2' : 'mr-2'}`}> 
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end flex-row-reverse' : ''}`}>
                          <span className="text-xs font-semibold text-gray-700">
                            {isMe ? 'You' : displayName}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {/* Show status ticks only for sender */}
                            {isMe && msg.chatType === 'private' && (
                              <MessageStatusTick status={msg.status || 'sent'} />
                            )}
                          </span>
                        </div>
                        <div
                          className={`rounded-xl px-3 py-2 text-sm break-words shadow border transition-all duration-150 ${
                            isMe
                              ? 'bg-blue-600 text-white border-blue-700 rounded-br-none'
                              : 'bg-white text-gray-900 border-gray-300 rounded-bl-none'
                          }`}
                          style={{marginLeft: isMe ? 'auto' : 0, marginRight: isMe ? 0 : 'auto'}}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* TYPING INDICATOR */}
      {typingUser && (
        <div className="px-4 py-1 text-xs text-blue-600 italic bg-white/80 rounded-b-xl shadow-inner">
          {typingUser} is typing...
        </div>
      )}

      {/* INPUT */}
      <div className="px-4 py-2 border-t bg-white relative">
        {/* Employee Dropdown for @ tagging */}
        {showEmployeeDropdown && filteredEmployees.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
            {filteredEmployees.slice(0, 5).map((employee) => (
              <div
                key={employee._id || employee.id}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b last:border-b-0"
                onClick={() => handleEmployeeSelect(employee)}
              >
                <div className={`w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center ${getAvatarColor(employee._id || employee.id)}`}>
                  {getInitials(employee.name)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{employee.name}</div>
                  <div className="text-xs text-gray-500">{employee.role || 'Employee'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... Use @ to tag someone"
            className="flex-1 px-3 py-2 text-sm border-2 border-blue-200 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />

          <button
            onClick={handleSend}
            disabled={loading}
            className="p-2 rounded-full bg-blue-600 text-white shadow hover:scale-105 transition disabled:opacity-60"
            title="Send"
          >
            <FiSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
