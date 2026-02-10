const Message = require('../models/Message');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');

// ==============================
// GET CHAT LIST (Private chats)
// ==============================
exports.getChatList = async (req, res, next) => {
  try {
    const userId = req.user.employeeId || req.user.id;
    console.log('📋 getChatList called for userId:', userId);
    
    const chats = await Chat.find({
      participants: userId
    })
    .populate('participants', 'name email isOnline')
    .populate('lastMessageBy', 'name')
    .sort({ lastMessageAt: -1 });

    console.log('📋 Found chats:', chats.length);

    const chatList = chats.map(chat => {
      const otherParticipant = chat.participants.find(
        p => p._id.toString() !== userId.toString()
      );
      
      return {
        _id: chat._id,
        chatType: chat.chatType,
        otherParticipant: otherParticipant ? {
          _id: otherParticipant._id,
          name: otherParticipant.name,
          email: otherParticipant.email,
          isOnline: otherParticipant.isOnline
        } : null,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        lastMessageBy: chat.lastMessageBy,
        unreadCount: chat.unreadCount?.get(userId.toString()) || 0
      };
    });

    console.log('📋 Returning chatList:', JSON.stringify(chatList, null, 2));
    res.json({ chats: chatList });
  } catch (err) {
    console.error('❌ Error in getChatList:', err);
    next(err);
  }
};

// ==============================
// DEBUG EMPLOYEES
// ==============================
exports.debugEmployees = async (req, res, next) => {
  try {
    const allEmployees = await Employee.find({});
    const filteredEmployees = await Employee.find({ 
      role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] }, 
      status: 'active' 
    });

    res.json({
      total: allEmployees.length,
      filtered: filteredEmployees.length,
      allEmployees: allEmployees.map(e => ({
        id: e._id,
        name: e.name,
        role: e.role,
        status: e.status
      })),
      filteredEmployees: filteredEmployees.map(e => ({
        id: e._id,
        name: e.name,
        role: e.role,
        status: e.status
      }))
    });
  } catch (err) {
    next(err);
  }
};

// ==============================
// UPLOAD ATTACHMENT
// ==============================
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ message: 'Socket not initialized' });
    }

    // Use employeeId if available (for EMPLOYEE role), otherwise use user id
    const sender = req.user.employeeId || req.user.id;
    const { message } = req.body;
    const attachment_url = `/uploads/chat/${req.file.filename}`;

    const msg = await Message.create({
      sender,
      message,
      attachment_url
    });


    const populated = await msg.populate('sender', 'name');

    const senderData = populated.sender
      ? {
          sender_id: populated.sender._id,
          name: populated.sender.name
        }
      : {
          sender_id: null,
          name: 'Unknown'
        };

    io.emit('chat-message', {
      id: msg._id,
      ...senderData,
      message,
      attachment_url,
      created_at: msg.created_at
    });

    res.status(201).json({ message: 'File uploaded successfully', msg });
  } catch (err) {
    next(err);
  }
};

// ==============================
// SEND MESSAGE
// ==============================
exports.sendMessage = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    if (!io) {
      return res.status(500).json({ message: 'Socket not initialized' });
    }

    const { message, attachment_url, name, receiverId, chatType = 'team' } = req.body;
    // Use employeeId if available (for EMPLOYEE role), otherwise use user id
    const sender = req.user.employeeId || req.user.id;

    if (!message && !attachment_url) {
      return res.status(400).json({ message: 'Message or attachment required' });
    }

    // Create message with initial status 'sent'
    const msg = await Message.create({
      sender,
      receiver: receiverId || null,
      chatType: chatType || 'team',
      sender_name: name || 'Unknown',
      message,
      attachment_url,
      status: 'sent'
    });

    const populated = await msg.populate('sender', 'name email socketId');
    const receiver = receiverId ? await Employee.findById(receiverId).select('name email socketId') : null;

    const senderData = populated.sender
      ? {
          sender_id: populated.sender._id,
          name: populated.sender.name,
          socketId: populated.sender.socketId
        }
      : {
          sender_id: null,
          name: msg.sender_name || 'Unknown',
          socketId: null
        };

    // Update chat document
    if (chatType === 'private' && receiverId) {
      console.log('💬 Creating/updating private chat between:', sender, 'and', receiverId);
      const chat = await Chat.findOrCreatePrivateChat(sender, receiverId);
      console.log('💬 Chat found/created:', chat._id);
      chat.lastMessage = message;
      chat.lastMessageAt = new Date();
      chat.lastMessageBy = sender;
      
      // Increment unread count for receiver
      const receiverUnread = chat.unreadCount.get(receiverId.toString()) || 0;
      chat.unreadCount.set(receiverId.toString(), receiverUnread + 1);
      await chat.save();
      console.log('💬 Chat saved successfully');
    }

    const messageData = {
      id: msg._id,
      ...senderData,
      receiver_id: receiverId || null,
      chatType: chatType,
      message,
      attachment_url,
      status: 'sent',
      created_at: msg.created_at
    };

    // Emit to appropriate room
    if (chatType === 'private' && receiverId) {
      // Send to specific receiver
      if (receiver?.socketId) {
        io.to(receiver.socketId).emit('chat-message', messageData);
        
        // Mark as delivered immediately if receiver is online
        if (receiver.socketId) {
          msg.status = 'delivered';
          msg.deliveredAt = new Date();
          await msg.save();
          
          // Notify sender about delivery
          if (senderData.socketId) {
            io.to(senderData.socketId).emit('message-delivered', {
              messageId: msg._id,
              deliveredAt: msg.deliveredAt
            });
          }
        }
      }
      
      // Also send back to sender for confirmation
      if (senderData.socketId) {
        io.to(senderData.socketId).emit('chat-message', {
          ...messageData,
          status: msg.status
        });
      }
    } else {
      // Team message - broadcast to all
      io.emit('chat-message', messageData);
    }

    // Create notifications
    if (chatType === 'private' && receiverId && receiver) {
      // Private message notifications
      try {
        await Notification.create({
          userId: receiverId,
          type: 'PRIVATE_MESSAGE',
          title: 'New Message',
          message: `${senderData.name}: ${message}`,
          data: { messageId: msg._id, chatType: 'private' },
          isRead: false
        });

        if (receiver.socketId) {
          io.to(receiver.socketId).emit('new-notification', {
            type: 'PRIVATE_MESSAGE',
            title: 'New Message',
            message: `${senderData.name}: ${message}`,
            data: { messageId: msg._id, chatType: 'private' },
            createdAt: new Date()
          });
        }
      } catch (notifError) {
        console.error('❌ Error creating private message notification:', notifError);
      }
    } else if (chatType === 'team') {
      // Team chat notifications - send to all team members except sender
      try {
        const allEmployees = await Employee.find({ 
          status: 'active',
          _id: { $ne: sender } // Exclude sender
        }).select('_id socketId name');

        const notifications = allEmployees.map(employee => ({
          userId: employee._id,
          type: 'TEAM_CHAT',
          title: 'New Team Message',
          message: `${senderData.name} sent a team chat message: ${message}`,
          data: { messageId: msg._id, chatType: 'team' },
          isRead: false
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);

          // Send real-time notifications to online users
          allEmployees.forEach(employee => {
            if (employee.socketId) {
              io.to(employee.socketId).emit('new-notification', {
                type: 'TEAM_CHAT',
                title: 'New Team Message',
                message: `${senderData.name} sent a team chat message: ${message}`,
                data: { messageId: msg._id, chatType: 'team' },
                createdAt: new Date()
              });
            }
          });

          console.log(`📨 Team chat notifications sent to ${notifications.length} employees`);
        }
      } catch (notifError) {
        console.error('❌ Error creating team chat notifications:', notifError);
      }
    }

    res.status(201).json({ message: 'Message sent successfully', msg: messageData });
  } catch (err) {
    next(err);
  }
};

// ==============================
// GET ALL MESSAGES (Team or Private)
// ==============================
exports.getMessages = async (req, res, next) => {
  try {
    const { chatType = 'team', userId } = req.query;
    const currentUserId = req.user.employeeId || req.user.id;
    
    let query = {};
    
    if (chatType === 'team') {
      query.chatType = 'team';
    } else if (chatType === 'private' && userId) {
      // Get messages between current user and specific user
      query = {
        chatType: 'private',
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId }
        ]
      };
    } else {
      return res.status(400).json({ message: 'Invalid query parameters' });
    }
    
    const messages = await Message.find(query)
      .sort({ created_at: 1 })
      .populate('sender', 'name')
      .populate('receiver', 'name');

    res.json(
      messages.map((msg) => ({
        id: msg._id,
        sender_id: msg.sender ? msg.sender._id : null,
        receiver_id: msg.receiver ? msg.receiver._id : null,
        name: msg.sender ? msg.sender.name : (msg.sender_name || 'Unknown'),
        receiverName: msg.receiver ? msg.receiver.name : null,
        message: msg.message,
        chatType: msg.chatType,
        status: msg.status,
        attachment_url: msg.attachment_url,
        created_at: msg.created_at,
        deliveredAt: msg.deliveredAt,
        seenAt: msg.seenAt
      }))
    );
  } catch (err) {
    next(err);
  }
};

// ==============================
// MARK MESSAGE AS DELIVERED
// ==============================
exports.markAsDelivered = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.employeeId || req.user.id;
    
    const message = await Message.findById(messageId).populate('sender', 'socketId');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only receiver can mark as delivered
    if (message.receiver?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (message.status === 'sent') {
      message.status = 'delivered';
      message.deliveredAt = new Date();
      await message.save();
      
      // Notify sender via socket
      const io = req.app.get('io');
      if (io && message.sender?.socketId) {
        io.to(message.sender.socketId).emit('message-delivered', {
          messageId: message._id,
          deliveredAt: message.deliveredAt
        });
      }
    }
    
    res.json({ success: true, status: message.status });
  } catch (err) {
    next(err);
  }
};

// ==============================
// MARK MESSAGE AS SEEN
// ==============================
exports.markAsSeen = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.employeeId || req.user.id;
    
    const message = await Message.findById(messageId).populate('sender', 'socketId');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Only receiver can mark as seen
    if (message.receiver?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    if (message.status !== 'seen') {
      message.status = 'seen';
      message.seenAt = new Date();
      if (!message.deliveredAt) {
        message.deliveredAt = new Date();
      }
      await message.save();
      
      // Notify sender via socket
      const io = req.app.get('io');
      if (io && message.sender?.socketId) {
        io.to(message.sender.socketId).emit('message-seen', {
          messageId: message._id,
          seenAt: message.seenAt
        });
      }
      
      // Update chat unread count
      if (message.chatType === 'private') {
        const chat = await Chat.findOne({
          participants: { $all: [message.sender, message.receiver] }
        });
        
        if (chat) {
          const userIdStr = userId.toString();
          const currentUnread = chat.unreadCount.get(userIdStr) || 0;
          chat.unreadCount.set(userIdStr, Math.max(0, currentUnread - 1));
          await chat.save();
        }
      }
    }
    
    res.json({ success: true, status: message.status });
  } catch (err) {
    next(err);
  }
};

// ==============================
// MARK ALL MESSAGES AS SEEN (for a chat)
// ==============================
exports.markChatAsSeen = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.employeeId || req.user.id;
    
    // Find all unread messages from userId to currentUser
    const messages = await Message.find({
      sender: userId,
      receiver: currentUserId,
      chatType: 'private',
      status: { $in: ['sent', 'delivered'] }
    }).populate('sender', 'socketId');
    
    if (messages.length === 0) {
      return res.json({ success: true, count: 0 });
    }
    
    const now = new Date();
    const io = req.app.get('io');
    const messageIds = [];
    
    for (const message of messages) {
      message.status = 'seen';
      message.seenAt = now;
      if (!message.deliveredAt) {
        message.deliveredAt = now;
      }
      await message.save();
      messageIds.push(message._id);
      
      // Notify sender
      if (io && message.sender?.socketId) {
        io.to(message.sender.socketId).emit('message-seen', {
          messageId: message._id,
          seenAt: now
        });
      }
    }
    
    // Reset unread count
    const chat = await Chat.findOne({
      participants: { $all: [userId, currentUserId] }
    });
    
    if (chat) {
      chat.unreadCount.set(currentUserId.toString(), 0);
      await chat.save();
    }
    
    res.json({ success: true, count: messages.length, messageIds });
  } catch (err) {
    next(err);
  }
};
