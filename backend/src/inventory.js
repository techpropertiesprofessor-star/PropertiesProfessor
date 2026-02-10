const express = require('express');
const pool = require('../config/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const brandLogoPath = path.join(__dirname, '../../assets/properties-professor-logo.jpg');

const router = express.Router();

// Media storage config
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const unitId = req.params.id || 'general';
    const uploadDir = path.join(__dirname, '../../uploads/inventory', String(unitId));
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const isVideo = ['.mp4', '.mov', '.mkv', '.webm'].includes(ext);
    if (!isImage && !isVideo) {
      return cb(new Error('Only images or videos are allowed'));
    }
    cb(null, true);
  }
});

// ===== PROJECTS =====

// Get all projects
router.get('/projects', authMiddleware, async (req, res) => {
  try {
    const { status, city, search } = req.query;
    
    let queryStr = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (status) {
      queryStr += ` AND status = $${paramCount++}`;
      params.push(status);
    }
    if (city) {
      queryStr += ` AND city ILIKE $${paramCount++}`;
      params.push(`%${city}%`);
    }
    if (search) {
      queryStr += ` AND (name ILIKE $${paramCount} OR developer ILIKE $${paramCount} OR location ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await pool.query(queryStr, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
router.post('/projects', authMiddleware, roleMiddleware(['admin', 'manager', 'caller']), async (req, res) => {
  try {
    const {
      name, developer, location, address, city, state, pincode,
      project_type, total_towers, total_units, rera_number,
      possession_date, amenities, description
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await pool.query(
      `INSERT INTO projects (
        name, developer, location, address, city, state, pincode,
        project_type, total_towers, total_units, rera_number,
        possession_date, amenities, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
      RETURNING *`,
      [name, developer || '', location || '', address || '', city || '', state || '', pincode || '',
       project_type || '', total_towers || null, total_units || null, rera_number || '',
       possession_date || null, amenities || null, description || '']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create project failed', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ===== TOWERS =====

// Get towers for a project
router.get('/projects/:projectId/towers', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM towers WHERE project_id = $1 ORDER BY name',
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create tower
router.post('/projects/:projectId/towers', authMiddleware, roleMiddleware(['admin', 'manager', 'caller']), async (req, res) => {
  try {
    const { name, tower_number, total_floors, total_units } = req.body;
    const projectId = req.params.projectId;

    if (!projectId || !name) {
      return res.status(400).json({ error: 'Project and tower name are required' });
    }

    const towerNumber = tower_number || null;
    const totalFloors = total_floors ? parseInt(total_floors, 10) : 0;
    const totalUnits = total_units ? parseInt(total_units, 10) : 0;

    const result = await pool.query(
      `INSERT INTO towers (project_id, name, tower_number, total_floors, total_units, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [projectId, name, towerNumber, totalFloors, totalUnits]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create tower failed', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ===== INVENTORY UNITS =====

// Search inventory with advanced filters - FIXED VERSION
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const {
      project_id, tower_id, status, bhk, property_type,
      budget_min, budget_max, area_min, area_max,
      location, keys_location, facing, furnished_status,
      listing_type,
      query: q,
      page = 1, limit = 50
    } = req.query;

    const params = [];
    let paramCount = 1;
    let whereClause = 'WHERE 1=1';

    // Universal query search across important fields (exact match only, case-insensitive)
    if (q) {
      const qTrim = q.trim();
      whereClause += ` AND (
        LOWER(iu.unit_number) = LOWER($${paramCount}) OR
        LOWER(iu.owner_name) = LOWER($${paramCount + 1}) OR
        iu.owner_phone = $${paramCount + 2} OR
        LOWER(p.name) = LOWER($${paramCount + 3}) OR
        LOWER(t.name) = LOWER($${paramCount + 4})
      )`;
      params.push(qTrim, qTrim, qTrim, qTrim, qTrim);
      paramCount += 5;
    }

    // Apply filters
    if (project_id) {
      whereClause += ` AND iu.project_id = $${paramCount++}`;
      params.push(project_id);
    }
    if (tower_id) {
      whereClause += ` AND iu.tower_id = $${paramCount++}`;
      params.push(tower_id);
    }
    if (status) {
      whereClause += ` AND iu.status = $${paramCount++}`;
      params.push(status);
    }
    if (bhk) {
      whereClause += ` AND iu.bhk = $${paramCount++}`;
      params.push(bhk);
    }
    if (budget_min) {
      whereClause += ` AND iu.final_price >= $${paramCount++}`;
      params.push(budget_min);
    }
    if (budget_max) {
      whereClause += ` AND iu.final_price <= $${paramCount++}`;
      params.push(budget_max);
    }
    if (area_min) {
      whereClause += ` AND iu.carpet_area >= $${paramCount++}`;
      params.push(area_min);
    }
    if (area_max) {
      whereClause += ` AND iu.carpet_area <= $${paramCount++}`;
      params.push(area_max);
    }
    if (location) {
      whereClause += ` AND (p.location ILIKE $${paramCount} OR p.city ILIKE $${paramCount + 1})`;
      params.push(`%${location}%`, `%${location}%`);
      paramCount += 2;
    }
    if (keys_location) {
      whereClause += ` AND iu.keys_location = $${paramCount++}`;
      params.push(keys_location);
    }
    if (facing) {
      whereClause += ` AND iu.facing = $${paramCount++}`;
      params.push(facing);
    }
    if (furnished_status) {
      whereClause += ` AND iu.furnished_status = $${paramCount++}`;
      params.push(furnished_status);
    }
    if (listing_type) {
      whereClause += ` AND iu.listing_type = $${paramCount++}`;
      params.push(listing_type);
    }

    // Main query with pagination
    const mainQuery = `
      SELECT iu.*,
             p.name as project_name,
             p.location as project_location,
             p.city,
             t.name as tower_name,
             (SELECT url FROM unit_media WHERE unit_id = iu.id AND media_type = 'image' ORDER BY created_at LIMIT 1) as first_photo_url
      FROM inventory_units iu
      LEFT JOIN projects p ON iu.project_id = p.id
      LEFT JOIN towers t ON iu.tower_id = t.id
      ${whereClause}
      ORDER BY p.name, t.name, iu.floor_number, iu.unit_number
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const queryParams = [...params, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)];
    const result = await pool.query(mainQuery, queryParams);

    // Count query with same WHERE clause (but no LIMIT/OFFSET)
    const countQuery = `
      SELECT COUNT(*) as count
      FROM inventory_units iu
      LEFT JOIN projects p ON iu.project_id = p.id
      LEFT JOIN towers t ON iu.tower_id = t.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);

    res.json({
      units: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unit by ID with edit tracking info
router.get('/units/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT iu.*,
              p.name as project_name,
              p.location as project_location,
              p.developer,
              p.rera_number,
              t.name as tower_name,
              e.first_name as edited_by_first_name,
              e.last_name as edited_by_last_name,
              e.phone as edited_by_phone
       FROM inventory_units iu
       LEFT JOIN projects p ON iu.project_id = p.id
       LEFT JOIN towers t ON iu.tower_id = t.id
       LEFT JOIN employees e ON iu.last_updated_by = e.id
       WHERE iu.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create inventory unit
router.post('/units', authMiddleware, roleMiddleware(['admin', 'manager', 'caller']), async (req, res) => {
  try {
    const {
      project_id, tower_id, unit_number, floor_number,
      bhk, carpet_area, built_up_area, super_area,
      base_price, final_price, price_per_sqft,
      status, availability_date, keys_location, keys_remarks,
      facing, furnished_status, parking_slots,
      owner_name, owner_phone, owner_email, listing_type
    } = req.body;

    const result = await pool.query(
      `INSERT INTO inventory_units (
        project_id, tower_id, unit_number, floor_number,
        bhk, carpet_area, built_up_area, super_area,
        base_price, final_price, price_per_sqft,
        status, availability_date, keys_location, keys_remarks,
        facing, furnished_status, parking_slots,
        owner_name, owner_phone, owner_email,
        listing_type, last_updated_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *`,
      [project_id, tower_id, unit_number, floor_number,
       bhk, carpet_area, built_up_area, super_area,
       base_price, final_price, price_per_sqft,
       status || 'available', availability_date, keys_location, keys_remarks,
       facing, furnished_status, parking_slots,
       owner_name, owner_phone, owner_email, listing_type || 'sale', req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update inventory unit
// Update unit - all fields editable by all roles
router.put('/units/:id', authMiddleware, roleMiddleware(['admin', 'manager', 'caller']), async (req, res) => {
  try {
    const {
      status, final_price, keys_location, keys_remarks,
      owner_name, owner_phone, owner_email,
      bhk, carpet_area, built_up_area, facing, furnished_status, parking_slots, base_price, floor_number, listing_type
    } = req.body;

    // Record price change if price is being updated
    if (final_price) {
      const currentUnit = await pool.query(
        'SELECT final_price FROM inventory_units WHERE id = $1',
        [req.params.id]
      );
      
      if (currentUnit.rows.length > 0 && currentUnit.rows[0].final_price !== final_price) {
        await pool.query(
          `INSERT INTO inventory_price_history (unit_id, old_price, new_price, changed_by, created_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [req.params.id, currentUnit.rows[0].final_price, final_price, req.user.id]
        );
      }
    }

    const result = await pool.query(
      `UPDATE inventory_units 
       SET status = COALESCE($1, status),
           final_price = COALESCE($2, final_price),
           base_price = COALESCE($3, base_price),
           keys_location = COALESCE($4, keys_location),
           keys_remarks = COALESCE($5, keys_remarks),
           owner_name = COALESCE($6, owner_name),
           owner_phone = COALESCE($7, owner_phone),
           owner_email = COALESCE($8, owner_email),
           bhk = COALESCE($9, bhk),
           carpet_area = COALESCE($10, carpet_area),
           built_up_area = COALESCE($11, built_up_area),
           facing = COALESCE($12, facing),
           furnished_status = COALESCE($13, furnished_status),
           parking_slots = COALESCE($14, parking_slots),
           floor_number = COALESCE($15, floor_number),
           listing_type = COALESCE($16, listing_type),
           last_updated_by = $17,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $18
       RETURNING *`,
      [status, final_price, base_price, keys_location, keys_remarks, owner_name, owner_phone, owner_email, bhk, carpet_area, built_up_area, facing, furnished_status, parking_slots, floor_number, listing_type, req.user.id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get inventory statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { project_id } = req.query;
    
    let queryStr = `
      SELECT 
        COUNT(*) as total_units,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'hold' THEN 1 END) as on_hold,
        COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold,
        COUNT(CASE WHEN listing_type = 'sale' THEN 1 END) as for_sale,
        COUNT(CASE WHEN listing_type = 'rent' THEN 1 END) as for_rent,
        AVG(final_price) as avg_price,
        MIN(final_price) as min_price,
        MAX(final_price) as max_price
      FROM inventory_units
      WHERE 1=1
    `;
    const params = [];
    
    if (project_id) {
      queryStr += ' AND project_id = $1';
      params.push(project_id);
    }

    const result = await pool.query(queryStr, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== MEDIA ENDPOINTS =====

// Upload media for a unit
router.post('/units/:id/media', authMiddleware, roleMiddleware(['admin', 'manager', 'caller']), mediaUpload.array('files', 10), async (req, res) => {
  try {
    const unitId = req.params.id;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const inserted = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const mediaType = ['.mp4', '.mov', '.mkv', '.webm'].includes(ext) ? 'video' : 'image';

      const url = `/uploads/inventory/${unitId}/${file.filename}`;
      const result = await pool.query(
        `INSERT INTO unit_media (unit_id, media_type, filename, url, caption, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [unitId, mediaType, file.filename, url, req.body.caption || null, req.user.id]
      );
      inserted.push(result.rows[0]);
    }

    res.json({ uploaded: inserted.length, items: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List media for a unit
router.get('/units/:id/media', authMiddleware, async (req, res) => {
  try {
    const unitId = req.params.id;
    const result = await pool.query(
      'SELECT * FROM unit_media WHERE unit_id = $1 ORDER BY created_at DESC',
      [unitId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete media item
router.delete('/units/:id/media/:mediaId', authMiddleware, roleMiddleware(['admin', 'manager']), async (req, res) => {
  try {
    const { id, mediaId } = req.params;
    const item = await pool.query('SELECT * FROM unit_media WHERE id = $1 AND unit_id = $2', [mediaId, id]);
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }
    const filePath = path.join(__dirname, '../../uploads/inventory', String(id), item.rows[0].filename);
    try { fs.unlinkSync(filePath); } catch (e) {}
    await pool.query('DELETE FROM unit_media WHERE id = $1', [mediaId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate share token and enable sharing
router.post('/units/:id/share', authMiddleware, roleMiddleware(['admin', 'manager', 'caller']), async (req, res) => {
  try {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const result = await pool.query(
      `UPDATE inventory_units SET share_token = $1, share_enabled = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING share_token`,
      [token, req.params.id]
    );
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/unit/${token}`;
    res.json({ token, share_url: shareUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public JSON view for shared unit
router.get('/share/unit/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const unitRes = await pool.query(
      `SELECT iu.*, p.name AS project_name, t.name AS tower_name
       FROM inventory_units iu 
       LEFT JOIN projects p ON iu.project_id = p.id
       LEFT JOIN towers t ON iu.tower_id = t.id
       WHERE iu.share_enabled = TRUE AND iu.share_token = $1`, [token]
    );
    if (unitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    const unit = unitRes.rows[0];
    const mediaRes = await pool.query('SELECT * FROM unit_media WHERE unit_id = $1 ORDER BY created_at', [unit.id]);
    res.json({ unit, media: mediaRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate personalized PDF for unit with details and photos (includes agent name/number)
router.get('/units/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const unitId = req.params.id;

    // Fetch unit details with editor info
    const unitRes = await pool.query(
      `SELECT iu.*, p.name as project_name, p.city, t.name as tower_name
       FROM inventory_units iu
       LEFT JOIN projects p ON iu.project_id = p.id
       LEFT JOIN towers t ON iu.tower_id = t.id
       WHERE iu.id = $1`,
      [unitId]
    );
    
    // Fetch current agent/user details from JWT
    const agentRes = await pool.query(
      `SELECT id, first_name, last_name, phone as phone, email FROM employees WHERE id = $1`,
      [req.user.id]
    );

    if (unitRes.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const unit = unitRes.rows[0];

    // Fetch media (images only, limit to 6)
    const mediaRes = await pool.query(
      'SELECT * FROM unit_media WHERE unit_id = $1 AND media_type = $2 ORDER BY created_at LIMIT 6',
      [unitId, 'image']
    );
    const photos = mediaRes.rows;

    // Mask sensitive client-facing data
    const maskedUnitNumber = 'XXX';

    // Create PDF
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Property_Brochure.pdf"');
    doc.pipe(res);

    // Watermark (light, centered)
    doc.save();
    doc.rotate(-30, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fontSize(60).font('Helvetica-Bold').fillColor('#0f172a').opacity(0.05)
      .text('Properties Professor', doc.page.width / 2 - 260, doc.page.height / 2, { align: 'center' });
    doc.restore();
    doc.opacity(1).fillColor('#000000');

    // Letterhead with logo + brand
    const logoExists = fs.existsSync(brandLogoPath);
    if (logoExists) {
      doc.image(brandLogoPath, 50, 35, { width: 80 });
    }
    doc.fontSize(16).font('Helvetica-Bold').text('Properties Professor', 150, 40);
    doc.fontSize(10).font('Helvetica').text('All rights reserved to Properties Professor', 150, 60);
    doc.moveTo(50, 90).lineTo(550, 90).stroke();
    doc.moveDown(2);

    // Header with project/tower info
    doc.fontSize(22).font('Helvetica-Bold').text('Property Details', { align: 'left' });
    doc.fontSize(11).font('Helvetica').fillColor('#555')
      .text(`${unit.project_name || 'N/A'} | ${unit.tower_name || 'N/A'} | ${unit.city || 'N/A'}`, { align: 'left' });
    doc.fillColor('#000000');
    doc.moveDown(1);

    // Key Details Section (unit number masked for client PDF)
    doc.fontSize(13).font('Helvetica-Bold').text('Property Information', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica');

    const details = [
      { label: 'Unit Number:', value: maskedUnitNumber },
      { label: 'Floor:', value: unit.floor_number || '-' },
      { label: 'BHK:', value: unit.bhk || '-' },
      { label: 'Carpet Area:', value: `${unit.carpet_area || '-'} sq.ft` },
      { label: 'Built-up Area:', value: `${unit.built_up_area || '-'} sq.ft` },
      { label: 'Facing:', value: unit.facing || '-' },
      { label: 'Furnished:', value: unit.furnished_status || '-' },
      { label: 'Parking Slots:', value: unit.parking_slots || 0 },
    ];

    let col = 0;
    let y = doc.y;
    details.forEach((detail) => {
      if (col === 0) y = doc.y;
      doc.fontSize(10).font('Helvetica-Bold').text(detail.label, 50 + col * 250, y, { width: 90 });
      doc.fontSize(10).font('Helvetica').text(detail.value, 150 + col * 250, y, { width: 120 });

      col++;
      if (col === 2) {
        col = 0;
        doc.moveDown(0.8);
      }
    });
    if (col !== 0) doc.moveDown(0.8);
    doc.moveDown(0.5);

    // Pricing Section (single owner-quoted price only)
    doc.fontSize(13).font('Helvetica-Bold').text('Pricing', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica-Bold').text('Owner Quoted Price', 50);
    doc.fontSize(11).font('Helvetica').text(`₹${(unit.base_price / 100000).toFixed(2)}L`, 220);
    doc.moveDown(1);

    // Photos Section
    if (photos.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').text('Property Photos', { underline: true });
      doc.moveDown(0.4);

      const uploadDir = path.join(__dirname, '../../uploads/inventory', String(unitId));
      let photoAdded = false;

      // Ensure we start photos on a fresh area if near bottom
      if (doc.y > 550) doc.addPage();

      // Main hero photo
      if (fs.existsSync(uploadDir)) {
        const photoPath = path.join(uploadDir, photos[0].filename);
        try {
          if (fs.existsSync(photoPath)) {
            doc.image(photoPath, 50, doc.y, { width: 500, height: 280, align: 'center' });
            doc.moveDown(13);
            photoAdded = true;
          }
        } catch (e) {
          console.error('Failed to add main photo:', e);
        }
      }

      // Additional photos grid (2 columns, consistent spacing)
      if (photos.length > 1 && photoAdded) {
        doc.moveDown(0.6);
        if (doc.y > 600) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('Additional Photos:');
        doc.moveDown(0.3);

        const gridCols = 2;
        const thumbWidth = 230;
        const thumbHeight = 150;
        const spacing = 18;
        let startY = doc.y;

        for (let i = 1; i < photos.length && i < 7; i++) {
          const photoPath = path.join(uploadDir, photos[i].filename);
          try {
            if (fs.existsSync(photoPath)) {
              const colIdx = (i - 1) % gridCols;
              const rowIdx = Math.floor((i - 1) / gridCols);

              let xPos = 50 + colIdx * (thumbWidth + spacing);
              let yPos = startY + rowIdx * (thumbHeight + spacing);

              // Add a new page if the next thumbnail would overflow
              if (yPos + thumbHeight > doc.page.height - 80) {
                doc.addPage();
                startY = doc.y;
                yPos = startY;
              }

              doc.image(photoPath, xPos, yPos, { width: thumbWidth, height: thumbHeight, align: 'center' });

              // Adjust cursor if we filled a row
              if ((i % gridCols) === 0) {
                doc.moveDown(thumbHeight / doc.currentLineHeight() + 0.5);
              }
            }
          } catch (e) {
            console.error('Failed to add additional photo:', e);
          }
        }
      }
    }

    // Agent Information Section (footer)
    const agent = agentRes.rows[0];
    const agentName = agent ? `${agent.first_name} ${agent.last_name}` : 'Agent';
    const agentPhone = agent?.phone || 'N/A';
    
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').text('Assigned to:', 50);
    doc.fontSize(11).font('Helvetica').text(`Agent: ${agentName}`, 50);
    doc.fontSize(11).font('Helvetica').text(`Contact: ${agentPhone}`, 50);
    doc.moveDown(1);
    
    // Footer
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#555')
      .text(`Generated on ${new Date().toLocaleDateString()} | Generated by: ${agentName} | All rights reserved to Properties Professor`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;
