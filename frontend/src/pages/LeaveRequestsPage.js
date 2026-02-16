
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { default as api } from '../api/client';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useRealtimeData from '../hooks/useRealtimeData';

function LeaveRequestsPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const navigate = useNavigate();



  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (user && user.role && user.role.toLowerCase() === 'employee') {
        res = await api.get('/leaves/my');
      } else {
        res = await api.get('/leaves/all');
      }
      setLeaves(res.data.data || res.data || []);
    } catch (err) {
      setError('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Real-time leave request updates
  const refreshLeaves = useCallback(() => fetchLeaves(), []);
  useRealtimeData(['notification', 'new-notification', 'leave-created', 'leave-updated'], refreshLeaves);

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    setError('');
    try {
      await api.patch(`/leaves/${id}/${action}`);
      fetchLeaves();
    } catch (err) {
      setError('Action failed');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-8 pt-8 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold shadow transition-all duration-150"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight">Leave Requests</h1>
          <button
            onClick={() => navigate('/leaves/new')}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow transition-all duration-150 ml-4"
            style={{ minWidth: 70 }}
          >
            + New
          </button>
        </div>
        <div className="flex-1 px-8 pb-8">
          {error && <div className="mb-4 text-red-600 font-semibold text-center">{error}</div>}
          <div className="bg-white rounded-2xl shadow-xl overflow-x-auto p-6 border border-blue-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading leave requests...</div>
            ) : (
              <table className="min-w-full table-auto border-separate border-spacing-y-0.5 text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-xs font-bold uppercase rounded-tl-xl">Employee</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">From</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">To</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase">Status</th>
                    {user && user.role && user.role.toLowerCase() !== 'employee' && (
                      <th className="px-4 py-3 text-xs font-bold uppercase rounded-tr-xl">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={user && user.role && user.role.toLowerCase() !== 'employee' ? 6 : 5} className="p-8 text-center text-gray-400">No leave requests found</td>
                    </tr>
                  ) : leaves.map((leave, idx) => (
                    <tr key={leave._id} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{
                        user && user.role && user.role.toLowerCase() === 'employee'
                          ? leave.employeeName || leave.user?.name || '-'
                          : leave.user?.name || leave.userId?.name || leave.userId || leave.employee?.name || leave.employeeId || '-'
                      }</td>
                      <td className="px-4 py-3 text-gray-700">{
                        leave.leaveType || leave.type || leave.leave_type || '-'
                      }</td>
                      <td className="px-4 py-3 text-gray-700">{
                        leave.fromDate ? new Date(leave.fromDate).toLocaleDateString() : '-'
                      }</td>
                      <td className="px-4 py-3 text-gray-700">{
                        leave.toDate ? new Date(leave.toDate).toLocaleDateString() : '-'
                      }</td>
                      <td className="px-4 py-3">
                        <span className={
                          leave.status === 'APPROVED' ? 'text-green-700 bg-green-100 px-3 py-1 rounded-lg text-xs font-bold' :
                          leave.status === 'REJECTED' ? 'text-red-700 bg-red-100 px-3 py-1 rounded-lg text-xs font-bold' :
                          'text-yellow-700 bg-yellow-100 px-3 py-1 rounded-lg text-xs font-bold'
                        }>
                          {leave.status}
                        </span>
                      </td>
                      {user && user.role && user.role.toLowerCase() !== 'employee' && (
                        <td className="px-4 py-3 space-x-2">
                          {leave.status === 'PENDING' && (
                            <>
                              <button
                                className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold shadow transition-all duration-150"
                                disabled={actionLoading === leave._id + 'approve'}
                                onClick={() => handleAction(leave._id, 'approve')}
                              >
                                Approve
                              </button>
                              <button
                                className="px-4 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-bold shadow transition-all duration-150"
                                disabled={actionLoading === leave._id + 'reject'}
                                onClick={() => handleAction(leave._id, 'reject')}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default LeaveRequestsPage;
