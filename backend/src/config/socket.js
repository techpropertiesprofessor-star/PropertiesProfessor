// Socket.IO configuration
let io = null;

function initSocket(server) {
  const socketio = require('socket.io');
  io = socketio(server, {
    cors: {
      origin: '*', // Open — auth is JWT via headers, no cookie credentials needed
      methods: ['GET', 'POST'],
      credentials: false,
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
