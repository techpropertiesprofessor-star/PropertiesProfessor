// Socket.IO configuration
let io = null;

function initSocket(server) {
  const socketio = require('socket.io');
  io = socketio(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow no-origin requests (server-to-server, mobile)
        if (!origin) return callback(null, true);
        // Allow all propertiesprofessor subdomains, Vercel previews, and localhost
        if (
          origin.includes('localhost') ||
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.propertiesprofessor.com') ||
          origin === 'https://propertiesprofessor.com' ||
          origin === 'https://dashboard.propertiesprofessor.com'
        ) {
          return callback(null, true);
        }
        callback(null, true); // allow all for sockets (non-sensitive)
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });
  
  console.log('✅ Socket.IO initialized');
  
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
}

module.exports = { initSocket, getIO };
