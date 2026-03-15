import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ownerAccessAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useRealtimeData from '../hooks/useRealtimeData';
import CountdownTimer from '../components/CountdownTimer';
import { FiShield, FiCheck, FiX, FiClock, FiUser, FiHome, FiChevronDown, FiLayers, FiMaximize, FiSun, FiCalendar, FiMapPin, FiEye } from 'react-icons/fi';

function OwnerAccessRequestsPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const [total, setTotal] = useState(0);

  // Duration dropdown state per request
  const [durationMap, setDurationMap] = useState({});

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (isManager || user?.permissions?.includes('canApproveInventoryAccess')) {
        const params = {};
        if (activeTab !== 'ALL') params.status = activeTab;
        res = await ownerAccessAPI.getAllRequests(params);
        setRequests(res.data?.requests || []);
        setTotal(res.data?.total || 0);
      } else {
        res = await ownerAccessAPI.getMyRequests();
        const all = res.data?.requests || [];
        if (activeTab !== 'ALL') {
          setRequests(all.filter(r => r.status === activeTab));
          setTotal(all.filter(r => r.status === activeTab).length);
        } else {
          setRequests(all);
          setTotal(all.length);
        }
      }
    } catch (err) {
      setError('Failed to fetch access requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab, isManager, user?.permissions]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time updates
  const refreshRequests = useCallback(() => fetchRequests(), [fetchRequests]);
  useRealtimeData(['owner-access-requested', 'owner-access-updated', 'owner-access-approved', 'owner-access-rejected'], refreshRequests);

  const handleApprove = async (id) => {
    setActionLoading(id + 'approve');
    setError('');
    try {
      const duration = durationMap[id] || 120;
      await ownerAccessAPI.approveRequest(id, { durationMinutes: duration });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id + 'reject');
    setError('');
    try {
      await ownerAccessAPI.rejectRequest(id);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setActionLoading('');
    }
  };

  const tabs = [
    { key: 'PENDING', label: 'Pending', icon: '\u23F3' },
    { key: 'APPROVED', label: 'Approved', icon: '\u2705' },
    { key: 'REJECTED', label: 'Rejected', icon: '\u274C' },
    { key: 'EXPIRED', label: 'Expired', icon: '\u23F0' },
    { key: 'ALL', label: 'All', icon: '\uD83D\uDCCB' },
  ];

  const statusBadge = (status) => {
    const map = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      EXPIRED: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const statusCardBg = (status) => {
    const map = {
      PENDING: 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50',
      APPROVED: 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50',
      REJECTED: 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50',
      EXPIRED: 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50',
    };
    return map[status] || 'border-gray-200 bg-gray-50';
  };

  const getUnitDisplay = (req) => {
    const unit = req.unitId;
    if (!unit) return 'Unknown Unit';
    const parts = [];
    if (unit.unitNumber) parts.push('Unit ' + unit.unitNumber);
    if (unit.project?.name) parts.push(unit.project.name);
    if (unit.tower?.name) parts.push(unit.tower.name);
    return parts.join(' - ') || 'Unit';
  };

  const durationOptions = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
  ];

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ' ' + d.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Employee Card View - shows full inventory details
  const EmployeeRequestCard = ({ req }) => {
    const unit = req.unitId;
    const isActive = req.status === 'APPROVED' && req.expiresAt && new Date(req.expiresAt) > new Date();

    return (
      <div className={`rounded-2xl border-2 p-5 transition-all duration-200 ${statusCardBg(req.status)} hover:shadow-lg`}>
        {/* Header: Status + Date */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusBadge(req.status)}`}>
            {req.status}
          </span>
          <span className="text-xs text-gray-400">
            {formatDateTime(req.createdAt)}
          </span>
        </div>

        {/* Unit Title */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
              <FiHome size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{getUnitDisplay(req)}</h3>
              {unit?.building_name && (
                <p className="text-xs text-gray-500">{unit.building_name}</p>
              )}
            </div>
          </div>
          {unit?._id && (
            <button
              onClick={() => navigate(`/inventory?unit=${unit._id}`)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <FiEye size={12} /> View
            </button>
          )}
        </div>

        {/* Inventory Details Grid */}
        {unit && typeof unit === 'object' && (
          <div className="grid grid-cols-2 gap-2 mb-3 bg-white/60 rounded-xl p-3">
            {unit.bhk && (
              <div className="flex items-center gap-1.5">
                <FiLayers size={12} className="text-indigo-400" />
                <span className="text-xs text-gray-600"><strong>BHK:</strong> {unit.bhk}</span>
              </div>
            )}
            {unit.floor !== undefined && unit.floor !== null && (
              <div className="flex items-center gap-1.5">
                <FiLayers size={12} className="text-blue-400" />
                <span className="text-xs text-gray-600"><strong>Floor:</strong> {unit.floor}</span>
              </div>
            )}
            {(unit.builtUpArea || unit.superBuiltUpArea) && (
              <div className="flex items-center gap-1.5">
                <FiMaximize size={12} className="text-green-400" />
                <span className="text-xs text-gray-600"><strong>Area:</strong> {unit.superBuiltUpArea || unit.builtUpArea} sqft</span>
              </div>
            )}
            {unit.facing && (
              <div className="flex items-center gap-1.5">
                <FiSun size={12} className="text-amber-400" />
                <span className="text-xs text-gray-600"><strong>Facing:</strong> {unit.facing}</span>
              </div>
            )}
            {unit.propertyType && (
              <div className="flex items-center gap-1.5">
                <FiMapPin size={12} className="text-purple-400" />
                <span className="text-xs text-gray-600"><strong>Type:</strong> {unit.propertyType}</span>
              </div>
            )}
            {unit.status && (
              <div className="flex items-center gap-1.5">
                <FiCheck size={12} className="text-teal-400" />
                <span className="text-xs text-gray-600"><strong>Status:</strong> {unit.status}</span>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        {req.reason && (
          <p className="text-xs text-gray-500 mb-3 bg-white/40 rounded-lg px-3 py-2">
            <strong>Reason:</strong> {req.reason}
          </p>
        )}

        {/* Approved Info */}
        {req.status === 'APPROVED' && (
          <div className="bg-white/70 rounded-xl p-3 space-y-2">
            {req.approvedByName && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiUser size={12} className="text-green-500" />
                <span>Approved by <strong>{req.approvedByName}</strong></span>
              </div>
            )}
            {req.approvedAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiCalendar size={12} className="text-blue-500" />
                <span>Approved: {formatDateTime(req.approvedAt)}</span>
              </div>
            )}
            {req.durationMinutes && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiClock size={12} className="text-indigo-500" />
                <span>Duration: {req.durationMinutes >= 60 ? (req.durationMinutes / 60) + 'h' : req.durationMinutes + 'm'}</span>
              </div>
            )}
            {req.expiresAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiClock size={12} className="text-orange-500" />
                <span>Expires: {formatDateTime(req.expiresAt)}</span>
              </div>
            )}
            {/* Countdown Timer */}
            {isActive && (
              <div className="flex items-center gap-2 bg-green-100 rounded-lg px-3 py-2 mt-1">
                <FiClock size={14} className="text-green-600" />
                <span className="text-xs font-semibold text-green-700">Time Left:</span>
                <CountdownTimer expiresAt={req.expiresAt} onExpire={() => fetchRequests()} />
              </div>
            )}
            {req.status === 'APPROVED' && req.expiresAt && !isActive && (
              <div className="flex items-center gap-2 bg-red-100 rounded-lg px-3 py-2 mt-1">
                <FiClock size={14} className="text-red-500" />
                <span className="text-xs font-bold text-red-600">Expired</span>
              </div>
            )}
          </div>
        )}

        {/* Rejected Info */}
        {req.status === 'REJECTED' && req.rejectionReason && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-xs text-red-600"><strong>Rejection Reason:</strong> {req.rejectionReason}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-8 pt-6 pb-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold shadow transition-all duration-150"
            >
              ← Back
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-blue-800 tracking-tight flex items-center gap-2">
              <FiShield className="text-blue-600" />
              {isManager ? 'Owner Access Requests' : 'Inventory Requests'}
            </h1>
            <div className="w-20" />
          </div>

          {/* Tabs */}
          <div className="px-4 sm:px-8 pt-2 pb-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {activeTab === tab.key && total > 0 && (
                    <span className="ml-1 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{total}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-8 pb-8">
            {error && <div className="mb-4 text-red-600 font-semibold text-center bg-red-50 rounded-lg p-3">{error}</div>}

            {loading ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center text-gray-500 border border-blue-100">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                Loading access requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-blue-100">
                <FiShield className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500 font-medium">No {activeTab.toLowerCase()} requests found</p>
              </div>
            ) : !isManager ? (
              /* ====== EMPLOYEE VIEW: Card Grid with full details ====== */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.map((req) => (
                  <EmployeeRequestCard key={req._id} req={req} />
                ))}
              </div>
            ) : (
              /* ====== MANAGER VIEW: Table ====== */
              <div className="bg-white rounded-2xl shadow-xl overflow-x-auto border border-blue-100">
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <table className="min-w-full table-auto border-separate border-spacing-y-0.5 text-sm">
                    <thead>
                      <tr className="bg-blue-600 text-white">
                        <th className="px-4 py-3 text-xs font-bold uppercase rounded-tl-xl">Requester</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Unit / Project</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Reason</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Requested</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Status</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase">Expiry</th>
                        <th className="px-4 py-3 text-xs font-bold uppercase rounded-tr-xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr key={req._id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                {req.requesterName?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="font-medium text-gray-800">{req.requesterName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <FiHome size={13} className="text-indigo-400" />
                              <span className="text-sm">{getUnitDisplay(req)}</span>
                            </div>
                            {req.unitId?.bhk && (
                              <span className="text-xs text-gray-400 ml-5">{req.unitId.bhk}</span>
                            )}
                            {req.unitId?._id && (
                              <button
                                onClick={() => navigate(`/inventory?unit=${req.unitId._id}`)}
                                className="flex items-center gap-1 mt-1 ml-5 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <FiEye size={11} /> View Inventory
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-600 text-sm">{req.reason || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {new Date(req.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                            <br />
                            <span className="text-xs text-gray-400">
                              {new Date(req.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'APPROVED' && req.expiresAt && new Date(req.expiresAt) > new Date() ? (
                              <CountdownTimer expiresAt={req.expiresAt} onExpire={() => fetchRequests()} />
                            ) : req.status === 'APPROVED' && req.expiresAt ? (
                              <div>
                                <span className="text-xs text-red-500 font-medium">Expired</span>
                                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(req.expiresAt)}</p>
                              </div>
                            ) : req.status === 'EXPIRED' && req.expiresAt ? (
                              <div>
                                <span className="text-xs text-gray-500 font-medium">Expired</span>
                                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(req.expiresAt)}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <select
                                    value={durationMap[req._id] || 120}
                                    onChange={(e) => setDurationMap(prev => ({ ...prev, [req._id]: Number(e.target.value) }))}
                                    className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs pr-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  >
                                    {durationOptions.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                  <FiChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                                </div>
                                <button
                                  onClick={() => handleApprove(req._id)}
                                  disabled={actionLoading === req._id + 'approve'}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === req._id + 'approve' ? (
                                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                  ) : (
                                    <FiCheck size={13} />
                                  )}
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(req._id)}
                                  disabled={actionLoading === req._id + 'reject'}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === req._id + 'reject' ? (
                                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                  ) : (
                                    <FiX size={13} />
                                  )}
                                  Reject
                                </button>
                              </div>
                            ) : req.status === 'APPROVED' || req.status === 'EXPIRED' ? (
                              <div>
                                <div className="flex items-center gap-1 text-green-600">
                                  <FiCheck size={13} />
                                  <span className="text-xs font-semibold">Approved</span>
                                </div>
                                {req.approvedByName && (
                                  <p className="text-xs text-gray-400 mt-0.5">by {req.approvedByName}</p>
                                )}
                                {req.approvedAt && (
                                  <p className="text-xs text-gray-400">{formatDateTime(req.approvedAt)}</p>
                                )}
                              </div>
                            ) : req.status === 'REJECTED' ? (
                              <div>
                                <div className="flex items-center gap-1 text-red-600">
                                  <FiX size={13} />
                                  <span className="text-xs font-semibold">Rejected</span>
                                </div>
                                {req.rejectedByName && (
                                  <p className="text-xs text-gray-400 mt-0.5">by {req.rejectedByName}</p>
                                )}
                                {req.rejectedAt && (
                                  <p className="text-xs text-gray-400">{formatDateTime(req.rejectedAt)}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards for Manager */}
                <div className="md:hidden space-y-3 p-4">
                  {requests.map((req) => (
                    <div key={req._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                            {req.requesterName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{req.requesterName || 'Unknown'}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(req.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-gray-600 text-sm mb-2">
                        <div className="flex items-center gap-1.5">
                          <FiHome size={13} className="text-indigo-400" />
                          <span>{getUnitDisplay(req)}</span>
                        </div>
                        {req.unitId?._id && (
                          <button
                            onClick={() => navigate(`/inventory?unit=${req.unitId._id}`)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <FiEye size={11} /> View
                          </button>
                        )}
                      </div>

                      {req.reason && (
                        <p className="text-xs text-gray-500 mb-2">Reason: {req.reason}</p>
                      )}

                      {req.status === 'APPROVED' && req.expiresAt && (
                        <div className="flex items-center gap-2 mb-3 bg-green-50 rounded-lg px-3 py-2">
                          <FiClock size={13} className="text-green-500" />
                          {new Date(req.expiresAt) > new Date() ? (
                            <CountdownTimer expiresAt={req.expiresAt} onExpire={() => fetchRequests()} />
                          ) : (
                            <div>
                              <span className="text-xs text-red-500 font-medium">Expired</span>
                              <span className="text-xs text-gray-400 ml-2">{formatDateTime(req.expiresAt)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {req.status === 'EXPIRED' && req.expiresAt && (
                        <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                          <FiClock size={13} className="text-gray-500" />
                          <span className="text-xs text-gray-500">Expired: {formatDateTime(req.expiresAt)}</span>
                        </div>
                      )}

                      {/* Action taken info */}
                      {(req.status === 'APPROVED' || req.status === 'EXPIRED') && req.approvedAt && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-green-600">
                          <FiCheck size={12} />
                          <span className="font-semibold">Approved</span>
                          {req.approvedByName && <span className="text-gray-400">by {req.approvedByName}</span>}
                          <span className="text-gray-400">{formatDateTime(req.approvedAt)}</span>
                        </div>
                      )}

                      {req.status === 'REJECTED' && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-red-600">
                          <FiX size={12} />
                          <span className="font-semibold">Rejected</span>
                          {req.rejectedByName && <span className="text-gray-400">by {req.rejectedByName}</span>}
                          {req.rejectedAt && <span className="text-gray-400">{formatDateTime(req.rejectedAt)}</span>}
                        </div>
                      )}

                      {(isManager || user?.permissions?.includes('canApproveInventoryAccess')) && req.status === 'PENDING' && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                          <div className="relative flex-shrink-0">
                            <select
                              value={durationMap[req._id] || 120}
                              onChange={(e) => setDurationMap(prev => ({ ...prev, [req._id]: Number(e.target.value) }))}
                              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs pr-6 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              {durationOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <FiChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                          </div>
                          <button
                            onClick={() => handleApprove(req._id)}
                            disabled={actionLoading === req._id + 'approve'}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                          >
                            <FiCheck size={13} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(req._id)}
                            disabled={actionLoading === req._id + 'reject'}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                          >
                            <FiX size={13} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total count */}
                <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                  Showing {requests.length} of {total} requests
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerAccessRequestsPage;
