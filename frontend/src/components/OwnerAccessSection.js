import React, { useState, useEffect, useCallback } from 'react';
import { ownerAccessAPI } from '../api/client';
import { useSocket } from '../context/SocketContext';
import CountdownTimer from './CountdownTimer';
import { FiLock, FiUser, FiPhone, FiMail, FiClock, FiSend, FiCheckCircle, FiXCircle } from 'react-icons/fi';

function OwnerAccessSection({ unit, user, onAccessGranted }) {
  const [accessState, setAccessState] = useState('loading'); // loading | manager | locked | pending | unlocked | requesting
  const [accessInfo, setAccessInfo] = useState(null);
  const [reason, setReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState('');
  const { on, off } = useSocket();

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const checkAccess = useCallback(async () => {
    if (!unit?._id) return;

    if (isManager) {
      setAccessState('manager');
      return;
    }

    try {
      const res = await ownerAccessAPI.checkAccess(unit._id);
      const data = res.data;

      if (data.isManager) {
        setAccessState('manager');
      } else if (data.hasAccess) {
        setAccessInfo(data);
        setAccessState('unlocked');
      } else if (data.hasPendingRequest) {
        setAccessState('pending');
      } else {
        setAccessState('locked');
      }
    } catch (err) {
      console.error('Failed to check owner access:', err);
      setAccessState('locked');
    }
  }, [unit?._id, isManager]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Listen for real-time access updates
  useEffect(() => {
    if (!on || !off || isManager) return;

    const handleApproved = (data) => {
      if (data?.request?.unitId === unit?._id || data?.request?.unitId?._id === unit?._id) {
        checkAccess();
        if (onAccessGranted) onAccessGranted();
      }
    };
    const handleRejected = (data) => {
      if (data?.request?.unitId === unit?._id || data?.request?.unitId?._id === unit?._id) {
        checkAccess();
      }
    };

    on('owner-access-approved', handleApproved);
    on('owner-access-rejected', handleRejected);
    return () => {
      off('owner-access-approved', handleApproved);
      off('owner-access-rejected', handleRejected);
    };
  }, [on, off, unit?._id, isManager, checkAccess, onAccessGranted]);

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    setError('');
    try {
      await ownerAccessAPI.requestAccess({ unitId: unit._id, reason });
      setAccessState('pending');
      setReason('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to request access';
      if (err.response?.status === 409) {
        setAccessState('pending');
      } else {
        setError(msg);
      }
    } finally {
      setRequestLoading(false);
    }
  };

  const handleExpired = () => {
    setAccessState('locked');
    setAccessInfo(null);
  };

  // ── Manager View: Always show owner details ──
  if (accessState === 'manager') {
    const hasOwnerData = unit?.owner_name || unit?.owner_phone || unit?.owner_email;
    if (!hasOwnerData) return null;

    return (
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <FiUser className="text-blue-500" /> Owner Information
        </h4>
        <div className="bg-blue-50 rounded-xl p-4 space-y-2">
          {unit.owner_name && (
            <div className="flex items-center gap-2 text-sm">
              <FiUser className="text-gray-400" size={14} />
              <span className="font-medium text-gray-800">{unit.owner_name}</span>
            </div>
          )}
          {unit.owner_phone && (
            <div className="flex items-center gap-2 text-sm">
              <FiPhone className="text-gray-400" size={14} />
              <span className="text-gray-700">{unit.owner_phone}</span>
            </div>
          )}
          {unit.owner_email && (
            <div className="flex items-center gap-2 text-sm">
              <FiMail className="text-gray-400" size={14} />
              <span className="text-gray-700">{unit.owner_email}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Loading State ──
  if (accessState === 'loading') {
    return (
      <div className="mb-5">
        <div className="bg-gray-50 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // ── Locked State: Show request button ──
  if (accessState === 'locked' || accessState === 'requesting') {
    return (
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <FiLock className="text-red-500" /> Owner Details
        </h4>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiLock className="text-red-400" size={16} />
            <span className="text-sm text-red-700 font-medium">Owner details are restricted</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Request temporary access to view owner contact information. A manager will review your request.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Reason for access (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleRequestAccess}
              disabled={requestLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestLoading ? (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              ) : (
                <FiSend size={14} />
              )}
              Request Owner Access
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Pending State: Request submitted ──
  if (accessState === 'pending') {
    return (
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <FiClock className="text-amber-500" /> Owner Details
        </h4>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <FiClock className="text-amber-500 animate-pulse" size={16} />
            <span className="text-sm text-amber-700 font-medium">Access Requested — Pending Approval</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your request has been submitted. You will be notified when a manager approves it.
          </p>
        </div>
      </div>
    );
  }

  // ── Unlocked State: Show owner details with countdown ──
  if (accessState === 'unlocked') {
    return (
      <div className="mb-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <FiCheckCircle className="text-green-500" /> Owner Information
        </h4>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          {/* Countdown Timer */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-200">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <FiClock size={12} />
              <span>Access expires in:</span>
            </div>
            <CountdownTimer
              expiresAt={accessInfo?.expiresAt}
              onExpire={handleExpired}
            />
          </div>

          {/* Owner Details */}
          <div className="space-y-2">
            {unit.owner_name && (
              <div className="flex items-center gap-2 text-sm">
                <FiUser className="text-gray-400" size={14} />
                <span className="font-medium text-gray-800">{unit.owner_name}</span>
              </div>
            )}
            {unit.owner_phone && (
              <div className="flex items-center gap-2 text-sm">
                <FiPhone className="text-gray-400" size={14} />
                <a href={`tel:${unit.owner_phone}`} className="text-blue-600 hover:underline">{unit.owner_phone}</a>
              </div>
            )}
            {unit.owner_email && (
              <div className="flex items-center gap-2 text-sm">
                <FiMail className="text-gray-400" size={14} />
                <a href={`mailto:${unit.owner_email}`} className="text-blue-600 hover:underline">{unit.owner_email}</a>
              </div>
            )}
            {!unit.owner_name && !unit.owner_phone && !unit.owner_email && (
              <p className="text-xs text-gray-500">No owner details available for this unit.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default OwnerAccessSection;
