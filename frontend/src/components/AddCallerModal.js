import React, { useState } from 'react';
import { callerAPI } from '../api/client';
import { FiUser, FiPhone, FiBriefcase, FiMessageCircle, FiCheckCircle } from 'react-icons/fi';

export default function AddCallerModal({ isOpen, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    company: '',
    lastResponse: '',
    action: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await callerAPI.create(form);
      onAdded && onAdded();
      onClose();
    } catch (err) {
      setError('Failed to add caller');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-blue-100">
        <div className="flex items-center mb-6">
          <FiUser className="text-blue-600 text-2xl mr-2" />
          <h2 className="text-2xl font-bold text-blue-800">Add New Caller</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200">
            <FiUser className="text-gray-400 mr-2" />
            <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" className="w-full bg-transparent outline-none" required />
          </div>
          <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200">
            <FiPhone className="text-gray-400 mr-2" />
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" className="w-full bg-transparent outline-none" maxLength="10" required />
          </div>
          <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200">
            <FiBriefcase className="text-gray-400 mr-2" />
            <input name="company" value={form.company} onChange={handleChange} placeholder="Company (optional)" className="w-full bg-transparent outline-none" />
          </div>
          <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200">
            <FiMessageCircle className="text-gray-400 mr-2" />
            <select name="lastResponse" value={form.lastResponse} onChange={handleChange} className="w-full bg-transparent outline-none">
              <option value="">Last Response</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="callback_later">Callback Later</option>
              <option value="busy">Busy</option>
            </select>
          </div>
          <div className="flex items-center border rounded-lg px-3 py-2 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-200">
            <FiCheckCircle className="text-gray-400 mr-2" />
            <input name="action" value={form.action} onChange={handleChange} placeholder="Action (optional)" className="w-full bg-transparent outline-none" />
          </div>
          {error && <div className="text-red-600 text-xs text-center font-semibold">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60">{loading ? 'Adding...' : 'Add Caller'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
