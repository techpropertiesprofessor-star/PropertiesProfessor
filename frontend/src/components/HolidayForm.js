import React, { useState } from 'react';
import holidayAPI from '../api/holiday';


export default function HolidayForm({ onHolidayAdded }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await holidayAPI.create({ name, date, description });
      setName('');
      setDate('');
      setDescription('');
      if (onHolidayAdded) onHolidayAdded();
    } catch (err) {
      setError(
        err?.response?.data?.error || 'Failed to add holiday.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4">
      <input
        type="text"
        placeholder="Holiday Name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        className="border rounded px-2 py-1"
      />
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required
        className="border rounded px-2 py-1"
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="border rounded px-2 py-1"
      />
      {error && <div className="text-red-500 text-xs">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add Holiday'}
      </button>
    </form>
  );
}
