// =======================================
// CHECK LEAD BY PHONE (duplicate check)
// =======================================
exports.checkLeadByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const lead = await Lead.findOne({ phone }).select('_id name phone');
    return res.json({ exists: !!lead, lead: lead || null });
  } catch (err) {
    next(err);
  }
};

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
// REMOVE DUPLICATE LEADS (Keep oldest one)
// =======================================
exports.removeDuplicateLeads = async (req, res, next) => {
  try {
    const duplicates = await Lead.aggregate([
      {
        $group: {
          _id: '$phone',
          count: { $sum: 1 },
          docs: { $push: '$_id' },
          firstDoc: { $first: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    let deletedCount = 0;
    for (const dup of duplicates) {
      // Keep the first (oldest) document, delete the rest
      const toDelete = dup.docs.filter(id => !id.equals(dup.firstDoc));
      if (toDelete.length > 0) {
        const result = await Lead.deleteMany({ _id: { $in: toDelete } });
        deletedCount += result.deletedCount;
      }
    }

    res.json({ 
      message: 'Duplicate leads removed successfully', 
      duplicateGroupsFound: duplicates.length,
      deletedCount 
    });
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

    // Filter out duplicate leads based on phone number
    const phoneNumbers = leads.map(lead => lead.phone?.toString().trim()).filter(Boolean);
    const existingLeads = await Lead.find({ phone: { $in: phoneNumbers } }).select('phone');
    const existingPhones = new Set(existingLeads.map(lead => lead.phone?.toString().trim()));
    
    // Remove duplicates from file itself (keep first occurrence)
    const seenPhones = new Set();
    const uniqueNewLeads = leads.filter(lead => {
      const phone = lead.phone?.toString().trim();
      if (!phone || existingPhones.has(phone) || seenPhones.has(phone)) {
        return false;
      }
      seenPhones.add(phone);
      return true;
    });

    let insertedLeads = [];
    if (uniqueNewLeads.length > 0) {
      insertedLeads = await Lead.insertMany(uniqueNewLeads);
    }

    // Save upload history
    await UploadHistory.create({ filename: req.file.filename, uploadedAt: new Date(), count: insertedLeads.length });

    const skippedCount = leads.length - insertedLeads.length;
    res.status(201).json({ 
      message: 'Leads uploaded successfully', 
      count: insertedLeads.length,
      skipped: skippedCount,
      total: leads.length
    });
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
const InventoryUnit = require('../models/InventoryUnit');
const Project = require('../models/Project');

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
// CREATE LEAD (Website / Dashboard)
// =======================================
exports.createLead = async (req, res, next) => {
  try {
    const { name, phone, email, source, assignedTo, status, remarks, propertyId, message, visitTime, createdBy } = req.body;

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

    // Resolve property details
    let resolvedPropertyId = null;
    let resolvedPropertyName = req.body.propertyName || '';
    let resolvedPropertyUrl = req.body.propertyUrl || '';

    // Priority 1: Direct propertyId (if website/dashboard sends it)
    if (propertyId) {
      try {
        const validId = new (require('mongoose').Types.ObjectId)(propertyId);
        const unit = await InventoryUnit.findById(validId)
          .populate({ path: 'project', select: 'name' })
          .populate({ path: 'tower', select: 'name' });

        if (unit) {
          resolvedPropertyId = unit._id;
          const parts = [
            unit.project?.name,
            unit.tower?.name,
            unit.unitNumber
          ].filter(Boolean);
          resolvedPropertyName = parts.join(' - ') || `Unit ${unit._id}`;
          resolvedPropertyUrl = `https://dashboard.propertiesprofessor.com/property/${unit._id}`;
        }
      } catch (e) {
        console.warn('Invalid propertyId provided for lead:', propertyId);
      }
    }

    // Priority 2: Auto-match from message field (only for website leads, skip if propertyUrl already provided)
    if (!resolvedPropertyId && !resolvedPropertyUrl && message && message.trim()) {
      try {
        const msgLower = message.trim().toLowerCase();

        // Search projects whose name appears in the message
        const projects = await Project.find({}).select('name').lean();
        let matchedProject = null;
        for (const proj of projects) {
          if (proj.name && msgLower.includes(proj.name.toLowerCase())) {
            matchedProject = proj;
            break;
          }
        }

        // If project matched, find a unit in that project
        if (matchedProject) {
          const unit = await InventoryUnit.findOne({ project: matchedProject._id })
            .populate({ path: 'project', select: 'name' })
            .populate({ path: 'tower', select: 'name' })
            .sort({ createdAt: -1 });

          if (unit) {
            resolvedPropertyId = unit._id;
            const parts = [
              unit.project?.name,
              unit.tower?.name,
              unit.unitNumber
            ].filter(Boolean);
            resolvedPropertyName = parts.join(' - ') || `Unit ${unit._id}`;
            resolvedPropertyUrl = `https://dashboard.propertiesprofessor.com/property/${unit._id}`;
          }
        }

        // If no project match, try matching building_name directly
        if (!resolvedPropertyId) {
          const unitByBuilding = await InventoryUnit.findOne({
            building_name: { $regex: new RegExp(msgLower.split(/\s+/).filter(w => w.length > 2).join('|'), 'i') }
          })
            .populate({ path: 'project', select: 'name' })
            .populate({ path: 'tower', select: 'name' })
            .sort({ createdAt: -1 });

          if (unitByBuilding) {
            resolvedPropertyId = unitByBuilding._id;
            const parts = [
              unitByBuilding.project?.name,
              unitByBuilding.tower?.name,
              unitByBuilding.unitNumber
            ].filter(Boolean);
            resolvedPropertyName = parts.join(' - ') || `Unit ${unitByBuilding._id}`;
            resolvedPropertyUrl = `https://dashboard.propertiesprofessor.com/property/${unitByBuilding._id}`;
          }
        }
      } catch (e) {
        console.warn('Auto-match property from message failed:', e.message);
      }
    }

    // Determine createdBy — website sources auto-detect, or accept from body
    const websiteSources = ['contact_form', 'schedule_visit', 'property_enquiry', 'Website', 'website', 'whatsapp', 'chatbot'];
    const isWebsite = createdBy === 'website' || websiteSources.includes(source);

    const lead = new Lead({
      name,
      phone,
      email,
      source: source || 'manual',
      message: message || '',
      visitTime: visitTime || null,
      assignedTo: assignedToId,
      status: status || 'new',
      remarks: remarks || '',
      createdBy: isWebsite ? 'website' : 'dashboard',
      propertyId: resolvedPropertyId,
      propertyName: resolvedPropertyName,
      propertyUrl: resolvedPropertyUrl
    });

    await lead.save();

    // If lead is assigned to someone during creation, notify them
    if (assignedToId) {
      try {
        const propertyInfo = resolvedPropertyName ? ` | Property: ${resolvedPropertyName}` : '';
        const notification = await Notification.create({
          userId: assignedToId,
          type: 'LEAD_ASSIGNED',
          title: 'New Lead Assigned',
          message: `A new lead has been assigned to you: ${name} (${phone})${propertyInfo}`,
          relatedId: lead._id,
          relatedModel: 'Lead',
          data: { leadId: lead._id, propertyId: resolvedPropertyId, propertyUrl: resolvedPropertyUrl }
        });

        emitToUser(assignedToId.toString(), 'new-notification', {
          id: notification._id,
          type: 'LEAD_ASSIGNED',
          title: 'New Lead Assigned',
          message: notification.message,
          leadId: lead._id,
          propertyUrl: resolvedPropertyUrl,
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
    const { status, category, type, budget, location, page, limit, source } = req.query;

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (budget) filter.budget = { $gte: Number(budget) };
    if (location) filter.location = location;

    // Source tab filtering
    if (source) {
      if (source === 'website') {
        filter.source = {
          $in: ['contact_form', 'schedule_visit', 'whatsapp', 'chatbot', 'manual', 'Friend', 'property_enquiry', 'Website', 'website']
        };
      } else {
        filter.source = source;
      }
    }

    const currentPage = parseInt(page) || 1;
    const pageLimit = parseInt(limit) || 20;
    const skip = (currentPage - 1) * pageLimit;

    // 🔐 EMPLOYEE sees only assigned leads
    if (req.user && req.user.role === 'EMPLOYEE') {
      const employeeId = req.user.employeeId || req.user._id || req.user.id;
      filter.assignedTo = employeeId;
    }

    // Use aggregation to show Interested leads first, then by date
    const totalLeads = await Lead.countDocuments(filter);
    
    const leads = await Lead.aggregate([
      { $match: filter },
      {
        $addFields: {
          remarkPriority: {
            $switch: {
              branches: [
                { case: { $eq: ['$remarks', 'Interested'] }, then: 1 },
                { case: { $eq: ['$remarks', 'Busy'] }, then: 2 },
                { case: { $eq: ['$remarks', 'Not Interested'] }, then: 3 },
                { case: { $eq: ['$remarks', 'Invalid Number'] }, then: 4 }
              ],
              default: 5
            }
          }
        }
      },
      { $sort: { remarkPriority: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: pageLimit }
    ]);

    // Populate the results
    await Lead.populate(leads, [
      { path: 'assignedTo', select: 'name email role' },
      { path: 'remarkNotes.addedBy', select: 'name email' },
      { path: 'propertyId', select: 'unitNumber project tower bhk floor_number' }
    ]);

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
};;


// =======================================
// GET LEAD BY ID
// =======================================
exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate({ path: 'assignedTo', select: 'name email role' })
      .populate({ path: 'remarkNotes.addedBy', select: 'name email' })
      .populate({ path: 'propertyId', select: 'unitNumber project tower bhk floor_number' });

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
        $set: { remarks, status: 'completed', updatedAt: Date.now() },
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
// UPDATE LEAD PROPERTY (MANAGER / ADMIN)
// =======================================
exports.updateLeadProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'propertyId is required' });
    }

    // Validate and fetch unit
    let validId;
    try {
      validId = new mongoose.Types.ObjectId(propertyId);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid propertyId format' });
    }

    const unit = await InventoryUnit.findById(validId)
      .populate({ path: 'project', select: 'name' })
      .populate({ path: 'tower', select: 'name' });

    if (!unit) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const parts = [
      unit.project?.name,
      unit.tower?.name,
      unit.unitNumber
    ].filter(Boolean);
    const propertyName = parts.join(' - ') || `Unit ${unit._id}`;
    const propertyUrl = `https://dashboard.propertiesprofessor.com/property/${unit._id}`;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          propertyId: unit._id,
          propertyName,
          propertyUrl,
          updatedAt: Date.now()
        }
      },
      { new: true }
    ).populate({ path: 'assignedTo', select: 'name email role' })
     .populate({ path: 'propertyId', select: 'unitNumber project tower bhk floor_number' });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    emitToAll('lead-updated', { lead: lead.toObject(), timestamp: Date.now() });

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
      const propertyInfo = existingLead.propertyName ? ` | Property: ${existingLead.propertyName}` : '';
      const notification = await Notification.create({
        userId: employee._id,
        type: 'LEAD_ASSIGNED',
        title: 'Lead Assigned',
        message: `A new lead has been assigned to you: ${updatedLead.name} (${updatedLead.phone})${propertyInfo}`,
        relatedId: updatedLead._id,
        relatedModel: 'Lead',
        data: { leadId: updatedLead._id, propertyId: existingLead.propertyId, propertyUrl: existingLead.propertyUrl }
      });

      // Emit socket notification to assigned employee
      emitToUser(employee._id.toString(), 'new-notification', {
        id: notification._id,
        type: 'LEAD_ASSIGNED',
        title: 'Lead Assigned',
        message: notification.message,
        leadId: updatedLead._id,
        propertyUrl: existingLead.propertyUrl || '',
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
