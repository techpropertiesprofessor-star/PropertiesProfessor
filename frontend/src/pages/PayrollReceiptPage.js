/**
 * ============================================================
 * PAYROLL RECEIPT PAGE — Employee View
 * ============================================================
 * Shows all paid payroll receipts for the logged-in employee.
 * Each receipt can be viewed in detail or downloaded as PDF.
 * Receipts appear automatically once the manager marks payroll as "Paid".
 * ============================================================
 */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import useRealtimeData from '../hooks/useRealtimeData';
import { AuthContext } from '../context/AuthContext';
import { proPayrollAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import {
  FiFileText, FiDownload, FiEye, FiX,
  FiCalendar, FiCheckCircle, FiClock, FiUser, FiMail,
  FiBriefcase, FiHash
} from 'react-icons/fi';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const monthLabel = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[parseInt(mo) - 1]} ${y}`;
};

export default function PayrollReceiptPage() {
  const { user } = useContext(AuthContext);
  const sidebarCollapsed = useSidebarCollapsed();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReceipt, setViewReceipt] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await proPayrollAPI.getMyReceipts();
      setReceipts(res.data.data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Real-time: refresh receipts when payroll is paid
  useRealtimeData(['payroll:paid'], fetchReceipts);

  const handleDownload = async (receipt) => {
    try {
      setDownloading(receipt._id);
      const res = await proPayrollAPI.downloadReceiptPDF(receipt._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const empName = (receipt.employeeId?.name || 'employee').replace(/\s+/g, '_');
      a.download = `payroll_receipt_${empName}_${receipt.month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-24">

          {/* Page Title */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FiFileText className="text-indigo-600" size={22} />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Payroll Receipts</h1>
                <p className="text-sm text-gray-500">Your salary payment receipts</p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500 text-sm">Loading receipts...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && receipts.length === 0 && (
            <div className="bg-white rounded-2xl p-8 md:p-12 text-center border shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiFileText className="text-gray-400" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Receipts Yet</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Your payroll receipts will appear here automatically once your salary is marked as paid by the manager.
              </p>
            </div>
          )}

          {/* Receipts List */}
          {!loading && receipts.length > 0 && (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div
                  key={receipt._id}
                  className="bg-white rounded-xl shadow-sm border hover:border-indigo-200 transition-all duration-200"
                >
                  {/* Card Header */}
                  <div className="p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiCheckCircle className="text-green-600" size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{monthLabel(receipt.month)}</h3>
                          <p className="text-xs text-gray-400">
                            Paid on {receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          Paid
                        </span>
                      </div>
                    </div>

                    {/* Salary Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Gross Salary</p>
                        <p className="font-semibold text-gray-800">{fmt(receipt.grossSalary)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Deductions</p>
                        <p className="font-semibold text-red-600">{fmt(receipt.totalDeductions)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Bonus + Incentives</p>
                        <p className="font-semibold text-blue-600">{fmt((receipt.bonus || 0) + (receipt.incentives || 0))}</p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                        <p className="text-xs text-indigo-400">Net Salary</p>
                        <p className="font-bold text-indigo-700 text-lg">{fmt(receipt.netSalary)}</p>
                      </div>
                    </div>

                    {/* Attendance Row */}
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Present: {receipt.presentDays}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span>Absent: {receipt.absentDays}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full"></span>Half-Day: {receipt.halfDays}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Leave: {receipt.leaveDays}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => setViewReceipt(receipt)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
                      >
                        <FiEye size={14} /> View Receipt
                      </button>
                      <button
                        onClick={() => handleDownload(receipt)}
                        disabled={downloading === receipt._id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        <FiDownload size={14} />
                        {downloading === receipt._id ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* VIEW RECEIPT MODAL */}
      {/* ═══════════════════════════════════════════ */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => setViewReceipt(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-700 to-blue-700 text-white p-5 rounded-t-2xl flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold">Payroll Receipt</h2>
                <p className="text-indigo-200 text-sm">{monthLabel(viewReceipt.month)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewReceipt)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                  title="Download PDF"
                >
                  <FiDownload size={18} />
                </button>
                <button
                  onClick={() => setViewReceipt(null)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">

              {/* Company Header */}
              <div className="text-center py-3 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Properties Professor Pvt. Ltd.</h3>
                <p className="text-xs text-gray-400">Professional Payroll System</p>
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                  PAID
                </span>
              </div>

              {/* Employee Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Employee Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-gray-400" size={14} />
                    <span className="text-gray-500">Name:</span>
                    <span className="font-semibold text-gray-800">{viewReceipt.employeeId?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiMail className="text-gray-400" size={14} />
                    <span className="text-gray-500">Email:</span>
                    <span className="font-semibold text-gray-800 text-xs">{viewReceipt.employeeId?.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiBriefcase className="text-gray-400" size={14} />
                    <span className="text-gray-500">Designation:</span>
                    <span className="font-semibold text-gray-800">{viewReceipt.employeeId?.designation || viewReceipt.employeeId?.role || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-gray-400" size={14} />
                    <span className="text-gray-500">Pay Period:</span>
                    <span className="font-semibold text-gray-800">{monthLabel(viewReceipt.month)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiHash className="text-gray-400" size={14} />
                    <span className="text-gray-500">Employee ID:</span>
                    <span className="font-semibold text-gray-800 text-xs">{(viewReceipt.employeeId?._id || '').toString().slice(-6).toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="text-gray-400" size={14} />
                    <span className="text-gray-500">Paid On:</span>
                    <span className="font-semibold text-gray-800">
                      {viewReceipt.paidAt ? new Date(viewReceipt.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-blue-600 uppercase mb-3">Attendance Summary</h4>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Working</p>
                    <p className="font-bold text-gray-800">{viewReceipt.totalWorkingDays}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Present</p>
                    <p className="font-bold text-green-600">{viewReceipt.presentDays}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Absent</p>
                    <p className="font-bold text-red-600">{viewReceipt.absentDays}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Half-Day</p>
                    <p className="font-bold text-yellow-600">{viewReceipt.halfDays}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Leave</p>
                    <p className="font-bold text-blue-600">{viewReceipt.leaveDays}</p>
                  </div>
                </div>
              </div>

              {/* Earnings Table */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Earnings</h4>
                <div className="bg-white border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-gray-600 font-semibold text-xs">Component</th>
                        <th className="text-right px-4 py-2.5 text-gray-600 font-semibold text-xs">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr><td className="px-4 py-2.5">Basic Salary</td><td className="px-4 py-2.5 text-right font-medium">{fmt(viewReceipt.basic)}</td></tr>
                      <tr><td className="px-4 py-2.5">HRA</td><td className="px-4 py-2.5 text-right font-medium">{fmt(viewReceipt.hra)}</td></tr>
                      <tr><td className="px-4 py-2.5">Conveyance</td><td className="px-4 py-2.5 text-right font-medium">{fmt(viewReceipt.conveyance)}</td></tr>
                      <tr><td className="px-4 py-2.5">Special Allowance</td><td className="px-4 py-2.5 text-right font-medium">{fmt(viewReceipt.specialAllowance)}</td></tr>
                      {(viewReceipt.bonus > 0) && (
                        <tr><td className="px-4 py-2.5 text-blue-600">Bonus</td><td className="px-4 py-2.5 text-right font-medium text-blue-600">{fmt(viewReceipt.bonus)}</td></tr>
                      )}
                      {(viewReceipt.incentives > 0) && (
                        <tr><td className="px-4 py-2.5 text-blue-600">Incentives</td><td className="px-4 py-2.5 text-right font-medium text-blue-600">{fmt(viewReceipt.incentives)}</td></tr>
                      )}
                      <tr className="bg-indigo-50 font-bold">
                        <td className="px-4 py-2.5 text-indigo-700">Gross Salary</td>
                        <td className="px-4 py-2.5 text-right text-indigo-700">{fmt(viewReceipt.grossSalary)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deductions Table */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Deductions</h4>
                <div className="bg-white border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-gray-600 font-semibold text-xs">Deduction</th>
                        <th className="text-right px-4 py-2.5 text-gray-600 font-semibold text-xs">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr><td className="px-4 py-2.5">PF Deduction</td><td className="px-4 py-2.5 text-right font-medium text-red-600">{fmt(viewReceipt.pfDeduction)}</td></tr>
                      <tr><td className="px-4 py-2.5">Tax Deduction</td><td className="px-4 py-2.5 text-right font-medium text-red-600">{fmt(viewReceipt.taxDeduction)}</td></tr>
                      <tr><td className="px-4 py-2.5">Attendance Deduction</td><td className="px-4 py-2.5 text-right font-medium text-red-600">{fmt(viewReceipt.attendanceDeduction)}</td></tr>
                      <tr className="bg-red-50 font-bold">
                        <td className="px-4 py-2.5 text-red-700">Total Deductions</td>
                        <td className="px-4 py-2.5 text-right text-red-700">{fmt(viewReceipt.totalDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-5 text-white text-center">
                <p className="text-green-200 text-sm font-medium">Net Salary (Take Home)</p>
                <p className="text-3xl font-bold mt-1">{fmt(viewReceipt.netSalary)}</p>
              </div>

              {/* Audit Trail */}
              <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-400 space-y-1">
                <p><strong>Generated by:</strong> {viewReceipt.generatedBy?.name || 'System'} on {viewReceipt.generatedAt ? new Date(viewReceipt.generatedAt).toLocaleString('en-IN') : 'N/A'}</p>
                <p><strong>Approved by:</strong> {viewReceipt.approvedBy?.name || 'N/A'} on {viewReceipt.approvedAt ? new Date(viewReceipt.approvedAt).toLocaleString('en-IN') : 'N/A'}</p>
                <p><strong>Paid by:</strong> {viewReceipt.paidBy?.name || 'N/A'} on {viewReceipt.paidAt ? new Date(viewReceipt.paidAt).toLocaleString('en-IN') : 'N/A'}</p>
                {viewReceipt.notes && <p><strong>Notes:</strong> {viewReceipt.notes}</p>}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-400 pt-3 border-t border-gray-200">
                <p>This is a computer-generated document. No physical signature is required.</p>
                <p className="mt-1">Generated on: {new Date().toLocaleString('en-IN')}</p>
              </div>

              {/* Download Button */}
              <button
                onClick={() => handleDownload(viewReceipt)}
                disabled={downloading === viewReceipt._id}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FiDownload size={16} />
                {downloading === viewReceipt._id ? 'Downloading...' : 'Download PDF Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
