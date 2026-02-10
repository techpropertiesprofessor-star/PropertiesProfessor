const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },

    // For one-to-one chats
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null // null means it's a team message
    },

    // Chat type
    chatType: {
      type: String,
      enum: ['team', 'private'],
      default: 'team'
    },

    // Message status (WhatsApp-style)
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent'
    },

    // When message was delivered
    deliveredAt: {
      type: Date,
      default: null
    },

    // When message was seen
    seenAt: {
      type: Date,
      default: null
    },

    // 🔥 SNAPSHOT (OLD DATA SAFE)
    sender_name: {
      type: String,
    },

    message: {
      type: String,
      required: true,
    },

    attachment_url: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Index for faster queries
messageSchema.index({ sender: 1, receiver: 1, created_at: -1 });
messageSchema.index({ chatType: 1, created_at: -1 });

module.exports = mongoose.model('Message', messageSchema);
