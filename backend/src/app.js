const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const path = require('path');
const app = express();

/* ========================
   CORS CONFIG (PRODUCTION SAFE)
======================== */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* ========================
   GLOBAL SECURITY & BODY PARSER
======================== */
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ========================
   OBSERVABILITY MIDDLEWARE (Non-intrusive)
======================== */
const { trackApiRequest } = require('./middlewares/observabilityEmitter.middleware');
app.use(trackApiRequest);

/* ========================
   ROUTES
======================== */

// Pre-load models so they are registered with Mongoose before analytics uses them
require('./models/Task');
require('./models/Lead');
require('./models/InventoryUnit');
require('./models/Caller');
require('./models/Attendance');
require('./models/User');
require('./models/Employee');

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/holidays', require('./routes/holiday.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/leaves', require('./routes/leave.routes'));
app.use('/api/leads', require('./routes/lead.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/announcements', require('./routes/announcement.routes'));
app.use('/api/calendar', require('./routes/contentCalendar.routes'));
app.use('/api/content', require('./routes/content.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/callers', require('./routes/caller.routes'));
app.use('/api/permissions', require('./routes/permissions.routes'));
app.use('/api/personal-notes', require('./routes/personalNote.routes'));

/* ========================
   MANAGER ANALYTICS ROUTES
======================== */
app.use(
  '/api/manager-analytics',
  require('./modules/manager-analytics/analytics.routes')
);

/* ========================
   OBSERVABILITY ROUTES
======================== */
app.use('/api/admin', require('./routes/observability/admin.routes'));
app.use('/api/bios', require('./routes/observability/bios.routes'));

/* ========================
   HEALTH CHECK
======================== */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is healthy'
  });
});

// Dev-only: emit a unit-updated socket event for testing real-time UI
if (process.env.NODE_ENV !== 'production') {
   app.get('/dev/emit-unit-update', (req, res) => {
      try {
         const io = req.app.get('io');
         const unitId = req.query.unitId || `dev-${Date.now()}`;
         const status = req.query.status || 'booked';
         const listing_type = req.query.listing_type || 'sale';
         const payload = {
            unitId,
            status,
            listing_type,
            updatedAt: new Date(),
            unit: { _id: unitId, status, listing_type }
         };
         if (io && typeof io.emit === 'function') {
            io.emit('unit-updated', payload);
            return res.json({ ok: true, emitted: payload });
         }
         return res.status(500).json({ ok: false, message: 'Socket.IO not initialized' });
      } catch (err) {
         console.error('Dev emit error:', err);
         return res.status(500).json({ ok: false, error: err.message });
      }
   });
   app.get('/dev/normalize-listings', async (req, res) => {
      try {
             let InventoryUnit;
             try {
                InventoryUnit = require(path.join(__dirname, 'models', 'InventoryUnit'));
             } catch (e) {
                try {
                   // fallback: require from project root src
                   InventoryUnit = require(path.join(process.cwd(), 'backend', 'src', 'models', 'InventoryUnit'));
                } catch (e2) {
                   // final fallback: direct require
                   InventoryUnit = require('./models/InventoryUnit');
                }
             }
         // Normalize exact 'sell' (any case/whitespace) in listing_type -> 'sale'
         const sellMatch = { listing_type: { $regex: '^\\s*sell\\s*$', $options: 'i' } };
         const result1 = await InventoryUnit.updateMany(sellMatch, { $set: { listing_type: 'sale' } });

         // Also normalize looking_to fields that are 'sell'
         const lookMatch = { looking_to: { $regex: '^\\s*sell\\s*$', $options: 'i' } };
         const result2 = await InventoryUnit.updateMany(lookMatch, { $set: { looking_to: 'sale', listing_type: 'sale' } });

         // Optionally normalize transaction_type if present
         const txMatch = { transaction_type: { $regex: '^\\s*sell\\s*$', $options: 'i' } };
         const result3 = await InventoryUnit.updateMany(txMatch, { $set: { transaction_type: 'sale', listing_type: 'sale' } });

         return res.json({ ok: true, updated_listing_type: result1.nModified || result1.modifiedCount || 0, updated_looking_to: result2.nModified || result2.modifiedCount || 0, updated_transaction_type: result3.nModified || result3.modifiedCount || 0 });
      } catch (err) {
         console.error('Normalize listings error:', err);
         return res.status(500).json({ ok: false, error: err.message });
      }
   });
}

/* ========================
   ERROR HANDLER
======================== */
app.use(require('./middlewares/error.middleware'));

module.exports = app;
