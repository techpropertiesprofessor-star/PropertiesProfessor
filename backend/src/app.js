const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

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

/* ========================
   ERROR HANDLER
======================== */
app.use(require('./middlewares/error.middleware'));

module.exports = app;
