// =======================================
// GET UPLOAD HISTORY
// =======================================
exports.getUploadHistory = async (req, res, next) => {
  try {
    const uploads = await UploadHistory.find({}).sort({ uploadedAt: -1 });
    res.json(uploads);
  } catch (err) {
    next(err);
  }
};
// =======================================
// UPLOAD LEADS (CSV/XLSX)
// =======================================
exports.uploadLeads = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const leads = xlsx.utils.sheet_to_json(sheet);

    // Insert leads into DB (basic example, adjust as needed)
    const insertedLeads = await Lead.insertMany(leads);

    // Save upload history
    await UploadHistory.create({ filename: req.file.filename, uploadedAt: new Date(), count: insertedLeads.length });

    res.status(201).json({ message: 'Leads uploaded successfully', count: insertedLeads.length });
  } catch (err) {
    next(err);
  }
};
// ===============================
// IMPORTS (ONLY ONCE – TOP ONLY)
// ===============================
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const LeadComment = require('../models/LeadComment');
const UploadHistory = require('../models/UploadHistory');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');

const { emitToAll, emitToUser } = require('../utils/socket.util');

const xlsx = require('xlsx');
const path = require('path');
const { Parser } = require('json2csv');


// =======================================
// DOWNLOAD LEADS CSV
// =======================================
exports.downloadLeadsCSV = async (req, res, next) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end date required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const leads = await Lead.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate({ path: 'assignedTo', select: 'name email' });

    const data = leads.map(l => ({
      Name: l.name,
      Phone: l.phone,
      Email: l.email,
      Source: l.source,
      Status: l.status,
      AssignedTo: l.assignedTo ? l.assignedTo.name : '',
      AssignedToEmail: l.assignedTo ? l.assignedTo.email : '',
      CreatedAt: l.createdAt ? l.createdAt.toISOString().slice(0, 10) : ''
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`leads_${start}_to_${end}.csv`);
    res.send(csv);

  } catch (err) {
    next(err);
  }
};


// =======================================
// CREATE LEAD (Manual / Dashboard)
// =======================================
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, assignedTo, status, remarks } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    let assignedToId = null;
    if (assignedTo) {
      try {
          assignedToId = new (require('mongoose').Types.ObjectId)(assignedTo);
      } catch (e) {
        assignedToId = null;
      }
    }
    const lead = new Lead({
      name,
      phone,
      email,
      source: source || 'manual',
      assignedTo: assignedToId,
      status: status || 'new',
      remarks: remarks || '',
      createdBy: 'dashboard'
    });

    await lead.save();

    // If lead is assigned to someone during creation, notify them
    if (assignedToId) {
      try {
        const notification = await Notification.create({
          userId: assignedToId,
          type: 'LEAD_ASSIGNED',
          title: 'New Lead Assigned',
          message: `A new lead has been assigned to you: ${name} (${phone})`,
          relatedId: lead._id,
          relatedModel: 'Lead',
          data: { leadId: lead._id }
        });

        emitToUser(assignedToId.toString(), 'new-notification', {
          id: notification._id,
          type: 'LEAD_ASSIGNED',
          title: 'New Lead Assigned',
          message: notification.message,
          leadId: lead._id,
          createdAt: notification.createdAt
        });
      } catch (notifErr) {
        console.error('Failed to create lead creation notification:', notifErr);
      }
    }

    // Broadcast lead creation to all connected clients for real-time updates
    emitToAll('lead-created', { lead: lead.toObject(), timestamp: Date.now() });

    res.status(201).json(lead);

  } catch (err) {
    next(err);
  }
};


// =======================================
// GET LEADS (PAGINATED)
// =======================================
exports.getLeads = async (req, res, next) => {
  try {
    const filter = {};
    const { status, category, type, budget, location, page, limit } = req.query;

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (budget) filter.budget = { $gte: Number(budget) };
    if (location) filter.location = location;

    const currentPage = parseInt(page) || 1;
    const pageLimit = parseInt(limit) || 20;
    const skip = (currentPage - 1) * pageLimit;

    // 🔐 EMPLOYEE sees only assigned leads
    if (req.user && req.user.role === 'EMPLOYEE') {
      const employeeId = req.user.employeeId || req.user._id || req.user.id;
      filter.assignedTo = employeeId;
    }

    const totalLeads = await Lead.countDocuments(filter);

    const leads = await Lead.find(filter)
      .populate({ path: 'assignedTo', select: 'name email role' })
      .populate({ path: 'remarkNotes.addedBy', select: 'name email' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageLimit);

    res.json({
      leads,
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalLeads / pageLimit),
        totalLeads,
        pageLimit
      }
    });

  } catch (err) {
    next(err);
  }
};


// =======================================
// GET LEAD BY ID
// =======================================
exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate({ path: 'assignedTo', select: 'name email role' })
      .populate({ path: 'remarkNotes.addedBy', select: 'name email' });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(lead);

  } catch (err) {
    next(err);
  }
};


// =======================================
// UPDATE LEAD
// =======================================
exports.updateLead = async (req, res, next) => {
  try {
    let updateData = { ...req.body, updatedAt: Date.now() };
    if (updateData.assignedTo) {
      try {
        updateData.assignedTo = new (require('mongoose').Types.ObjectId)(updateData.assignedTo);
      } catch (e) {
        updateData.assignedTo = null;
      }
    }
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate({ path: 'assignedTo', select: 'name email role' });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Broadcast lead update to all connected clients for real-time updates
    emitToAll('lead-updated', { lead: lead.toObject(), timestamp: Date.now() });

    res.json(lead);

  } catch (err) {
    next(err);
  }
};

// =======================================
// UPDATE REMARKS (ASSIGNED EMPLOYEE or MANAGER)
// =======================================
exports.updateRemarks = async (req, res, next) => {
  try {
    if (req.user.role !== 'EMPLOYEE' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ message: 'Only employees and managers can update remarks' });
    }

    // EMPLOYEE can only update remarks for leads assigned to them
    if (req.user.role === 'EMPLOYEE') {
      const existingLead = await Lead.findById(req.params.id);
      if (!existingLead) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      const employeeId = req.user.employeeId || req.user._id;
      if (!existingLead.assignedTo || String(existingLead.assignedTo) !== String(employeeId)) {
        return res.status(403).json({ message: 'You can only add remarks to leads assigned to you' });
      }
    }

    const { remarks, note } = req.body;

    // Build the remark note entry
    const remarkNote = {
      remark: remarks,
      note: note || '',
      addedBy: req.user._id,
      addedByName: req.user.name || req.user.email || '',
      createdAt: new Date()
    };

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $set: { remarks, updatedAt: Date.now() },
        $push: { remarkNotes: remarkNote }
      },
      { new: true }
    ).populate('remarkNotes.addedBy', 'name email');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    emitToAll('lead-remarks-updated', {
      leadId: lead._id.toString(),
      remarks: lead.remarks,
      remarkNotes: lead.remarkNotes,
      updatedAt: lead.updatedAt
    });

    res.json(lead);

  } catch (err) {
    next(err);
  }
};


// =======================================
// ASSIGN LEAD (MANAGER / ADMIN)
// =======================================
const mongoose = require('mongoose');
// ...existing code...
exports.assignLead = async (req, res, next) => {
  try {
    console.log('Assign Lead Request:', {
      user: req.user,
      assignedTo: req.body.assignedTo,
      leadId: req.params.id
    });

    if (!req.user || !['MANAGER', 'ADMIN'].includes((req.user.role || '').toUpperCase())) {
      return res.status(403).json({ message: 'Only MANAGER or ADMIN can assign leads', userRole: req.user ? req.user.role : null });
    }

    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ message: 'assignedTo is required', received: assignedTo });
    }

    // Convert to ObjectId (fix: use 'new' keyword)
    let assignedToId;
    try {
      assignedToId = new mongoose.Types.ObjectId(assignedTo);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid assignedTo ObjectId', assignedTo });
    }

    // Check if Employee exists
    const employee = await Employee.findById(assignedToId);
    console.log('assignLead: found employee ->', employee ? { _id: employee._id.toString(), name: employee.name } : null);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found for assignedTo', assignedTo });
    }

    // First check if lead exists
    const existingLead = await Lead.findById(req.params.id);
    if (!existingLead) {
      return res.status(404).json({ message: 'Lead not found', leadId: req.params.id });
    }
    
    console.log('assignLead: existing lead before update ->', { 
      _id: existingLead._id.toString(), 
      assignedTo: existingLead.assignedTo,
      status: existingLead.status 
    });

    // Use direct MongoDB update with proper validation bypass
    const updateResult = await Lead.updateOne(
      { _id: req.params.id },
      { 
        $set: {
          assignedTo: assignedToId,
          status: 'assigned',
          updatedAt: new Date()
        }
      }
    );
    
    console.log('assignLead: MongoDB update result ->', updateResult);

    // Fetch the updated lead to verify
    const updatedLead = await Lead.findById(req.params.id).populate({ path: 'assignedTo', select: 'name email' });
    
    console.log('assignLead: final verified lead ->', { 
      _id: updatedLead._id.toString(), 
      assignedTo: updatedLead.assignedTo,
      status: updatedLead.status 
    });

    // Create notification for the assigned employee
    try {
      const notification = await Notification.create({
        userId: employee._id,
        type: 'LEAD_ASSIGNED',
        title: 'Lead Assigned',
        message: `A new lead has been assigned to you: ${updatedLead.name} (${updatedLead.phone})`,
        relatedId: updatedLead._id,
        relatedModel: 'Lead',
        data: { leadId: updatedLead._id }
      });

      // Emit socket notification to assigned employee
      emitToUser(employee._id.toString(), 'new-notification', {
        id: notification._id,
        type: 'LEAD_ASSIGNED',
        title: 'Lead Assigned',
        message: notification.message,
        leadId: updatedLead._id,
        createdAt: notification.createdAt
      });
    } catch (notifErr) {
      console.error('Failed to create lead assignment notification:', notifErr);
    }

    res.json({
      message: 'Lead assigned successfully',
      lead: updatedLead,
      assignedToEmployee: { _id: employee._id, name: employee.name, email: employee.email }
    });
  } catch (err) {
    console.error('Error in assignLead:', err);
    next(err);
  }
};


// =======================================
// COMMENTS
// =======================================
exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const newComment = new LeadComment({
      lead: req.params.id,
      author: req.user.id,
      comment
    });

    await newComment.save();

    res.status(201).json(newComment);

  } catch (err) {
    next(err);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const comments = await LeadComment.find({ lead: req.params.id })
      .sort({ createdAt: 1 });

    res.json(comments);

  } catch (err) {
    next(err);
  }
};
