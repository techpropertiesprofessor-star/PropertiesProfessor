const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    chatType: {
      type: String,
      enum: ['private', 'team'],
      required: true
    },

    // For private chats - 2 participants
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],

    // Last message info for chat list
    lastMessage: {
      type: String,
      default: null
    },

    lastMessageAt: {
      type: Date,
      default: null
    },

    lastMessageBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },

    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Index for faster participant lookups
chatSchema.index({ participants: 1 });
chatSchema.index({ chatType: 1, lastMessageAt: -1 });

// Static method to find or create private chat
chatSchema.statics.findOrCreatePrivateChat = async function(user1Id, user2Id) {
  // Find existing chat
  let chat = await this.findOne({
    chatType: 'private',
    participants: { $all: [user1Id, user2Id], $size: 2 }
  });

  // Create if doesn't exist
  if (!chat) {
    chat = await this.create({
      chatType: 'private',
      participants: [user1Id, user2Id]
    });
  }

  return chat;
};

module.exports = mongoose.model('Chat', chatSchema);
