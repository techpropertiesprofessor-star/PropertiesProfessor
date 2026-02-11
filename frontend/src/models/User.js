import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'USER' },
  // ...add any other fields from backend/src/models/User.js
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
