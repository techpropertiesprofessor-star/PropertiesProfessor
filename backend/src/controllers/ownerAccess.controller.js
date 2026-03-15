const OwnerAccessRequest = require('../models/OwnerAccessRequest');
const InventoryUnit = require('../models/InventoryUnit');
const Employee = require('../models/Employee');
const { emitToAll, emitToUser } = require('../utils/socket.util');

// ── Helpers (exported for use in inventory controller) ──

/**
 * Check if an employee has valid (approved + non-expired) access to a unit.
 */
async function hasValidAccess(unitId, employeeId) {
  const now = new Date();
  const grant = await OwnerAccessRequest.findOne({
    unitId,
    requesterId: employeeId,
    status: 'APPROVED',
    expiresAt: { $gt: now }
  }).select('expiresAt').lean();

  if (grant) {
    return { hasAccess: true, expiresAt: grant.expiresAt };
  }

  // Lazily expire any stale APPROVED records for this pair
  await OwnerAccessRequest.updateMany(
    { unitId, requesterId: employeeId, status: 'APPROVED', expiresAt: { $lte: now } },
    { $set: { status: 'EXPIRED', updatedAt: now } }
  );

  return { hasAccess: false, expiresAt: null };
}

/**
 * Batch check access for multiple unit IDs for a single employee.
 * Returns { [unitId]: boolean }
 */
async function hasValidAccessBatch(unitIds, employeeId) {
  if (!unitIds || unitIds.length === 0) return {};

  const now = new Date();
  const grants = await OwnerAccessRequest.find({
    unitId: { $in: unitIds },
    requesterId: employeeId,
    status: 'APPROVED',
    expiresAt: { $gt: now }
  }).select('unitId').lean();

  const accessSet = new Set(grants.map(g => g.unitId.toString()));
  const result = {};
  unitIds.forEach(id => {
    result[id.toString()] = accessSet.has(id.toString());
  });
  return result;
}

/**
 * Strip owner fields from a plain unit object.
 */
function stripOwnerFields(unitObj) {
  const clean = { ...unitObj };
  delete clean.owner_name;
  delete clean.owner_phone;
  delete clean.owner_email;
  return clean;
}

// ── Resolve employee name from req.user ──
async function resolveEmployeeInfo(reqUser) {
  let employeeId = reqUser.employeeId || reqUser.id;
  let employeeName = reqUser.username || reqUser.name || 'Unknown';

  if (employeeName === 'Unknown' && reqUser.email) {
    const emp = await Employee.findOne({ email: reqUser.email }).select('name');
    if (emp) {
      employeeName = emp.name;
      employeeId = emp._id;
    }
  }
  return { employeeId, employeeName };
}

// ── Controller Methods ──

/**
 * POST /api/owner-access/request
 * Body: { unitId, reason? }
 */
exports.requestAccess = async (req, res, next) => {
  try {
    const { unitId, reason } = req.body;
    if (!unitId) {
      return res.status(400).json({ message: 'unitId is required' });
    }

    const unit = await InventoryUnit.findById(unitId)
      .select('unitNumber project')
      .populate({ path: 'project', select: 'name' });
    if (!unit) {
      return res.status(404).json({ message: 'Unit not found' });
    }

    const { employeeId, employeeName } = await resolveEmployeeInfo(req.user);

    // Check for existing pending or active-approved request
    const now = new Date();
    const existing = await OwnerAccessRequest.findOne({
      unitId,
      requesterId: employeeId,
      $or: [
        { status: 'PENDING' },
        { status: 'APPROVED', expiresAt: { $gt: now } }
      ]
    });
    if (existing) {
      return res.status(409).json({
        message: existing.status === 'PENDING'
          ? 'You already have a pending request for this unit'
          : 'You already have active access to this unit',
        existingRequest: existing
      });
    }

    const request = await OwnerAccessRequest.create({
      unitId,
      requesterId: employeeId,
      requesterName: employeeName,
      reason: reason || ''
    });

    // Emit for manager dashboards
    emitToAll('owner-access-requested', {
      request: request.toObject(),
      unitNumber: unit.unitNumber,
      projectName: unit.project?.name || ''
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/owner-access/my-requests
 */
exports.getMyRequests = async (req, res, next) => {
  try {
    const { employeeId } = await resolveEmployeeInfo(req.user);
    const now = new Date();

    // Lazily expire stale approvals
    await OwnerAccessRequest.updateMany(
      { requesterId: employeeId, status: 'APPROVED', expiresAt: { $lte: now } },
      { $set: { status: 'EXPIRED', updatedAt: now } }
    );

    const requests = await OwnerAccessRequest.find({ requesterId: employeeId })
      .populate({
        path: 'unitId',
        select: 'unitNumber bhk building_name project tower floor builtUpArea superBuiltUpArea status facing propertyType',
        populate: [
          { path: 'project', select: 'name' },
          { path: 'tower', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/owner-access/all
 * Query: ?status=PENDING&page=1&limit=20
 */
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const now = new Date();

    // Lazily expire stale approvals
    await OwnerAccessRequest.updateMany(
      { status: 'APPROVED', expiresAt: { $lte: now } },
      { $set: { status: 'EXPIRED', updatedAt: now } }
    );

    const filter = {};
    if (status) filter.status = status.toUpperCase();

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, parseInt(limit, 10) || 50);
    const skip = (pg - 1) * lim;

    const [requests, total] = await Promise.all([
      OwnerAccessRequest.find(filter)
        .populate({
          path: 'unitId',
          select: 'unitNumber bhk building_name project tower floor builtUpArea superBuiltUpArea status facing propertyType',
          populate: [
            { path: 'project', select: 'name' },
            { path: 'tower', select: 'name' }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      OwnerAccessRequest.countDocuments(filter)
    ]);

    res.json({ requests, total, page: pg, limit: lim });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/owner-access/:id/approve
 * Body: { durationMinutes? }
 */
exports.approveRequest = async (req, res, next) => {
  try {
    const { durationMinutes } = req.body;
    const duration = Math.max(1, parseInt(durationMinutes, 10) || 120);

    const request = await OwnerAccessRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot approve a request with status "${request.status}"` });
    }

    const { employeeId: approverId, employeeName: approverName } = await resolveEmployeeInfo(req.user);
    const now = new Date();

    request.status = 'APPROVED';
    request.approvedById = approverId;
    request.approvedByName = approverName;
    request.approvedAt = now;
    request.durationMinutes = duration;
    request.expiresAt = new Date(now.getTime() + duration * 60000);
    await request.save();

    const populated = await OwnerAccessRequest.findById(request._id)
      .populate({
        path: 'unitId',
        select: 'unitNumber bhk building_name project tower',
        populate: [
          { path: 'project', select: 'name' },
          { path: 'tower', select: 'name' }
        ]
      })
      .lean();

    // Targeted notification to requester
    try {
      emitToUser(request.requesterId, 'owner-access-approved', { request: populated });
    } catch (e) { /* socket may not be connected */ }

    // Broadcast for dashboard refresh
    emitToAll('owner-access-updated', { request: populated });

    res.json(populated);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/owner-access/:id/reject
 * Body: { rejectionReason? }
 */
exports.rejectRequest = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;

    const request = await OwnerAccessRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot reject a request with status "${request.status}"` });
    }

    const { employeeName: rejectorName } = await resolveEmployeeInfo(req.user);

    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason || '';
    request.rejectedAt = new Date();
    request.rejectedByName = rejectorName;
    await request.save();

    // Targeted notification to requester
    try {
      emitToUser(request.requesterId, 'owner-access-rejected', { request: request.toObject() });
    } catch (e) { /* socket may not be connected */ }

    // Broadcast for dashboard refresh
    emitToAll('owner-access-updated', { request: request.toObject() });

    res.json(request);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/owner-access/check/:unitId
 */
exports.checkAccess = async (req, res, next) => {
  try {
    const { employeeId } = await resolveEmployeeInfo(req.user);
    const role = (req.user.role || '').toUpperCase();

    // Managers always have access
    if (['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(role)) {
      return res.json({ hasAccess: true, expiresAt: null, remainingSeconds: null, isManager: true });
    }

    const { hasAccess, expiresAt } = await hasValidAccess(req.params.unitId, employeeId);
    const remainingSeconds = hasAccess ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;

    // Also check if there's a pending request
    const pendingRequest = !hasAccess
      ? await OwnerAccessRequest.findOne({ unitId: req.params.unitId, requesterId: employeeId, status: 'PENDING' }).lean()
      : null;

    res.json({
      hasAccess,
      expiresAt,
      remainingSeconds,
      isManager: false,
      hasPendingRequest: !!pendingRequest,
      pendingRequestId: pendingRequest?._id || null
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/owner-access/check-batch
 * Body: { unitIds: [...] }
 */
exports.checkAccessBatch = async (req, res, next) => {
  try {
    const { unitIds } = req.body;
    if (!unitIds || !Array.isArray(unitIds)) {
      return res.status(400).json({ message: 'unitIds array is required' });
    }

    const role = (req.user.role || '').toUpperCase();
    if (['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(role)) {
      // Managers have access to all
      const result = {};
      unitIds.forEach(id => { result[id] = true; });
      return res.json({ accessMap: result, isManager: true });
    }

    const { employeeId } = await resolveEmployeeInfo(req.user);
    const accessMap = await hasValidAccessBatch(unitIds, employeeId);
    res.json({ accessMap, isManager: false });
  } catch (err) {
    next(err);
  }
};

// Export helpers for use in inventory controller
exports.hasValidAccess = hasValidAccess;
exports.hasValidAccessBatch = hasValidAccessBatch;
exports.stripOwnerFields = stripOwnerFields;
