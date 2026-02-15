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
        'Friend',
        'property_enquiry',
        'Website',
        'website'
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

    remarkNotes: [{
      remark: { type: String, enum: ['Interested', 'Not Interested', 'Busy', 'Invalid Number'], required: true },
      note: { type: String, default: '' },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      addedByName: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }],

    createdBy: {
      type: String,
      enum: ['website', 'dashboard'],
      default: 'website'
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// Debug middleware
leadSchema.pre('save', function(next) {
  console.log('Lead pre-save:', {
    id: this._id,
    assignedTo: this.assignedTo,
    status: this.status,
    isModified: this.isModified('assignedTo')
  });
  next();
});

leadSchema.post('save', function(doc) {
  console.log('Lead post-save:', {
    id: doc._id,
    assignedTo: doc.assignedTo,
    status: doc.status
  });
});

module.exports = mongoose.model('Lead', leadSchema);
