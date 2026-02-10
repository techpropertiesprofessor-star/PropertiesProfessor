const { getIO } = require('../config/socket');

exports.emitToUser = (userId, event, payload) => {
  const io = getIO();
  io.to(userId.toString()).emit(event, payload);
};

exports.emitToAll = (event, payload) => {
  const io = getIO();
  io.emit(event, payload);
};
