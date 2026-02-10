// Download leads as CSV by date range
const { Parser } = require('json2csv');
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
    return res.send(csv);
  } catch (err) {
    next(err);
  }
};
// Manual lead creation (for dashboard form)
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, assignedTo, status, remarks } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }
    const lead = new Lead({
      name,
      phone,
      email,
      source: source || 'manual',
      assignedTo: assignedTo || null,
      status: status || 'new',
      remarks: remarks || '',
      createdBy: 'dashboard'
    });
    await lead.save();
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
};
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const LeadComment = require('../models/LeadComment');
const UploadHistory = require('../models/UploadHistory');
const Employee = require('../models/Employee');
const xlsx = require('xlsx');
const path = require('path');

// Helper: Detect duplicate by email or phone
async function isDuplicateLead(email, phone) {
  if (!email && !phone) return false;
  const query = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });
  return await Lead.findOne({ $or: query });
}

exports.uploadLeads = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    let totalLeads = 0, duplicateLeads = 0;
    const uploadHistory = new UploadHistory({
      filename: req.file.filename,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
      totalLeads: 0,
      duplicateLeads: 0
    });
    await uploadHistory.save();
    for (const row of rows) {
      const { name, email, phone, status, category, type, budget, location } = row;
      if (!name) continue;
      const duplicate = await isDuplicateLead(email, phone);
      if (duplicate) {
        duplicateLeads++;
        continue;
      }
      const lead = new Lead({
        name, email, phone, status, category, type, budget, location,
        uploadHistory: uploadHistory._id
      });
      await lead.save();
      totalLeads++;
    }
    uploadHistory.totalLeads = totalLeads;
    uploadHistory.duplicateLeads = duplicateLeads;
    await uploadHistory.save();
    res.status(201).json({ message: 'Leads uploaded', totalLeads, duplicateLeads });
  } catch (err) {
    next(err);
  }
};

const Contact = require('../models/Contact');
const { emitToAll } = require('../utils/socket.util');

exports.getLeads = async (req, res, next) => {
  try {
    const filter = {};
    const { status, category, type, budget, location, page, limit } = req.query;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (budget) filter.budget = { $gte: Number(budget) };
    if (location) filter.location = location;

    // Pagination parameters
    const currentPage = parseInt(page) || 1;
    const pageLimit = parseInt(limit) || 20;
    const skip = (currentPage - 1) * pageLimit;

    // Debug log for req.user and filter
    console.log('getLeads called by user:', req.user);

    // Only show leads assigned to the logged-in employee if role is EMPLOYEE
    if (req.user && req.user.role === 'EMPLOYEE') {
      const employeeId = req.user.employeeId || req.user._id || req.user.id;
      filter.assignedTo = employeeId;
      console.log('EMPLOYEE detected, filtering leads for assignedTo:', employeeId);
    }

    console.log('Final filter for leads:', filter);
    
    // Fetch leads from Lead collection with pagination
    const leads = await Lead.find(filter)
      .populate({ path: 'assignedTo', select: 'name email role' })
      .sort({ createdAt: -1 });

    // Fetch leads from Contact collection (no assignment possible)
    const contacts = await Contact.find({})
      .sort({ createdAt: -1 });

    // Normalize Contact fields to match Lead fields for frontend
    const normalizedContacts = contacts.map(c => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      source: c.source || 'contact_form',
      status: 'new',
      assignedTo: null,
      remarks: c.message || '',
      createdBy: 'website',
      createdAt: c.createdAt,
      // Add any other fields as needed for frontend compatibility
    }));

    // Merge and sort all leads by createdAt (desc) - most recent first
    const allLeads = [...leads, ...normalizedContacts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const totalLeads = allLeads.length;
    const paginatedLeads = allLeads.slice(skip, skip + pageLimit);
    const totalPages = Math.ceil(totalLeads / pageLimit);

    res.json({
      leads: paginatedLeads,
      pagination: {
        currentPage,
        totalPages,
        totalLeads,
        pageLimit
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    next(err);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    console.log('🔄 updateLead called for lead:', req.params.id);
    const { name, email, phone, status, category, type, budget, location, assignedTo, remarks } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, status, category, type, budget, location, assignedTo, remarks, updatedAt: Date.now() },
      { new: true }
    ).populate({ path: 'assignedTo', select: 'name email role' });
    
    if (!lead) {
      console.log('❌ Lead not found in updateLead:', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    console.log('✅ Lead updated in updateLead:', lead._id);
    
    // Emit real-time update for remarks
    if (remarks !== undefined) {
      try {
        emitToAll('lead-remarks-updated', {
          leadId: lead._id.toString(),
          remarks: lead.remarks,
          updatedAt: lead.updatedAt
        });
        console.log('📡 Socket.IO event emitted from updateLead');
      } catch (socketErr) {
        console.error('❌ Socket.IO emit error in updateLead:', socketErr);
      }
    }
    
    res.json(lead);
  } catch (err) {
    console.error('❌ updateLead error:', err);
    next(err);
  }
};

// Update remarks endpoint - only EMPLOYEE can update remarks
exports.updateRemarks = async (req, res, next) => {
  try {
    console.log('📝 updateRemarks called for lead:', req.params.id);
    console.log('📝 Remarks value:', req.body.remarks);
    console.log('📝 User:', req.user);
    
    // Only allow EMPLOYEE role to update remarks
    if (req.user.role !== 'EMPLOYEE') {
      console.log('❌ Unauthorized: Only employees can update remarks');
      return res.status(403).json({ message: 'Only employees can update remarks' });
    }
    
    const { remarks } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { remarks, updatedAt: Date.now() },
      { new: true }
    ).populate({ path: 'assignedTo', select: 'name email role' });
    
    if (!lead) {
      console.log('❌ Lead not found:', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    console.log('✅ Lead updated successfully:', lead._id);
    
    // Emit real-time update to all connected clients
    try {
      emitToAll('lead-remarks-updated', {
        leadId: lead._id.toString(),
        remarks: lead.remarks,
        updatedAt: lead.updatedAt
      });
      console.log('📡 Socket.IO event emitted successfully');
    } catch (socketErr) {
      console.error('❌ Socket.IO emit error:', socketErr);
    }
    
    res.json(lead);
  } catch (err) {
    console.error('❌ updateRemarks error:', err);
    next(err);
  }
};

const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/socket.util');
exports.assignLead = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { assignedTo, assignedBy: req.user.id, status: 'assigned', updatedAt: Date.now() },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Create notification for assigned employee
    const notification = await Notification.create({
      userId: assignedTo,
      type: 'lead-assigned',
      title: 'New Lead Assigned',
      message: `A new lead has been assigned to you: ${lead.name || lead._id}`,
      relatedId: lead._id,
      relatedModel: 'Lead',
      data: { leadId: lead._id }
    });
    // Emit real-time notification to employee
    emitToUser(assignedTo, 'new-notification', {
      id: notification._id,
      title: 'New Lead Assigned',
      message: notification.message,
      leadId: lead._id,
      created_at: notification.createdAt
    });

    res.json(lead);
  } catch (err) {
    next(err);
  }
};

exports.getUploadHistory = async (req, res, next) => {
  try {
    const uploads = await UploadHistory.find({}).sort({ uploadedAt: -1 });
    res.json(uploads);
  } catch (err) {
    next(err);
  }
};

// Comments
exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ message: 'Comment is required' });
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
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
    const comments = await LeadComment.find({ lead: req.params.id }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    next(err);
  }
};
