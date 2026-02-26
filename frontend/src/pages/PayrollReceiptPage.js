/**
 * ============================================================
 * PAYROLL RECEIPT PAGE — Employee View
 * ============================================================
 * Shows all paid payroll receipts for the logged-in employee.
 * Each receipt can be viewed in detail or downloaded as PDF.
 * Receipts appear automatically once the manager marks payroll as "Paid".
 * ============================================================
 */
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import useRealtimeData from '../hooks/useRealtimeData';
import { AuthContext } from '../context/AuthContext';
import { proPayrollAPI } from '../api/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
  const [pendingDownload, setPendingDownload] = useState(null);
  const receiptRef = useRef(null);

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

  // Capture the on-screen receipt div and save as PDF (looks identical to the modal view)
  const captureAndDownloadPDF = useCallback(async (receipt) => {
    if (!receiptRef.current) return;
    try {
      setDownloading(receipt._id);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      // If content taller than one page, split across pages
      const pageH = pdf.internal.pageSize.getHeight();
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
      } else {
        let remainH = pdfH;
        let offset = 0;
        while (remainH > 0) {
          pdf.addImage(imgData, 'JPEG', 0, -offset, pdfW, pdfH);
          remainH -= pageH;
          offset  += pageH;
          if (remainH > 0) pdf.addPage();
        }
      }
      const empName = (receipt.employeeId?.name || 'employee').replace(/\s+/g, '_');
      pdf.save(`payslip_${empName}_${receipt.month}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(null);
    }
  }, []);

  // When a download is triggered from the card (modal not yet open),
  // we open the modal first then capture after render.
  useEffect(() => {
    if (pendingDownload && viewReceipt?._id === pendingDownload && receiptRef.current) {
      const timer = setTimeout(() => {
        captureAndDownloadPDF(viewReceipt);
        setPendingDownload(null);
      }, 350); // wait for DOM to fully paint
      return () => clearTimeout(timer);
    }
  }, [viewReceipt, pendingDownload, captureAndDownloadPDF]);

  const handleDownload = (receipt) => {
    if (viewReceipt?._id === receipt._id && receiptRef.current) {
      // Modal already open — capture immediately
      captureAndDownloadPDF(receipt);
    } else {
      // Open modal first; useEffect above will trigger capture once rendered
      setViewReceipt(receipt);
      setPendingDownload(receipt._id);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={() => setViewReceipt(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[96vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Top action bar ── */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-600">Payslip — {monthLabel(viewReceipt.month)}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewReceipt)}
                  disabled={downloading === viewReceipt._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  <FiDownload size={13} />
                  {downloading === viewReceipt._id ? 'Downloading…' : 'Download PDF'}
                </button>
                <button onClick={() => setViewReceipt(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition">
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════
                PAYSLIP BODY — captured by html2canvas for PDF
            ══════════════════════════════════════════════════ */}
            <div className="p-5" ref={receiptRef}>

              {/* ── 1. COMPANY HEADER BANNER ── */}
              <div className="flex items-center gap-4 bg-[#1e3a8a] rounded-xl px-5 py-4 mb-5">
                <img
                  src="/logo.png"
                  alt="logo"
                  className="w-14 h-14 object-contain rounded-lg bg-white/10 p-1 flex-shrink-0"
                  onError={(e) => { e.target.style.display='none'; }}
                />
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Properties Professor</h2>
                  <p className="text-blue-300 text-xs mt-0.5">Professional Payroll System</p>
                  <p className="text-yellow-300 text-xs font-semibold mt-1">PAYSLIP — {monthLabel(viewReceipt.month)}</p>
                </div>
              </div>

              {/* ── 2. COMPANY + EMPLOYEE DETAILS (2 columns) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Company Details */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Company Details</h3>
                  </div>
                  {[
                    ['Company Name',  'Properties Professor'],
                    ['Address',       'Noida, Uttar Pradesh, India'],
                    ['Payslip Month', monthLabel(viewReceipt.month)],
                    ['Payslip No',    viewReceipt.payslipNumber || `PP-${(viewReceipt.month||'').replace('-','')}-${String(viewReceipt._id||'').slice(-4).toUpperCase()}`],
                  ].map(([label, value], i) => (
                    <div key={label} className={`flex px-4 py-2 text-xs ${i%2===0?'bg-gray-50':'bg-white'}`}>
                      <span className="text-gray-500 w-2/5 flex-shrink-0">{label}</span>
                      <span className="font-semibold text-gray-800 w-3/5">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Employee Details */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Employee Details</h3>
                  </div>
                  {[
                    ['Employee Name',          viewReceipt.employeeId?.name || 'N/A'],
                    ['Employee ID',            String(viewReceipt.employeeId?._id||'').slice(-12).toUpperCase()],
                    ['Designation',            viewReceipt.employeeId?.designation || viewReceipt.employeeId?.role || 'N/A'],
                    ['Department',             viewReceipt.employeeId?.department || viewReceipt.employeeId?.role || 'General'],
                    ['Date of Joining',        viewReceipt.employeeId?.joiningDate ? new Date(viewReceipt.employeeId.joiningDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A'],
                    ['UAN / PF No',            viewReceipt.employeeId?.uanNumber || 'N/A'],
                    ['Bank A/c Last 4 Digits', viewReceipt.employeeId?.bankAccountLast4 || 'XXXX'],
                  ].map(([label, value], i) => (
                    <div key={label} className={`flex px-4 py-2 text-xs ${i%2===0?'bg-gray-50':'bg-white'}`}>
                      <span className="text-gray-500 w-2/5 flex-shrink-0">{label}</span>
                      <span className="font-semibold text-gray-800 w-3/5">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 3. EARNINGS & DEDUCTIONS TABLE (4-column) ── */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                {/* Table header */}
                <div className="grid grid-cols-4 bg-gray-300">
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 text-center border-r border-gray-400">EARNINGS</div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 text-center border-r border-gray-400">AMOUNT</div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 text-center border-r border-gray-400">DEDUCTIONS</div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 text-center">AMOUNT</div>
                </div>

                {/* Row builder */}
                {[
                  ['Basic Salary',      viewReceipt.basic,             'PF (12%)',        viewReceipt.pfDeduction],
                  ['HRA',               viewReceipt.hra,               'ESI',             0],
                  ['Conveyance',        viewReceipt.conveyance,        'Professional Tax',viewReceipt.taxDeduction],
                  ['Special Allowance', viewReceipt.specialAllowance,  'TDS',             0],
                  ['Bonus/Incentive',  (viewReceipt.bonus||0)+(viewReceipt.incentives||0), 'Loan/Advance', viewReceipt.attendanceDeduction],
                  ['Other Allowance',   0,                             '',                null],
                ].map(([eLabel, eAmt, dLabel, dAmt], idx) => (
                  <div key={idx} className={`grid grid-cols-4 border-t border-gray-200 ${idx%2===0?'bg-white':'bg-gray-50'}`}>
                    <div className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200">{eLabel}</div>
                    <div className="px-3 py-2 text-xs text-gray-700 text-right border-r border-gray-200">{eAmt > 0 ? fmt(eAmt) : ''}</div>
                    <div className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200">{dLabel}</div>
                    <div className="px-3 py-2 text-xs text-gray-700 text-right">{(dAmt !== null && dAmt > 0) ? fmt(dAmt) : ''}</div>
                  </div>
                ))}

                {/* GROSS SALARY / TOTAL DEDUCTION row */}
                <div className="grid grid-cols-4 border-t border-gray-300 bg-gray-200">
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 border-r border-gray-400">GROSS SALARY</div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 text-right border-r border-gray-400">{fmt(viewReceipt.grossSalary)}</div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 border-r border-gray-400">TOTAL DEDUCTION</div>
                  <div className="px-3 py-2 text-xs font-bold text-gray-800 text-right">{fmt(viewReceipt.totalDeductions)}</div>
                </div>

                {/* NET SALARY row (green) */}
                <div className="grid grid-cols-4 bg-green-700">
                  <div className="px-3 py-3 text-sm font-bold text-white border-r border-green-600">NET SALARY</div>
                  <div className="px-3 py-3 text-sm font-bold text-white text-right border-r border-green-600 col-span-3">{fmt(viewReceipt.netSalary)}</div>
                </div>
              </div>

              {/* ── 4. ATTENDANCE SUMMARY ── */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
                <span className="text-xs font-semibold text-slate-600 mr-3">Attendance:</span>
                <span className="text-xs text-slate-600">
                  Working <strong>{viewReceipt.totalWorkingDays||0}</strong> &nbsp;|&nbsp;
                  Present <strong className="text-green-600">{viewReceipt.presentDays||0}</strong> &nbsp;|&nbsp;
                  Absent <strong className="text-red-600">{viewReceipt.absentDays||0}</strong> &nbsp;|&nbsp;
                  Half-Day <strong className="text-yellow-600">{viewReceipt.halfDays||0}</strong> &nbsp;|&nbsp;
                  Leave <strong className="text-blue-600">{viewReceipt.leaveDays||0}</strong>
                </span>
              </div>

              {/* ── 5. DIRECTOR SIGNATURE ── */}
              <div className="flex justify-end mb-4">
                <div className="text-center">
                  <img
                    src="/directorsignature.png"
                    alt="Director Signature"
                    className="h-14 object-contain mx-auto mb-1"
                    onError={(e) => { e.target.style.display='none'; }}
                  />
                  <div className="border-t border-gray-400 pt-1 w-40 mx-auto">
                    <p className="text-xs text-gray-600 font-semibold">Director / Authorized Signatory</p>
                  </div>
                </div>
              </div>

              {/* ── 6. FOOTER NOTE ── */}
              <div className="border-t border-gray-200 pt-3 text-center space-y-1">
                <p className="text-xs text-gray-500">This is a system generated payslip and does not require signature.</p>
                <p className="text-[11px] text-gray-400">Generated on: {new Date().toLocaleString('en-IN')}</p>
              </div>

            </div>{/* end payslip body */}
          </div>
        </div>
      )}
    </div>
  );
}
