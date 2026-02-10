const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    phone: {
      type: String,
      required: true
    },

    email: {
      type: String,
      lowercase: true,
      default: null
    },

    source: {
      type: String,
      enum: [
        'contact_form',
        'schedule_visit',
        'whatsapp',
        'chatbot',
        'manual',
        'Friend'
      ]
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null
    },

    // Time for schedule_visit leads
    visitTime: {
      type: Date,
      default: null
    },

    message: {
      type: String,
      default: ''
    },

    status: {
      type: String,
      enum: ['new', 'assigned', 'interested', 'callback', 'closed'],
      default: 'new'
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },

    remarks: {
      type: String,
      default: ''
    },

    createdBy: {
      type: String,
      enum: ['website', 'dashboard'],
      default: 'website'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
