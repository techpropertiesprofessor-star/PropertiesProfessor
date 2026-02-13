const Project = require('../models/Project');
const Tower = require('../models/Tower');
const InventoryUnit = require('../models/InventoryUnit');
const InventoryPriceHistory = require('../models/InventoryPriceHistory');

// Project CRUD
exports.createProject = async (req, res, next) => {
  try {
    const { name, location, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const project = new Project({ name, location, description });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
};

// Tower CRUD
exports.createTower = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    // Validate projectId is a valid ObjectId
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(projectId)) {
      return res.status(400).json({ message: 'Invalid projectId. Must be a valid ObjectId.' });
    }
    const tower = new Tower({ project: projectId, name, description });
    await tower.save();
    res.status(201).json(tower);
  } catch (err) {
    next(err);
  }
};

exports.getTowers = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const towers = await Tower.find({ project: projectId });
    res.json(towers);
  } catch (err) {
    next(err);
  }
};

// Inventory Unit CRUD
exports.createUnit = async (req, res, next) => {
  try {
    // Accept both camelCase and snake_case from frontend
    const project = req.body.project || req.body.project_id;
    const tower = req.body.tower || req.body.tower_id;
    const unitNumber = req.body.unitNumber || req.body.unit_number;
    const floor_number = req.body.floor_number;
    const total_floors = req.body.total_floors;
    const area = req.body.area || req.body.carpet_area;
    const carpet_area = req.body.carpet_area;
    const built_up_area = req.body.built_up_area;
    const super_area = req.body.super_area;
    const base_price = req.body.base_price;
    const final_price = req.body.final_price;
    const price_per_sqft = req.body.price_per_sqft;
    const bhk = req.body.bhk;
    const budget = req.body.budget;
    const location = req.body.location;
    const status = req.body.status;
    const keysLocation = req.body.keysLocation || req.body.keys_location;
    const keys_location = req.body.keys_location;
    const keys_remarks = req.body.keys_remarks;
    const facing = req.body.facing;
    const furnished_status = req.body.furnished_status;
    const parking_slots = req.body.parking_slots;
    const owner_name = req.body.owner_name;
    const owner_phone = req.body.owner_phone;
    const owner_email = req.body.owner_email;
    const listing_type = req.body.listing_type;
    const availability_date = req.body.availability_date;
    
    // New property form fields
    const property_type = req.body.property_type;
    const looking_to = req.body.looking_to;
    const city = req.body.city;
    const building_name = req.body.building_name;
    const config_type = req.body.config_type;
    const age = req.body.age;
    const bathrooms = req.body.bathrooms;
    const balconies = req.body.balconies;
    const amenities = req.body.amenities;
    const address_line1 = req.body.address_line1;
    const address_line2 = req.body.address_line2;
    const pincode = req.body.pincode;
    const landmark = req.body.landmark;
    const state = req.body.state;

    if (!unitNumber || !project || !tower) return res.status(400).json({ message: 'Required fields missing' });
    const unit = new InventoryUnit({
      project,
      tower,
      unitNumber,
      floor_number,
      total_floors,
      area,
      carpet_area,
      built_up_area,
      super_area,
      base_price,
      final_price,
      price_per_sqft,
      bhk,
      budget,
      location,
      status,
      keysLocation,
      keys_location,
      keys_remarks,
      facing,
      furnished_status,
      parking_slots,
      owner_name,
      owner_phone,
      owner_email,
      tenant_name: req.body.tenant_name,
      tenant_contact: req.body.tenant_contact,
      tenant_start_date: req.body.tenant_start_date,
      tenant_end_date: req.body.tenant_end_date,
      listing_type,
      availability_date,
      property_type,
      looking_to,
      city,
      building_name,
      config_type,
      age,
      bathrooms,
      balconies,
      amenities,
      address_line1,
      address_line2,
      pincode,
      landmark,
      state
    });
    await unit.save();
    res.status(201).json(unit);
  } catch (err) {
    next(err);
  }
};

exports.getUnitById = async (req, res, next) => {
  try {
    const unit = await InventoryUnit.findById(req.params.id)
      .populate('priceHistory')
      .populate({ path: 'project', select: 'name location description' })
      .populate({ path: 'tower', select: 'name description' });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json(unit);
  } catch (err) {
    next(err);
  }
};

// List units with optional filters and pagination
exports.listUnits = async (req, res, next) => {
  try {
    const {
      page, limit,
      listing_type, budget_min, budget_max,
      area_min, area_max, location, keys_location,
      facing, furnished_status, query, bhk
    } = req.query || {};

    const filter = {};

    if (listing_type) filter.listing_type = listing_type;

    if (budget_min || budget_max) {
      filter.final_price = {};
      if (budget_min) filter.final_price.$gte = Number(budget_min);
      if (budget_max) filter.final_price.$lte = Number(budget_max);
    }

    if (area_min || area_max) {
      filter.carpet_area = {};
      if (area_min) filter.carpet_area.$gte = Number(area_min);
      if (area_max) filter.carpet_area.$lte = Number(area_max);
    }

    if (location) filter.location = { $regex: location, $options: 'i' };
    if (keys_location) filter.keys_location = keys_location;
    if (facing) filter.facing = facing;

    if (furnished_status) {
      const searchPattern = String(furnished_status).trim().replace(/[-\s]+/g, '[_-]');
      filter.furnished_status = { $regex: searchPattern, $options: 'i' };
    }

    if (query) {
      filter.$or = [
        { unitNumber: { $regex: query, $options: 'i' } },
        { unit_number: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
      ];
    }

    if (bhk) {
      const bhkStr = String(bhk).trim();
      // If it's numeric-like (e.g. '2' or '2 BHK') allow simple match, otherwise normalize separators
      if (/^\d/.test(bhkStr)) {
        filter.bhk = { $regex: bhkStr, $options: 'i' };
      } else {
        filter.bhk = { $regex: bhkStr.replace(/[-_]/g, ' '), $options: 'i' };
      }
    }

    const pg = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pg - 1) * lim;

    const [units, total] = await Promise.all([
      InventoryUnit.find(filter)
        .populate('priceHistory')
        .populate({ path: 'project', select: 'name location description' })
        .populate({ path: 'tower', select: 'name description' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      InventoryUnit.countDocuments(filter)
    ]);

    res.json({ units, total, page: pg, limit: lim });
  } catch (err) {
    next(err);
  }
};

exports.updateUnit = async (req, res, next) => {
  try {
    const updateFields = {
      area: req.body.area,
      carpet_area: req.body.carpet_area,
      built_up_area: req.body.built_up_area,
      super_area: req.body.super_area,
      base_price: req.body.base_price,
      final_price: req.body.final_price,
      price_per_sqft: req.body.price_per_sqft,
      bhk: req.body.bhk,
      budget: req.body.budget,
      location: req.body.location,
      status: req.body.status,
      keysLocation: req.body.keysLocation || req.body.keys_location,
      keys_location: req.body.keys_location,
      keys_remarks: req.body.keys_remarks,
      facing: req.body.facing,
      furnished_status: req.body.furnished_status,
      parking_slots: req.body.parking_slots,
      owner_name: req.body.owner_name,
      owner_phone: req.body.owner_phone,
      owner_email: req.body.owner_email,
      listing_type: req.body.listing_type,
      availability_date: req.body.availability_date,
      floor_number: req.body.floor_number,
      // Tenant fields
      tenant_name: req.body.tenant_name,
      tenant_contact: req.body.tenant_contact,
      tenant_start_date: req.body.tenant_start_date,
      tenant_end_date: req.body.tenant_end_date,
      updatedAt: Date.now()
    };
    const unit = await InventoryUnit.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    // Emit real-time update so other connected clients can refresh
    try {
      if (req && req.io && typeof req.io.emit === 'function') {
        req.io.emit('unit-updated', {
          unitId: unit._id,
          listing_type: unit.listing_type,
          status: unit.status,
          project: unit.project,
          tower: unit.tower,
          updatedAt: unit.updatedAt,
          unit: unit
        });
      }
    } catch (emitErr) {
      console.warn('Failed to emit unit-updated socket event:', emitErr);
    }

    res.json(unit);
  } catch (err) {
    next(err);
  }
};

// Price History
exports.addPriceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    if (!price) return res.status(400).json({ message: 'Price is required' });
    const unit = await InventoryUnit.findById(id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    const priceHistory = new InventoryPriceHistory({ unit: id, price });
    await priceHistory.save();
    unit.priceHistory.push(priceHistory._id);
    await unit.save();
    res.status(201).json(priceHistory);
  } catch (err) {
    next(err);
  }
};

// Search & Stats
exports.searchUnits = async (req, res, next) => {
  try {
    const {
      project_id,
      status,
      bhk,
      listing_type,
      budget_min,
      budget_max,
      area_min,
      area_max,
      location,
      keys_location,
      facing,
      furnished_status,
      query
    } = req.query;
    const filter = {};
    if (project_id) filter.project = project_id;
    if (status) filter.status = status;
    if (bhk) {
      // Accept both '2' and '2 BHK' style
      const bhkNum = typeof bhk === 'string' ? (bhk.match(/\d+/) ? Number(bhk.match(/\d+/)[0]) : Number(bhk)) : Number(bhk);
      if (!isNaN(bhkNum)) filter.bhk = bhkNum;
    }
    if (listing_type) filter.listing_type = listing_type;
    if (budget_min || budget_max) {
      filter.final_price = {};
      if (budget_min) filter.final_price.$gte = Number(budget_min);
      if (budget_max) filter.final_price.$lte = Number(budget_max);
    }
    if (area_min || area_max) {
      filter.carpet_area = {};
      if (area_min) filter.carpet_area.$gte = Number(area_min);
      if (area_max) filter.carpet_area.$lte = Number(area_max);
    }
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (keys_location) filter.keys_location = keys_location;
    if (facing) filter.facing = facing;
    if (furnished_status) {
      const trimmedValue = furnished_status.trim().toLowerCase();
      console.log('🔍 Furnished status search:', { furnished_status, trimmedValue });
      if (trimmedValue === 'furnished') {
        // Match "furnished" and "fully_furnished" but NOT "unfurnished"
        filter.furnished_status = { $regex: '(^furnished$|fully[_-]?furnished)', $options: 'i' };
        console.log('✅ Using furnished regex:', filter.furnished_status);
      } else {
        // Handle both hyphen and underscore variants in database
        const searchPattern = furnished_status.trim().replace(/-/g, '[_-]');
        filter.furnished_status = { $regex: searchPattern, $options: 'i' };
        console.log('✅ Using pattern:', filter.furnished_status);
      }
    }
    // Free text search (unit number, project name, etc.)
    if (query) {
      filter.$or = [
        { unitNumber: { $regex: query, $options: 'i' } },
        { unit_number: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } },
      ];
    }
    const units = await InventoryUnit.find(filter)
      .populate('priceHistory')
      .populate({ path: 'project', select: 'name location description' })
      .populate({ path: 'tower', select: 'name description' });
    console.log('📊 Search results:', { 
      filter, 
      count: units.length,
      furnished_statuses: units.map(u => u.furnished_status)
    });
    res.json({ units });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const statsArr = await InventoryUnit.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    // Map to object
    const statsObj = {
      total_units: 0,
      for_sale: 0,
      for_rent: 0,
      available: 0,
      on_hold: 0,
      booked: 0,
      sold: 0
    };
    let total = 0;
    statsArr.forEach(s => {
      const key = (s._id || '').toLowerCase();
      if (key === 'available') statsObj.available = s.count;
      if (key === 'hold' || key === 'on hold') statsObj.on_hold = s.count;
      if (key === 'booked') statsObj.booked = s.count;
      if (key === 'sold') statsObj.sold = s.count;
      // Optionally, if you have listing_type in schema, count for_sale/for_rent
      total += s.count;
    });
    statsObj.total_units = total;
    // For Sale/For Rent counts (if you have listing_type field)
    const saleCount = await InventoryUnit.countDocuments({ listing_type: 'sale' });
    const rentCount = await InventoryUnit.countDocuments({ listing_type: 'rent' });
    statsObj.for_sale = saleCount;
    statsObj.for_rent = rentCount;
    res.json(statsObj);
  } catch (err) {
    next(err);
  }
};

// Media upload handlers
exports.uploadUnitMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const unit = await InventoryUnit.findById(id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    
    const mediaUrls = files.map(file => `/uploads/inventory/${file.filename}`);
    res.status(201).json({ message: 'Files uploaded successfully', files: mediaUrls });
  } catch (err) {
    next(err);
  }
};

exports.getUnitMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await InventoryUnit.findById(id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    // Always return an array for media
    res.json({ media: [] });
  } catch (err) {
    next(err);
  }
};

exports.deleteUnitMedia = async (req, res, next) => {
  try {
    const { id, mediaId } = req.params;
    const unit = await InventoryUnit.findById(id);
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// PDF Generation
exports.generateUnitPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await InventoryUnit.findById(id)
      .populate({ path: 'project', select: 'name location' })
      .populate({ path: 'tower', select: 'name' });
    
    if (!unit) return res.status(404).json({ message: 'Unit not found' });

    const { jsPDF } = require('jspdf');
    const fs = require('fs');
    const path = require('path');
    const doc = new jsPDF();
    
    // Helper function to format amenity names
    const formatAmenityName = (amenity) => {
      const amenityMap = {
        'ac': 'Air Conditioning',
        'gym': 'Gymnasium',
        'lift': 'Elevator/Lift',
        'swimming_pool': 'Swimming Pool',
        'parking': 'Parking',
        'security': '24x7 Security',
        'power_backup': 'Power Backup',
        'garden': 'Garden/Landscaping',
        'club_house': 'Club House',
        'play_area': "Children's Play Area",
        'fire_safety': 'Fire Safety System',
        'cctv': 'CCTV Surveillance',
        'water_supply': '24x7 Water Supply',
        'maintenance': 'Maintenance Staff',
        'intercom': 'Intercom Facility'
      };
      
      const key = amenity.toLowerCase().trim().replace(/[\s-]+/g, '_');
      return amenityMap[key] || amenity.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };
    
    // Load header image if exists
    let headerImageData = null;
    let headerHeight = 0;
    const headerPath = path.join(__dirname, '../../uploads/pdf-header.png');
    if (fs.existsSync(headerPath)) {
      const headerBuffer = fs.readFileSync(headerPath);
      headerImageData = `data:image/png;base64,${headerBuffer.toString('base64')}`;
      headerHeight = 35;
      doc.addImage(headerImageData, 'PNG', 0, 0, 210, headerHeight);
      
      // Add line below header
      doc.setDrawColor(52, 73, 94);
      doc.setLineWidth(0.5);
      doc.line(15, headerHeight + 2, 195, headerHeight + 2);
    }
    
    let yPos = headerHeight > 0 ? headerHeight + 8 : 15;
    
    // Property Highlight Box
    doc.setFillColor(41, 128, 185); // Professional blue
    doc.rect(15, yPos, 180, 30, 'F');
    
    // Unit Number & Type
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const unitText = `${unit.unit_number || 'N/A'} - ${unit.bhk_type || ''} ${unit.property_type || ''}`;
    doc.text(unitText, 20, yPos + 8);
    
    // Status badge
    const statusText = (unit.status || 'N/A').toUpperCase();
    const statusColor = unit.status === 'AVAILABLE' ? [46, 204, 113] : unit.status === 'SOLD' ? [231, 76, 60] : [243, 156, 18];
    doc.setFillColor(...statusColor);
    doc.roundedRect(165, yPos + 3, 25, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(statusText, 177.5, yPos + 8, { align: 'center' });
    
    // Location & Price
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    const locationText = unit.project?.name || unit.location || 'Location not specified';
    doc.text(locationText, 20, yPos + 16);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    let priceText = '';
    if (unit.listing_type === 'sale' && unit.price) {
      priceText = `Rs ${(unit.price / 100000).toFixed(2)} Lac`;
    } else if (unit.listing_type === 'rent' && unit.rent) {
      priceText = `Rs ${unit.rent.toLocaleString('en-IN')}/month`;
    }
    if (priceText) {
      doc.text(priceText, 20, yPos + 25);
    }
    
    yPos += 38;
    
    // Two Column Layout for Property Details
    const col1X = 20;
    const col2X = 110;
    const labelWidth = 35;
    
    // Section: Basic Information
    doc.setFillColor(52, 73, 94);
    doc.rect(15, yPos, 180, 8, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('PROPERTY INFORMATION', 20, yPos + 6);
    
    yPos += 14;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const addField = (label, value, xPos, valueXPos) => {
      if (value && value !== 'N/A' && value !== '') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text(label, xPos, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(String(value), valueXPos, yPos);
        yPos += 7;
      }
    };
    
    // Left column
    const startY = yPos;
    addField('Project:', unit.project?.name || 'N/A', col1X, col1X + 40);
    addField('Tower:', unit.tower?.name || 'N/A', col1X, col1X + 40);
    addField('Unit Number:', unit.unit_number || unit.unitNumber || 'N/A', col1X, col1X + 40);
    addField('Floor:', unit.floor || 'N/A', col1X, col1X + 40);
    addField('BHK:', unit.bhk_type || 'N/A', col1X, col1X + 40);
    addField('Carpet Area:', unit.carpet_area ? `${unit.carpet_area} sq.ft` : 'N/A', col1X, col1X + 40);
    addField('Built-up Area:', unit.builtup_area ? `${unit.builtup_area} sq.ft` : 'N/A', col1X, col1X + 40);
    addField('Super Area:', unit.super_area ? `${unit.super_area} sq.ft` : 'N/A', col1X, col1X + 40);
    
    // Right column
    yPos = startY;
    addField('Property Type:', unit.listing_type ? unit.listing_type.toUpperCase() : 'N/A', col2X, col2X + 40);
    addField('Status:', unit.status || 'N/A', col2X, col2X + 40);
    addField('Keys Location:', unit.keys_location || 'N/A', col2X, col2X + 40);
    addField('Facing:', unit.facing || 'N/A', col2X, col2X + 40);
    addField('Furnished:', unit.furnished_status || 'N/A', col2X, col2X + 40);
    addField('Parking:', unit.parking ? String(unit.parking) : 'N/A', col2X, col2X + 40);
    addField('RERA:', unit.rera_number || '-', col2X, col2X + 40);
    addField('Availability:', unit.availability_date ? new Date(unit.availability_date).toLocaleDateString('en-IN') : 'N/A', col2X, col2X + 40);
    
    // Keys Remarks
    if (unit.keys_remarks) {
      yPos = Math.max(yPos, startY + 56);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 73, 94);
      doc.text('Keys Remarks:', col1X, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(unit.keys_remarks, col1X + 40, yPos);
      yPos += 7;
    }
    
    yPos = Math.max(yPos, startY + 63);
    
    // Pricing Section
    if (unit.price || unit.rent) {
      yPos += 5;
      doc.setFillColor(52, 73, 94);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('PRICING', 20, yPos + 6);
      
      yPos += 14;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      if (unit.listing_type === 'sale') {
        if (unit.base_price) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 73, 94);
          doc.text('Base Price:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Rs ${(unit.base_price / 100000).toFixed(2)} Lac`, 60, yPos);
          yPos += 7;
        }
        if (unit.price) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 73, 94);
          doc.text('Final Price:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Rs ${(unit.price / 100000).toFixed(2)} Lac`, 60, yPos);
          yPos += 7;
        }
        if (unit.price_per_sqft) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 73, 94);
          doc.text('Price per Sq.ft:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Rs ${unit.price_per_sqft.toLocaleString('en-IN')}`, 60, yPos);
          yPos += 7;
        }
      } else if (unit.listing_type === 'rent') {
        if (unit.rent) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 73, 94);
          doc.text('Monthly Rent:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Rs ${unit.rent.toLocaleString('en-IN')}`, 60, yPos);
          yPos += 7;
        }
        if (unit.security_deposit) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(52, 73, 94);
          doc.text('Security Deposit:', 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(`Rs ${unit.security_deposit.toLocaleString('en-IN')}`, 60, yPos);
          yPos += 7;
        }
      }
      yPos += 5;
    }
    
    // Owner Information Section
    if (unit.owner_name || unit.owner_phone || unit.owner_email) {
      yPos += 5;
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(52, 73, 94);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('OWNER INFORMATION', 20, yPos + 6);
      
      yPos += 14;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      if (unit.owner_name) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text('Name:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(unit.owner_name, 60, yPos);
        yPos += 7;
      }
      
      if (unit.owner_phone) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text('Phone:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(unit.owner_phone, 60, yPos);
        yPos += 7;
      }
      
      if (unit.owner_email) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text('Email:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(unit.owner_email, 60, yPos);
        yPos += 7;
      }
      
      yPos += 3;
    }
    
    

    // Property Photos Section
    if (unit.media && unit.media.length > 0) {
      yPos += 5;
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(52, 73, 94);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('PROPERTY PHOTOS', 20, yPos + 6);
      
      yPos += 14;
      
      // Display up to 4 photos (2x2 grid)
      const photoWidth = 85;
      const photoHeight = 60;
      const spacing = 5;
      let photoX = 15;
      let photoY = yPos;
      let photoCount = 0;
      
      for (let i = 0; i < Math.min(unit.media.length, 4); i++) {
        const mediaPath = path.join(__dirname, '../../uploads/inventory', unit.media[i]);
        if (fs.existsSync(mediaPath)) {
          try {
            const imageBuffer = fs.readFileSync(mediaPath);
            const imageExt = path.extname(unit.media[i]).toLowerCase();
            let imageType = 'JPEG';
            if (imageExt === '.png') imageType = 'PNG';
            else if (imageExt === '.jpg' || imageExt === '.jpeg') imageType = 'JPEG';
            
            const imageData = `data:image/${imageType.toLowerCase()};base64,${imageBuffer.toString('base64')}`;
            
            // Add border
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(photoX, photoY, photoWidth, photoHeight);
            
            // Add image
            doc.addImage(imageData, imageType, photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2);
            
            photoCount++;
            
            // Move to next position
            if (photoCount % 2 === 0) {
              photoX = 15;
              photoY += photoHeight + spacing;
            } else {
              photoX += photoWidth + spacing;
            }
            
            // Check if need new page
            if (photoY > 200 && i < unit.media.length - 1) {
              doc.addPage();
              photoY = 20;
              photoX = 15;
            }
          } catch (err) {
            console.log('Error loading image:', err);
          }
        }
      }
      
      yPos = photoY + (photoCount % 2 === 0 ? 0 : photoHeight + spacing);
    }
    
    // Amenities Section
    if (unit.amenities && (Array.isArray(unit.amenities) ? unit.amenities.length > 0 : unit.amenities)) {
      yPos += 5;
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(52, 73, 94);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('AMENITIES & FEATURES', 20, yPos + 6);
      
      yPos += 14;
      
      // Handle amenities - can be array or string
      let amenitiesList = [];
      if (Array.isArray(unit.amenities)) {
        amenitiesList = unit.amenities.filter(a => a && a.trim()).map(a => formatAmenityName(a));
      } else if (typeof unit.amenities === 'string') {
        amenitiesList = unit.amenities.split(/[\n,]/).map(a => formatAmenityName(a.trim())).filter(a => a);
      }
      
      // Modernized amenities layout: 4-column x 5-row grid with clean spacing
      doc.setFontSize(10);
      // Header already rendered; use normal Helvetica for amenity items
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(32, 32, 32);
      const cols = 4;
      const rows = 5;
      const gap = 10; // slightly larger gap for readability
      const contentWidth = 180;
      const colWidth = (contentWidth - (cols - 1) * gap) / cols;
      const startX = 20;
      const lineHeight = 8;

      // Ensure 'Light' appears at the start of 4th row (row index 3)
      const lightIdx = amenitiesList.findIndex(a => /\blight\b/i.test(a));
      if (lightIdx !== -1) {
        const lightItem = amenitiesList.splice(lightIdx, 1)[0];
        const targetPos = 3 * cols; // start of row 4 (0-based)
        if (targetPos <= amenitiesList.length) amenitiesList.splice(targetPos, 0, lightItem);
        else amenitiesList.push(lightItem);
      }

      let maxY = yPos;
      for (let i = 0; i < amenitiesList.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = startX + col * (colWidth + gap);
        const y = yPos + row * lineHeight;

        // If Y would overflow the content area, create a new page and reset positions
        if (y > 250) {
          doc.addPage();
          yPos = 20;
        }

        const amenityText = String(amenitiesList[i] || '').trim();
        const bullet = '- ';
        const lines = doc.splitTextToSize(bullet + amenityText, colWidth - 4);
        doc.text(lines, x, y);
        const used = lines.length * (lineHeight - 1);
        maxY = Math.max(maxY, y + used);
      }

      yPos = maxY + 10;

      // Tenant Information section (always placed on the next page)
      // Move Tenant Information to a fresh page regardless of presence
      doc.addPage();
      yPos = 20;

      doc.setFillColor(52, 73, 94);
      doc.rect(15, yPos, 180, 8, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('TENANT INFORMATION', 20, yPos + 6);

      yPos += 14;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const tColsX = [20, 110];

      // Name (leave blank if missing)
      doc.setFont('helvetica', 'bold');
      doc.text('Name:', tColsX[0], yPos);
      doc.setFont('helvetica', 'normal');
      if (unit.tenant_name) {
        doc.text(String(unit.tenant_name), tColsX[0] + 30, yPos);
      }

      // Contact (leave blank if missing)
      doc.setFont('helvetica', 'bold');
      doc.text('Phone:', tColsX[1], yPos);
      doc.setFont('helvetica', 'normal');
      if (unit.tenant_contact) {
        doc.text(String(unit.tenant_contact), tColsX[1] + 28, yPos);
      }

      yPos += 8;

      // Start Date (leave blank if missing)
      doc.setFont('helvetica', 'bold');
      doc.text('Start Date:', tColsX[0], yPos);
      doc.setFont('helvetica', 'normal');
      if (unit.tenant_start_date) {
        try {
          doc.text(new Date(unit.tenant_start_date).toLocaleDateString('en-IN'), tColsX[0] + 36, yPos);
        } catch (e) {
          doc.text(String(unit.tenant_start_date), tColsX[0] + 36, yPos);
        }
      }

      // End Date (leave blank if missing)
      doc.setFont('helvetica', 'bold');
      doc.text('End Date:', tColsX[1], yPos);
      doc.setFont('helvetica', 'normal');
      if (unit.tenant_end_date) {
        try {
          doc.text(new Date(unit.tenant_end_date).toLocaleDateString('en-IN'), tColsX[1] + 30, yPos);
        } catch (e) {
          doc.text(String(unit.tenant_end_date), tColsX[1] + 30, yPos);
        }
      }

      yPos += 10;
    }
    
    // ADDITIONAL INFORMATION
    if (unit.description) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(0, 51, 102);
      doc.rect(15, yPos, 180, 7, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('ADDITIONAL INFORMATION', 20, yPos + 5);
      
      yPos += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      if (unit.description) {
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Description:', 20, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const descText = doc.splitTextToSize(unit.description, 170);
        doc.text(descText, 20, yPos);
        yPos += descText.length * 4;
      }
    }
    
    // Footer with company branding
    const pageCount = doc.internal.getNumberOfPages();
    
    // Load footer image if exists
    let footerImageData = null;
    let footerHeight = 0;
    const footerPath = path.join(__dirname, '../../uploads/pdf-footer.png');
    if (fs.existsSync(footerPath)) {
      const footerBuffer = fs.readFileSync(footerPath);
      footerImageData = `data:image/png;base64,${footerBuffer.toString('base64')}`;
      footerHeight = 25; // Footer height
    }
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      if (footerImageData) {
        // Add footer image at bottom of page - clearly visible
        const footerY = 297 - footerHeight; // A4 height is 297mm
        doc.addImage(footerImageData, 'PNG', 0, footerY, 210, footerHeight); // Full width
        
        // Add generation info on top of footer if needed
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(60, 60, 60);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}`, 105, footerY - 2, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 190, footerY - 2, { align: 'right' });
      } else {
        // Fallback text footer with company details
        const footerStartY = 260;
        
        // Line at top of footer
        doc.setDrawColor(52, 73, 94);
        doc.setLineWidth(0.5);
        doc.line(15, footerStartY, 195, footerStartY);
        
        // Company details - center aligned (use Times New Roman for a classic look)
        doc.setFontSize(9);
        doc.setFont('times', 'bold');
        doc.setTextColor(52, 73, 94);
        doc.text('Properties Professor, ATS, BOUQUET, B-307, Block B, Sector 132, Noida, Uttar Pradesh, 201304 (INDIA)', 105, footerStartY + 6, { align: 'center' });
        
        // Contact line with bold labels (Times)
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        
        const line1 = 'E-mail: admin@propertiesprofessor.com   Website:  propertiesprofessor.com';
        const line2 = 'Tel.: 01204454649   Phone No.: +91 8228000068';
        
        // Line 1: Email and Website
        doc.setFont('times', 'bold');
        doc.text('E-mail:', 105 - doc.getTextWidth(line1) / 2, footerStartY + 11);
        doc.setFont('times', 'normal');
        doc.text(' admin@propertiesprofessor.com   ', 105 - doc.getTextWidth(line1) / 2 + doc.getStringUnitWidth('E-mail:') * 8 / doc.internal.scaleFactor, footerStartY + 11);
        doc.setFont('times', 'bold');
        doc.text('Website:', 105 - doc.getTextWidth(line1) / 2 + doc.getStringUnitWidth('E-mail: admin@propertiesprofessor.com   ') * 8 / doc.internal.scaleFactor, footerStartY + 11);
        doc.setFont('times', 'normal');
        doc.text(' propertiesprofessor.com', 105 - doc.getTextWidth(line1) / 2 + doc.getStringUnitWidth('E-mail: admin@propertiesprofessor.com   Website:') * 8 / doc.internal.scaleFactor, footerStartY + 11);
        
        // Line 2: Tel and Phone
        doc.setFont('times', 'bold');
        doc.text('Tel.:', 105 - doc.getTextWidth(line2) / 2, footerStartY + 16);
        doc.setFont('times', 'normal');
        doc.text(' 01204454649   ', 105 - doc.getTextWidth(line2) / 2 + doc.getStringUnitWidth('Tel.:') * 8 / doc.internal.scaleFactor, footerStartY + 16);
        doc.setFont('times', 'bold');
        doc.text('Phone No.:', 105 - doc.getTextWidth(line2) / 2 + doc.getStringUnitWidth('Tel.: 01204454649   ') * 8 / doc.internal.scaleFactor, footerStartY + 16);
        doc.setFont('times', 'normal');
        doc.text(' +91 8228000068', 105 - doc.getTextWidth(line2) / 2 + doc.getStringUnitWidth('Tel.: 01204454649   Phone No.:') * 8 / doc.internal.scaleFactor, footerStartY + 16);
        
        // Generation info (Times italic)
        doc.setFontSize(7);
        doc.setFont('times', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}`, 105, footerStartY + 22, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 190, footerStartY + 22, { align: 'right' });
      }
    }
    
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Property_${unit.unit_number || unit.unitNumber || id}.pdf`);
    res.send(pdfBuffer);
    
  } catch (err) {
    console.error('PDF generation error:', err);
    next(err);
  }
};
