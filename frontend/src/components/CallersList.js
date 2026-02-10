import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { callerAPI, employeeAPI } from '../api/client';

function EditCallerModal({ caller, isOpen, onClose, onUpdated }) {
  const [form, setForm] = useState(caller || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    setForm(caller || {});
  }, [caller]);

  useEffect(() => {
    // Only fetch employees if user is MANAGER or ADMIN
    if (user && (user.role === 'MANAGER' || user.role === 'ADMIN')) {
      async function fetchEmployees() {
        try {
          const res = await employeeAPI.getBasic ? employeeAPI.getBasic() : employeeAPI.getAll();
          setEmployees(res.data || []);
        } catch {
          setEmployees([]);
        }
      }
      fetchEmployees();
    }
  }, [user]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await callerAPI.update(form._id, form);
      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      setError('Failed to update caller');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Caller</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" value={form.name || ''} onChange={handleChange} placeholder="Name" className="w-full px-3 py-2 border rounded" required />
          <input name="phone" value={form.phone || ''} onChange={handleChange} placeholder="Phone" className="w-full px-3 py-2 border rounded" maxLength="10" required />
          <input name="company" value={form.company || ''} onChange={handleChange} placeholder="Company" className="w-full px-3 py-2 border rounded" />
          <input name="lastResponse" value={form.lastResponse || ''} onChange={handleChange} placeholder="Last Response" className="w-full px-3 py-2 border rounded" />
          <input name="action" value={form.action || ''} onChange={handleChange} placeholder="Action" className="w-full px-3 py-2 border rounded" />
          {(user && (user.role === 'MANAGER' || user.role === 'ADMIN')) && (
            <select
              name="assignedTo"
              value={form.assignedTo || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">-- Assign to Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          )}
          {error && <div className="text-red-600 text-xs">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CallersList() {
  const { user } = useContext(AuthContext);
  const [callers, setCallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editCaller, setEditCaller] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const fetchCallers = async () => {
    setLoading(true);
    setError('');
    try {
      // If EMPLOYEE, only fetch callers assigned to them
      const params = { search, page, pageSize };
      if (user?.role === 'EMPLOYEE' && user?.employeeId) {
        params.assignedTo = user.employeeId;
      }
      const res = await callerAPI.getList(params);
      const callersArr = Array.isArray(res.data.data) ? res.data.data : [];
      setCallers(callersArr);
      setTotal(typeof res.data.total === 'number' ? res.data.total : 0);
    } catch (err) {
      setError('Failed to load callers');
      setCallers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallers();
    // eslint-disable-next-line
  }, [search, page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this caller?')) return;
    try {
      await callerAPI.delete(id);
      fetchCallers();
    } catch {
      alert('Failed to delete caller');
    }
  };

  const handleEdit = (caller) => {
    setEditCaller(caller);
    setShowEditModal(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading) return <div className="text-gray-500">Loading callers...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="mt-8">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-blue-800 tracking-tight flex items-center gap-2">
            <span role="img" aria-label="call">📞</span> Callers List
          </h2>
        </div>
        <div className="mb-6 flex items-center">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 Search by name, phone, company..."
            className="px-4 py-2 border border-gray-300 rounded-lg w-full max-w-xs shadow focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition-all duration-200 bg-white text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-xl shadow-sm">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-3 text-xs font-bold uppercase rounded-tl-xl">Name</th>
                <th className="px-4 py-3 text-xs font-bold uppercase">Phone</th>
                <th className="px-4 py-3 text-xs font-bold uppercase">Company</th>
                <th className="px-4 py-3 text-xs font-bold uppercase">Last Response</th>
                <th className="px-4 py-3 text-xs font-bold uppercase">Employee</th>
                <th className="px-4 py-3 text-xs font-bold uppercase">Action</th>
                <th className="px-4 py-3 text-xs font-bold uppercase rounded-tr-xl">Edit</th>
              </tr>
            </thead>
            <tbody>
              {callers.map((caller, idx) => (
                <tr key={caller._id} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{caller.name}</td>
                  <td className="px-4 py-3 text-gray-700">{caller.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{caller.company}</td>
                  <td className="px-4 py-3 text-gray-700">{caller.lastResponse}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {caller.assignedToName
                      || (caller.assignedTo && (caller.assignedTo.name || (caller.assignedTo.first_name ? (caller.assignedTo.first_name + ' ' + (caller.assignedTo.last_name || '')) : caller.assignedTo.email || caller.assignedTo.phone))
                      || '-')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{caller.action}</td>
                  <td className="px-4 py-3">
                    <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg shadow text-xs font-bold transition-all duration-150" onClick={() => handleEdit(caller)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center items-center gap-2 mt-6">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 text-xs font-semibold transition" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span className="text-xs font-medium text-blue-700">Page {page} of {totalPages}</span>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg shadow hover:bg-gray-200 text-xs font-semibold transition" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>Next</button>
        </div>
        <EditCallerModal caller={editCaller} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onUpdated={fetchCallers} />
      </div>
    </div>
  );
}