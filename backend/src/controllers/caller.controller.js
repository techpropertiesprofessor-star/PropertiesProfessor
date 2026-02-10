const Caller = require('../models/Caller');
const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/socket.util');

exports.createCaller = async (req, res, next) => {
  try {
    const { name, phone, company, lastResponse, action, assignedTo } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });
    const caller = new Caller({ name, phone, company, lastResponse, action, assignedTo });
    await caller.save();
    
    // Create notification for assigned employee only
    if (assignedTo) {
      const notification = await Notification.create({
        userId: assignedTo,
        type: 'CALLER_ASSIGNED',
        title: 'New Caller Assigned',
        message: `A new caller has been assigned to you: ${name} (${phone})`,
        relatedId: caller._id,
        relatedModel: 'Caller',
        data: { callerId: caller._id, callerName: name, callerPhone: phone }
      });
      
      // Emit socket notification to assigned employee only
      emitToUser(assignedTo, 'new-notification', {
        id: notification._id,
        type: 'CALLER_ASSIGNED',
        title: 'New Caller Assigned',
        message: notification.message,
        callerId: caller._id,
        createdAt: notification.createdAt
      });
    }
    
    res.status(201).json(caller);
  } catch (err) {
    next(err);
  }
};

exports.getCallers = async (req, res, next) => {
  try {
    const { search = '', page = 1, pageSize = 0 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    // If EMPLOYEE, only show callers assigned to them
    if (req.user && req.user.role === 'EMPLOYEE') {
      // Use employeeId from token for EMPLOYEE
      query.assignedTo = req.user.employeeId || req.user._id;
    }
    let callersQuery = Caller.find(query)
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name');
    if (pageSize > 0) {
      callersQuery = callersQuery.skip((page - 1) * pageSize).limit(Number(pageSize));
    }
    const callers = await callersQuery;
    const total = await Caller.countDocuments(query);
    // Map assignedTo to assignedToName for frontend compatibility
    const callersWithNames = callers.map(caller => {
      const obj = caller.toObject();
      obj.assignedToName = obj.assignedTo && obj.assignedTo.name ? obj.assignedTo.name : '';
      obj.assignedTo = obj.assignedTo && obj.assignedTo._id ? obj.assignedTo._id : obj.assignedTo;
      return obj;
    });
    res.json({ data: callersWithNames, total });
  } catch (err) {
    next(err);
  }
};

exports.updateCaller = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { name, phone, company, lastResponse, action, assignedTo } = req.body;
    
    // Get old caller to check if assignment changed
    const oldCaller = await Caller.findById(id);
    const assignmentChanged = oldCaller && oldCaller.assignedTo && assignedTo && 
                              oldCaller.assignedTo.toString() !== assignedTo.toString();
    
    const caller = await Caller.findByIdAndUpdate(
      id,
      { name, phone, company, lastResponse, action, assignedTo },
      { new: true }
    );
    if (!caller) return res.status(404).json({ message: 'Caller not found' });
    
    // Create notification if assignment changed to new employee
    if (assignmentChanged) {
      const notification = await Notification.create({
        userId: assignedTo,
        type: 'CALLER_ASSIGNED',
        title: 'Caller Assigned',
        message: `A caller has been assigned to you: ${name} (${phone})`,
        relatedId: caller._id,
        relatedModel: 'Caller',
        data: { callerId: caller._id, callerName: name, callerPhone: phone }
      });
      
      // Emit socket notification to newly assigned employee only
      emitToUser(assignedTo, 'new-notification', {
        id: notification._id,
        type: 'CALLER_ASSIGNED',
        title: 'Caller Assigned',
        message: notification.message,
        callerId: caller._id,
        createdAt: notification.createdAt
      });
    }
    
    res.json(caller);
  } catch (err) {
    next(err);
  }
};

exports.deleteCaller = async (req, res, next) => {
  try {
    const id = req.params.id;
    const caller = await Caller.findByIdAndDelete(id);
    if (!caller) return res.status(404).json({ message: 'Caller not found' });
    res.json({ message: 'Caller deleted' });
  } catch (err) {
    next(err);
  }
};
