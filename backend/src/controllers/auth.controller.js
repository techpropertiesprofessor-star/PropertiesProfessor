const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const Employee = require('../models/Employee');
function generateToken(user, employeeId = null) {
  const payload = { 
    id: user._id, 
    role: user.role,
    username: user.name,  // Add user's name as username for activity logs
    email: user.email
  };
  if ((user.role === 'EMPLOYEE' || user.role === 'MANAGER') && employeeId) {
    payload.employeeId = employeeId;
  }
  return jwt.sign(payload, jwtSecret, { expiresIn: '1d' });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const user = new User({ name, email, password, role, phone });
    await user.save();

    // Emit socket event for real-time user count update
    if (req.io) {
      req.io.emit('user-added', {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        timestamp: new Date()
      });
    }

    // Also create Employee document
    let employeeId = null;
    if ((role || '').toUpperCase() === 'EMPLOYEE') {
      let emp = await Employee.findOne({ email });
      if (!emp) {
        emp = await Employee.create({ name, email, phone, role: (role || '').toUpperCase() });
      }
      employeeId = emp._id;
    }

    const token = generateToken(user, employeeId);
    res.status(201).json({ 
      success: true, 
      token, 
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, employeeId } 
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    let employeeId = null;
    let permissions = [];
    // Fetch employeeId for both EMPLOYEE and MANAGER roles
    if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
      const emp = await Employee.findOne({ email: user.email });
      if (emp) {
        employeeId = emp._id;
        if (user.role === 'EMPLOYEE') {
          permissions = emp.permissions || [];
        }
        // Set employee online immediately on login
        emp.isOnline = true;
        emp.lastSeen = new Date();
        await emp.save();
      }
    }
    const token = generateToken(user, employeeId);
    res.json({ 
      success: true, 
      token, 
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, employeeId, permissions } 
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    // Set employee offline immediately on logout
    if ((req.user.role === 'EMPLOYEE' || req.user.role === 'MANAGER') && req.user.employeeId) {
      await Employee.findByIdAndUpdate(req.user.employeeId, {
        isOnline: false,
        lastSeen: new Date()
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    let employeeId = null;
    let permissions = [];
    // Fetch employeeId for both EMPLOYEE and MANAGER roles
    if (user.role === 'EMPLOYEE' || user.role === 'MANAGER') {
      const emp = await Employee.findOne({ email: user.email });
      if (emp) {
        employeeId = emp._id;
        if (user.role === 'EMPLOYEE') {
          permissions = emp.permissions || [];
        }
      }
    }
    res.json({ valid: true, user: { ...user.toObject(), employeeId, permissions } });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
    
  } catch (err) {
    next(err);
  }
};
