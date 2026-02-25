/**
 * ============================================================
 * PAYROLL PAGE — Role-Based Access Control (RBAC)
 * ============================================================
 * 
 * UI Visibility Rules:
 * - ADMIN:    Full control — set salary, generate, edit, pay, delete, view all
 * - MANAGER:  Generate payroll, view all salaries, download payslips
 * - EMPLOYEE: View only own salary, download own payslip
 *
 * SECURITY NOTE: UI hiding is for UX only. All actions are
 *                enforced server-side by role middleware + controller checks.
 * ============================================================
 */

import React, { useState, useEffect, useContext, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { payrollAPI, employeeAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrollPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isEmployee = role === 'EMPLOYEE';

  // ── State ──
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states
  const [showSetSalaryModal, setShowSetSalaryModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSalary, setEditSalary] = useState(null);

  // Form states
  const [setSalaryForm, setSetSalaryForm] = useState({ employeeId: '', basicSalary: '' });
  const [generateForm, setGenerateForm] = useState({ employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), bonus: 0, incentives: 0, deductions: 0, deductPerAbsent: true, notes: '' });
  const [editForm, setEditForm] = useState({ bonus: 0, incentives: 0, deductions: 0, notes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // ── Helpers ──
  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 5000); };

  // ── Load data ──
  const loadSalaries = useCallback(async () => {
    try {
      setLoading(true);
      const params = { month: selectedMonth, year: selectedYear };
      const res = await payrollAPI.getAll(params);
      setSalaries(res.data);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to load salaries');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadSummary = useCallback(async () => {
    if (isEmployee) return; // Employee doesn't see summary
    try {
      const res = await payrollAPI.getSummary({ month: selectedMonth, year: selectedYear });
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }, [selectedMonth, selectedYear, isEmployee]);

  const loadEmployees = useCallback(async () => {
    if (isEmployee) return;
    try {
      const res = await employeeAPI.getAll();
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  }, [isEmployee]);

  useEffect(() => {
    loadSalaries();
    loadSummary();
    loadEmployees();
  }, [loadSalaries, loadSummary, loadEmployees]);

  // ── ADMIN: Set Basic Salary ──
  const handleSetBasicSalary = async () => {
    if (!setSalaryForm.employeeId || !setSalaryForm.basicSalary) {
      showError('Select employee and enter basic salary');
      return;
    }
    setActionLoading(true);
    try {
      await payrollAPI.setBasicSalary({
        employeeId: setSalaryForm.employeeId,
        basicSalary: parseFloat(setSalaryForm.basicSalary),
      });
      showSuccess('Basic salary updated');
      setShowSetSalaryModal(false);
      setSetSalaryForm({ employeeId: '', basicSalary: '' });
      loadEmployees();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to set salary');
    } finally {
      setActionLoading(false);
    }
  };

  // ── ADMIN/MANAGER: Generate Single Salary ──
  const handleGenerate = async () => {
    if (!generateForm.employeeId) {
      showError('Select an employee');
      return;
    }
    setActionLoading(true);
    try {
      await payrollAPI.generate({
        ...generateForm,
        bonus: parseFloat(generateForm.bonus) || 0,
        incentives: parseFloat(generateForm.incentives) || 0,
        deductions: parseFloat(generateForm.deductions) || 0,
        deductPerAbsent: generateForm.deductPerAbsent,
      });
      showSuccess('Salary generated');
      setShowGenerateModal(false);
      setGenerateForm({ employeeId: '', month: selectedMonth, year: selectedYear, bonus: 0, incentives: 0, deductions: 0, deductPerAbsent: true, notes: '' });
      loadSalaries();
      loadSummary();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate salary');
    } finally {
      setActionLoading(false);
    }
  };

  // ── ADMIN/MANAGER: Bulk Generate ──
  const handleBulkGenerate = async () => {
    if (!window.confirm(`Generate payroll for ALL active employees for ${MONTHS[selectedMonth - 1]} ${selectedYear}?`)) return;
    setActionLoading(true);
    try {
      const res = await payrollAPI.generateAll({ month: selectedMonth, year: selectedYear });
      showSuccess(res.data.message);
      loadSalaries();
      loadSummary();
    } catch (err) {
      showError(err.response?.data?.message || 'Bulk generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── ADMIN: Update bonus/incentives ──
  const handleUpdate = async () => {
    if (!editSalary) return;
    setActionLoading(true);
    try {
      await payrollAPI.update(editSalary._id, {
        bonus: parseFloat(editForm.bonus) || 0,
        incentives: parseFloat(editForm.incentives) || 0,
        deductions: parseFloat(editForm.deductions) || 0,
        notes: editForm.notes,
      });
      showSuccess('Salary updated');
      setShowEditModal(false);
      setEditSalary(null);
      loadSalaries();
      loadSummary();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  };

  // ── ADMIN: Mark as paid ──
  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this salary as PAID?')) return;
    try {
      await payrollAPI.markPaid(id);
      showSuccess('Marked as paid');
      loadSalaries();
      loadSummary();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed');
    }
  };

  // ── ADMIN: Delete salary ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this salary record permanently?')) return;
    try {
      await payrollAPI.delete(id);
      showSuccess('Deleted');
      loadSalaries();
      loadSummary();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Open edit modal ──
  const openEdit = (sal) => {
    setEditSalary(sal);
    setEditForm({ bonus: sal.bonus, incentives: sal.incentives, deductions: sal.deductions, notes: sal.notes || '' });
    setShowEditModal(true);
  };

  const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">

          {/* ── Success / Error Messages ── */}
          {successMsg && <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm font-semibold">{successMsg}</div>}
          {errorMsg && <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm font-semibold">{errorMsg}</div>}

          {/* ── Page Header ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                💰 Payroll
                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold">{role}</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isEmployee ? 'View your salary details' : 'Manage employee salaries & payroll'}
              </p>
            </div>

            {/* ── Month/Year Selector ── */}
            <div className="flex items-center gap-2">
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* ── Summary Cards — ADMIN & MANAGER only ── */}
          {!isEmployee && summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <SummaryCard label="Total Employees" value={summary.totalEmployees} color="blue" />
              <SummaryCard label="Total Payout" value={formatCurrency(summary.totalPayout)} color="green" />
              <SummaryCard label="Paid" value={summary.paidCount} color="emerald" />
              <SummaryCard label="Pending" value={summary.pendingCount} color="amber" />
            </div>
          )}

          {/* ── Action Buttons — Role-Based Visibility ── */}
          <div className="flex flex-wrap gap-3 mb-6">
            {/* ADMIN & MANAGER: Set Basic Salary */}
            {(isAdmin || isManager) && (
              <button onClick={() => setShowSetSalaryModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition shadow">
                💼 Set Basic Salary
              </button>
            )}

            {/* ADMIN & MANAGER: Generate Single */}
            {(isAdmin || isManager) && (
              <button onClick={() => { setGenerateForm(f => ({ ...f, month: selectedMonth, year: selectedYear })); setShowGenerateModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow">
                📄 Generate Salary
              </button>
            )}

            {/* ADMIN & MANAGER: Bulk Generate */}
            {(isAdmin || isManager) && (
              <button onClick={handleBulkGenerate} disabled={actionLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow disabled:opacity-50">
                {actionLoading ? 'Processing...' : '📋 Generate All'}
              </button>
            )}

            {/* EMPLOYEE sees nothing here — clean UX */}
          </div>

          {/* ── Salary Table ── */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold">Period</th>
                    <th className="px-4 py-3 text-right font-semibold">Basic</th>
                    <th className="px-4 py-3 text-right font-semibold">Bonus</th>
                    <th className="px-4 py-3 text-right font-semibold">Incentives</th>
                    <th className="px-4 py-3 text-right font-semibold">Deductions</th>
                    <th className="px-4 py-3 text-right font-semibold">Net Pay</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Days (P/A/L)</th>
                    {(isAdmin || isManager) && <th className="px-4 py-3 text-center font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : salaries.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-gray-400">No salary records for {MONTHS[selectedMonth - 1]} {selectedYear}</td></tr>
                  ) : (
                    salaries.map(sal => (
                      <tr key={sal._id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          {sal.employee?.name || 'Unknown'}
                          <div className="text-xs text-gray-400">{sal.employee?.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{MONTHS[sal.month - 1]} {sal.year}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(sal.basicSalary)}</td>
                        <td className="px-4 py-3 text-right text-green-600">+{formatCurrency(sal.bonus)}</td>
                        <td className="px-4 py-3 text-right text-blue-600">+{formatCurrency(sal.incentives)}</td>
                        <td className="px-4 py-3 text-right text-red-600">-{formatCurrency(sal.deductions)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(sal.netPay)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${sal.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {sal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {sal.presentDays}/{sal.absentDays}/{sal.leaveDays}
                        </td>
                        {(isAdmin || isManager) && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* ADMIN & MANAGER: Edit, Pay, Delete */}
                              {(isAdmin || isManager) && sal.status !== 'PAID' && (
                                <>
                                  <button onClick={() => openEdit(sal)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold hover:bg-blue-200" title="Edit bonus/incentives">✏️</button>
                                  <button onClick={() => handleMarkPaid(sal._id)} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200" title="Mark as Paid">✅</button>
                                </>
                              )}
                              {(isAdmin || isManager) && (
                                <button onClick={() => handleDelete(sal._id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200" title="Delete">🗑️</button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ════════════════════════════════════════════
              MODALS
          ════════════════════════════════════════════ */}

          {/* ── Set Basic Salary Modal (ADMIN) ── */}
          {showSetSalaryModal && (
            <Modal title="Set Basic Salary" onClose={() => setShowSetSalaryModal(false)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                  <select value={setSalaryForm.employeeId} onChange={e => setSetSalaryForm(f => ({ ...f, employeeId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select employee...</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email}) — Current: ₹{emp.basicSalary || 0}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Basic Salary (₹)</label>
                  <input type="number" min="0" value={setSalaryForm.basicSalary} onChange={e => setSetSalaryForm(f => ({ ...f, basicSalary: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. 25000" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowSetSalaryModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                  <button onClick={handleSetBasicSalary} disabled={actionLoading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50">{actionLoading ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </Modal>
          )}

          {/* ── Generate Salary Modal (ADMIN/MANAGER) ── */}
          {showGenerateModal && (
            <Modal title="Generate Salary" onClose={() => setShowGenerateModal(false)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
                  <select value={generateForm.employeeId} onChange={e => setGenerateForm(f => ({ ...f, employeeId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select employee...</option>
                    {employees.filter(e => e.basicSalary > 0).map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} — ₹{emp.basicSalary}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Month</label>
                    <select value={generateForm.month} onChange={e => setGenerateForm(f => ({ ...f, month: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg">
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
                    <select value={generateForm.year} onChange={e => setGenerateForm(f => ({ ...f, year: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                {/* Bonus/Incentives — shown to admin & manager inside generate modal */}
                {(isAdmin || isManager) && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Bonus</label>
                      <input type="number" min="0" value={generateForm.bonus} onChange={e => setGenerateForm(f => ({ ...f, bonus: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Incentives</label>
                      <input type="number" min="0" value={generateForm.incentives} onChange={e => setGenerateForm(f => ({ ...f, incentives: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Extra Deductions</label>
                      <input type="number" min="0" value={generateForm.deductions} onChange={e => setGenerateForm(f => ({ ...f, deductions: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                )}
                {/* Attendance-based deduction toggle */}
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <input type="checkbox" id="deductPerAbsent" checked={generateForm.deductPerAbsent} onChange={e => setGenerateForm(f => ({ ...f, deductPerAbsent: e.target.checked }))} className="w-4 h-4 accent-amber-600" />
                  <label htmlFor="deductPerAbsent" className="text-sm text-amber-800">
                    <strong>Auto-deduct per absent day</strong>
                    <span className="block text-xs text-amber-600">Per day deduction = Basic Salary ÷ 30. Absent days ka paisa automatically kat jayega.</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                  <input type="text" value={generateForm.notes} onChange={e => setGenerateForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Any notes..." />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                  <button onClick={handleGenerate} disabled={actionLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{actionLoading ? 'Generating...' : 'Generate'}</button>
                </div>
              </div>
            </Modal>
          )}

          {/* ── Edit Salary Modal (ADMIN) ── */}
          {showEditModal && editSalary && (
            <Modal title={`Edit Salary — ${editSalary.employee?.name}`} onClose={() => { setShowEditModal(false); setEditSalary(null); }}>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p><strong>Basic:</strong> {formatCurrency(editSalary.basicSalary)} | <strong>Period:</strong> {MONTHS[editSalary.month - 1]} {editSalary.year}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bonus</label>
                    <input type="number" min="0" value={editForm.bonus} onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Incentives</label>
                    <input type="number" min="0" value={editForm.incentives} onChange={e => setEditForm(f => ({ ...f, incentives: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Deductions</label>
                    <input type="number" min="0" value={editForm.deductions} onChange={e => setEditForm(f => ({ ...f, deductions: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowEditModal(false); setEditSalary(null); }} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">Cancel</button>
                  <button onClick={handleUpdate} disabled={actionLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">{actionLoading ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </div>
            </Modal>
          )}

        </main>
      </div>
    </div>
  );
}

// ── Reusable Summary Card ──
function SummaryCard({ label, value, color }) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-green-500 to-green-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} rounded-xl p-4 text-white shadow-lg`}>
      <p className="text-xs font-semibold opacity-80">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}

// ── Reusable Modal Wrapper ──
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
