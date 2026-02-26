/**
 * ============================================================
 * PROFESSIONAL PAYROLL DASHBOARD — React Frontend
 * ============================================================
 * Comprehensive payroll management UI with role-based visibility.
 *
 * Tabs:
 *   1. Dashboard     — Stats cards (total salary, pending, paid, attendance %)
 *   2. Salary Structure — Create / manage salary structures (ADMIN)
 *   3. Generate Payroll — Generate single / bulk payroll (ADMIN, MANAGER)
 *   4. Payroll Records — View all payrolls, approve, mark paid (ADMIN)
 *   5. My Salary     — Employee's own salary history (EMPLOYEE)
 *
 * Features:
 *   • Excel export button
 *   • PDF payslip download
 *   • Approve / Mark Paid workflow
 *   • Responsive Tailwind UI
 * ============================================================
 */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import useRealtimeData from '../hooks/useRealtimeData';
import { AuthContext } from '../context/AuthContext';
import { proPayrollAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import {
  FiDollarSign, FiUsers, FiCheckCircle, FiClock, FiDownload,
  FiFileText, FiPlus, FiTrash2, FiEdit, FiChevronDown, FiRefreshCw,
  FiAlertCircle, FiPercent, FiCalendar, FiCheck, FiX
} from 'react-icons/fi';

// ── Helpers ──
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (m) => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo)-1]} ${y}`;
};

export default function ProPayrollDashboard() {
  const { user } = useContext(AuthContext);
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isManager = role === 'MANAGER';
  const isEmployee = role === 'EMPLOYEE';

  // ── State ──
  const [activeTab, setActiveTab] = useState(isEmployee ? 'my-salary' : 'dashboard');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Dashboard stats
  const [stats, setStats] = useState(null);

  // Salary structures
  const [structures, setStructures] = useState([]);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structureForm, setStructureForm] = useState({
    label: '', basic: '', hra: '', conveyance: '', specialAllowance: '', pfPercent: '', taxPercent: ''
  });
  const [editStructureId, setEditStructureId] = useState(null);

  // Employees list (for assignment & generation)
  const [employees, setEmployees] = useState([]);

  // Assign structure
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ employeeId: '', salaryStructureId: '' });

  // Generate payroll
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ employeeId: '', month: getCurrentMonth(), bonus: 0, incentives: 0, notes: '' });

  // Payroll records
  const [payrolls, setPayrolls] = useState([]);

  // My salary (employee)
  const [mySalary, setMySalary] = useState([]);

  // Sidebar collapsed
  const [sidebarCollapsed] = useState(false);

  // ── Toast helper ──
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data Fetchers ──
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await proPayrollAPI.getDashboard({ month: selectedMonth });
      setStats(res.data.data);
    } catch { }
  }, [selectedMonth]);

  const fetchStructures = useCallback(async () => {
    try {
      const res = await proPayrollAPI.getSalaryStructures();
      setStructures(res.data.data || []);
    } catch { }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const { employeeAPI } = await import('../api/client');
      const res = await employeeAPI.getAll();
      setEmployees(res.data.data || res.data || []);
    } catch { }
  }, []);

  const fetchPayrolls = useCallback(async () => {
    try {
      const res = await proPayrollAPI.getAllPayrolls({ month: selectedMonth });
      setPayrolls(res.data.data || []);
    } catch { }
  }, [selectedMonth]);

  const fetchMySalary = useCallback(async () => {
    try {
      if (!user?.employeeId) return;
      const res = await proPayrollAPI.getPayroll(user.employeeId, { month: selectedMonth });
      setMySalary(res.data.data || []);
    } catch { }
  }, [selectedMonth, user?.employeeId]);

  useEffect(() => {
    if (isAdmin || isManager) {
      fetchDashboard();
      fetchPayrolls();
      fetchEmployees();
    }
    if (isAdmin || isManager) fetchStructures();
    if (isEmployee) fetchMySalary();
  }, [selectedMonth, isAdmin, isManager, isEmployee, fetchDashboard, fetchPayrolls, fetchEmployees, fetchStructures, fetchMySalary]);

  // Real-time: refresh dashboard and payrolls for managers
  useRealtimeData(['payroll:managerUpdate'], () => {
    if (isAdmin || isManager) {
      fetchDashboard();
      fetchPayrolls();
    }
    if (isEmployee) fetchMySalary();
  });

  // ── Handlers ──

  // Create / Update salary structure
  const handleSaveStructure = async () => {
    try {
      setLoading(true);
      const data = {
        label: structureForm.label,
        basic: parseFloat(structureForm.basic) || 0,
        hra: parseFloat(structureForm.hra) || 0,
        conveyance: parseFloat(structureForm.conveyance) || 0,
        specialAllowance: parseFloat(structureForm.specialAllowance) || 0,
        pfPercent: parseFloat(structureForm.pfPercent) || 0,
        taxPercent: parseFloat(structureForm.taxPercent) || 0,
      };
      if (editStructureId) {
        await proPayrollAPI.updateSalaryStructure(editStructureId, data);
        showToast('Structure updated');
      } else {
        await proPayrollAPI.createSalaryStructure(data);
        showToast('Structure created');
      }
      setShowStructureModal(false);
      setEditStructureId(null);
      setStructureForm({ label: '', basic: '', hra: '', conveyance: '', specialAllowance: '', pfPercent: '', taxPercent: '' });
      fetchStructures();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving structure', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStructure = async (id) => {
    if (!window.confirm('Delete this salary structure?')) return;
    try {
      await proPayrollAPI.deleteSalaryStructure(id);
      showToast('Structure deleted');
      fetchStructures();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleAssignStructure = async () => {
    try {
      setLoading(true);
      await proPayrollAPI.assignStructure(assignForm);
      showToast('Structure assigned to employee');
      setShowAssignModal(false);
      setAssignForm({ employeeId: '', salaryStructureId: '' });
      fetchEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setLoading(true);
      if (generateForm.employeeId === 'ALL') {
        const res = await proPayrollAPI.generateAll({ month: generateForm.month, notes: generateForm.notes });
        showToast(res.data.message);
      } else {
        await proPayrollAPI.generate(generateForm.employeeId, {
          month: generateForm.month,
          bonus: parseFloat(generateForm.bonus) || 0,
          incentives: parseFloat(generateForm.incentives) || 0,
          notes: generateForm.notes,
        });
        showToast('Payroll generated');
      }
      setShowGenerateModal(false);
      setGenerateForm({ employeeId: '', month: selectedMonth, bonus: 0, incentives: 0, notes: '' });
      fetchPayrolls();
      fetchDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error generating payroll', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await proPayrollAPI.approve(id);
      showToast('Payroll approved');
      fetchPayrolls();
      fetchDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await proPayrollAPI.markPaid(id);
      showToast('Marked as Paid');
      fetchPayrolls();
      fetchDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payroll record?')) return;
    try {
      await proPayrollAPI.delete(id);
      showToast('Deleted');
      fetchPayrolls();
      fetchDashboard();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error', 'error');
    }
  };

  const handleDownloadSlip = async (id) => {
    try {
      const res = await proPayrollAPI.downloadSlip(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Error downloading payslip', 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await proPayrollAPI.exportExcel({ month: selectedMonth });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_${selectedMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error exporting', 'error');
    }
  };

  // ── Tab definitions (shorter labels for mobile) ──
  const tabs = [];
  if (isAdmin || isManager) tabs.push({ key: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: FiDollarSign });
  if (isAdmin || isManager) tabs.push({ key: 'structures', label: 'Salary Structure', shortLabel: 'Structure', icon: FiPercent });
  if (isAdmin || isManager) tabs.push({ key: 'generate', label: 'Generate Payroll', shortLabel: 'Generate', icon: FiRefreshCw });
  if (isAdmin || isManager) tabs.push({ key: 'records', label: 'Payroll Records', shortLabel: 'Records', icon: FiFileText });
  if (isEmployee) tabs.push({ key: 'my-salary', label: 'My Salary', shortLabel: 'Salary', icon: FiDollarSign });

  // ── Status badge ──
  const StatusBadge = ({ status }) => {
    const colors = {
      Generated: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-blue-100 text-blue-800',
      Paid: 'bg-green-100 text-green-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-24">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
              {toast.msg}
            </div>
          )}

          {/* Page Title + Month Selector */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Payroll Manage</h1>
              <p className="text-sm text-gray-500">Company-Level Salary & Payroll Management</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <FiCalendar className="text-gray-400 hidden sm:block" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              />
              {(isAdmin || isManager) && (
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition">
                  <FiDownload size={14} /> Export Excel
                </button>
              )}
            </div>
          </div>

          {/* Tabs - Mobile scroll friendly */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm border overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={14} className="flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* TAB: Dashboard */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === 'dashboard' && stats && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={FiDollarSign} label="Total Salary" value={fmt(stats.totalSalary)} color="indigo" />
                <StatCard icon={FiClock} label="Pending Approvals" value={stats.pendingApprovals} color="yellow" />
                <StatCard icon={FiCheckCircle} label="Paid" value={stats.paidCount} color="green" />
                <StatCard icon={FiUsers} label="Attendance %" value={`${stats.attendancePercent}%`} color="blue" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border">
                  <p className="text-sm text-gray-500">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalEmployees}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border">
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.approvedCount}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border">
                  <p className="text-sm text-gray-500">Month</p>
                  <p className="text-2xl font-bold text-gray-800">{monthLabel(selectedMonth)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB: Salary Structures (ADMIN) */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === 'structures' && (isAdmin || isManager) && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Salary Structures</h2>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => { setShowAssignModal(true); fetchEmployees(); fetchStructures(); }} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    <FiUsers size={14} /> Assign
                  </button>
                  <button onClick={() => { setEditStructureId(null); setStructureForm({ label:'', basic:'', hra:'', conveyance:'', specialAllowance:'', pfPercent:'', taxPercent:'' }); setShowStructureModal(true); }} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                    <FiPlus size={14} /> Create
                  </button>
                </div>
              </div>

              {structures.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">No salary structures yet. Create one to get started.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {structures.map(s => (
                    <div key={s._id} className="bg-white rounded-xl p-5 shadow-sm border hover:border-indigo-300 transition">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-800">{s.label || 'Unnamed Structure'}</h3>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditStructureId(s._id); setStructureForm({ label: s.label||'', basic: s.basic, hra: s.hra, conveyance: s.conveyance, specialAllowance: s.specialAllowance, pfPercent: s.pfPercent, taxPercent: s.taxPercent }); setShowStructureModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><FiEdit size={14}/></button>
                          <button onClick={() => handleDeleteStructure(s._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><FiTrash2 size={14}/></button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Basic: <strong className="text-gray-800">{fmt(s.basic)}</strong></p>
                        <p>HRA: {fmt(s.hra)} | Conveyance: {fmt(s.conveyance)}</p>
                        <p>Special: {fmt(s.specialAllowance)}</p>
                        <p className="text-indigo-600 font-semibold">Gross: {fmt(s.grossSalary)}</p>
                        <p className="text-xs text-gray-400">PF: {s.pfPercent}% | Tax: {s.taxPercent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB: Generate Payroll */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === 'generate' && (isAdmin || isManager) && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Generate Payroll</h2>
                <button onClick={() => { setGenerateForm({ employeeId: '', month: selectedMonth, bonus: 0, incentives: 0, notes: '' }); setShowGenerateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 w-fit">
                  <FiRefreshCw size={14} /> Generate
                </button>
              </div>

              {/* Employee list with structure status */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Designation</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Salary Structure</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Gross</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {employees.filter(e => e.status === 'active').map(emp => {
                        const hasPayroll = payrolls.some(p => (p.employeeId?._id || p.employeeId) === emp._id);
                        return (
                          <tr key={emp._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                            <td className="px-4 py-3 text-gray-600">{emp.designation || emp.role}</td>
                            <td className="px-4 py-3">
                              {emp.salaryStructureId ? (
                                <span className="text-green-600 text-xs font-medium">✓ Assigned</span>
                              ) : (
                                <span className="text-red-500 text-xs font-medium">✗ Not Assigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{emp.basicSalary ? fmt(emp.basicSalary) : '—'}</td>
                            <td className="px-4 py-3 text-center">
                              {hasPayroll ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Generated</span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {employees.filter(e => e.status === 'active').length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No active employees</div>
                  ) : (
                    employees.filter(e => e.status === 'active').map(emp => {
                      const hasPayroll = payrolls.some(p => (p.employeeId?._id || p.employeeId) === emp._id);
                      return (
                        <div key={emp._id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{emp.name}</p>
                              <p className="text-xs text-gray-500">{emp.designation || emp.role}</p>
                            </div>
                            {hasPayroll ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Generated</span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">Pending</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-2 text-sm">
                            <span className="text-gray-500">
                              {emp.salaryStructureId ? (
                                <span className="text-green-600 font-medium">✓ Structure Assigned</span>
                              ) : (
                                <span className="text-red-500 font-medium">✗ No Structure</span>
                              )}
                            </span>
                            <span className="font-medium text-gray-800">{emp.basicSalary ? fmt(emp.basicSalary) : '—'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB: Payroll Records */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === 'records' && (isAdmin || isManager) && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Payroll Records — {monthLabel(selectedMonth)}
              </h2>
              {payrolls.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">No payroll records for this month.</div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Gross</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Deductions</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-600">Net Salary</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Attendance</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {payrolls.map(p => (
                          <tr key={p._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{p.employeeId?.name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{p.employeeId?.designation || p.employeeId?.role}</p>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{fmt(p.grossSalary)}</td>
                            <td className="px-4 py-3 text-right text-red-600">{fmt(p.totalDeductions)}</td>
                            <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(p.netSalary)}</td>
                            <td className="px-4 py-3 text-center text-xs">
                              <span className="text-green-600">{p.presentDays}P</span> /
                              <span className="text-red-500"> {p.absentDays}A</span> /
                              <span className="text-yellow-600"> {p.halfDays}H</span> /
                              <span className="text-blue-500"> {p.leaveDays}L</span>
                            </td>
                            <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {(isAdmin || isManager) && p.status === 'Generated' && (
                                  <button onClick={() => handleApprove(p._id)} title="Approve" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                    <FiCheck size={14} />
                                  </button>
                                )}
                                {(isAdmin || isManager) && p.status === 'Approved' && (
                                  <button onClick={() => handleMarkPaid(p._id)} title="Mark Paid" className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                                    <FiDollarSign size={14} />
                                  </button>
                                )}
                                <button onClick={() => handleDownloadSlip(p._id)} title="Download Payslip" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded">
                                  <FiDownload size={14} />
                                </button>
                                {(isAdmin || isManager) && p.status !== 'Paid' && (
                                  <button onClick={() => handleDelete(p._id)} title="Delete" className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                    <FiTrash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {payrolls.map(p => (
                      <div key={p._id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{p.employeeId?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-400">{p.employeeId?.designation || p.employeeId?.role}</p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3">
                          <div>
                            <p className="text-xs text-gray-400">Gross</p>
                            <p className="font-medium">{fmt(p.grossSalary)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Deductions</p>
                            <p className="font-medium text-red-600">{fmt(p.totalDeductions)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Net Salary</p>
                            <p className="font-bold text-green-700 text-base">{fmt(p.netSalary)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Attendance</p>
                            <p className="text-xs font-medium">
                              <span className="text-green-600">{p.presentDays}P</span>{' / '}
                              <span className="text-red-500">{p.absentDays}A</span>{' / '}
                              <span className="text-yellow-600">{p.halfDays}H</span>{' / '}
                              <span className="text-blue-500">{p.leaveDays}L</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                          {(isAdmin || isManager) && p.status === 'Generated' && (
                            <button onClick={() => handleApprove(p._id)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 flex items-center gap-1">
                              <FiCheck size={12} /> Approve
                            </button>
                          )}
                          {(isAdmin || isManager) && p.status === 'Approved' && (
                            <button onClick={() => handleMarkPaid(p._id)} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 flex items-center gap-1">
                              <FiDollarSign size={12} /> Pay
                            </button>
                          )}
                          <button onClick={() => handleDownloadSlip(p._id)} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 flex items-center gap-1">
                            <FiDownload size={12} /> Payslip
                          </button>
                          {(isAdmin || isManager) && p.status !== 'Paid' && (
                            <button onClick={() => handleDelete(p._id)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1">
                              <FiTrash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TAB: My Salary (EMPLOYEE) */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === 'my-salary' && isEmployee && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">My Salary History</h2>
              {mySalary.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">No salary records found.</div>
              ) : (
                <div className="space-y-4">
                  {mySalary.map(p => (
                    <div key={p._id} className="bg-white rounded-xl p-5 shadow-sm border">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">{monthLabel(p.month)}</h3>
                          <StatusBadge status={p.status} />
                        </div>
                        <button onClick={() => handleDownloadSlip(p._id)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">
                          <FiDownload size={12} /> Payslip
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-gray-400 text-xs">Gross</p><p className="font-semibold">{fmt(p.grossSalary)}</p></div>
                        <div><p className="text-gray-400 text-xs">Deductions</p><p className="font-semibold text-red-600">{fmt(p.totalDeductions)}</p></div>
                        <div><p className="text-gray-400 text-xs">Bonus + Incentives</p><p className="font-semibold text-blue-600">{fmt((p.bonus||0)+(p.incentives||0))}</p></div>
                        <div><p className="text-gray-400 text-xs">Net Salary</p><p className="font-bold text-green-700 text-lg">{fmt(p.netSalary)}</p></div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 sm:gap-4 text-xs text-gray-500">
                        <span>Present: {p.presentDays}</span>
                        <span>Absent: {p.absentDays}</span>
                        <span>Half-Day: {p.halfDays}</span>
                        <span>Leave: {p.leaveDays}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL: Create/Edit Salary Structure */}
      {/* ═══════════════════════════════════════════ */}
      {showStructureModal && (
        <Modal title={editStructureId ? 'Edit Salary Structure' : 'Create Salary Structure'} onClose={() => setShowStructureModal(false)}>
          <div className="space-y-3">
            <Input label="Label (optional)" value={structureForm.label} onChange={v => setStructureForm(f => ({...f, label: v}))} placeholder="e.g. Senior Developer Package" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Basic *" type="number" value={structureForm.basic} onChange={v => setStructureForm(f => ({...f, basic: v}))} />
              <Input label="HRA" type="number" value={structureForm.hra} onChange={v => setStructureForm(f => ({...f, hra: v}))} />
              <Input label="Conveyance" type="number" value={structureForm.conveyance} onChange={v => setStructureForm(f => ({...f, conveyance: v}))} />
              <Input label="Special Allowance" type="number" value={structureForm.specialAllowance} onChange={v => setStructureForm(f => ({...f, specialAllowance: v}))} />
              <Input label="PF %" type="number" value={structureForm.pfPercent} onChange={v => setStructureForm(f => ({...f, pfPercent: v}))} />
              <Input label="Tax %" type="number" value={structureForm.taxPercent} onChange={v => setStructureForm(f => ({...f, taxPercent: v}))} />
            </div>
            {structureForm.basic && (
              <div className="p-3 bg-indigo-50 rounded-lg text-sm">
                <strong>Gross: {fmt(
                  (parseFloat(structureForm.basic)||0) + (parseFloat(structureForm.hra)||0) +
                  (parseFloat(structureForm.conveyance)||0) + (parseFloat(structureForm.specialAllowance)||0)
                )}</strong>
              </div>
            )}
            <button onClick={handleSaveStructure} disabled={loading || !structureForm.basic} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-700 transition">
              {loading ? 'Saving...' : (editStructureId ? 'Update' : 'Create')}
            </button>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL: Assign Structure to Employee */}
      {/* ═══════════════════════════════════════════ */}
      {showAssignModal && (
        <Modal title="Assign Salary Structure" onClose={() => setShowAssignModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Employee</label>
              <select value={assignForm.employeeId} onChange={e => setAssignForm(f => ({...f, employeeId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select Employee</option>
                {employees.filter(e => e.status === 'active').map(e => (
                  <option key={e._id} value={e._id}>{e.name} ({e.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Salary Structure</label>
              <select value={assignForm.salaryStructureId} onChange={e => setAssignForm(f => ({...f, salaryStructureId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select Structure</option>
                {structures.map(s => (
                  <option key={s._id} value={s._id}>{s.label || 'Unnamed'} — Gross: {fmt(s.grossSalary)}</option>
                ))}
              </select>
            </div>
            <button onClick={handleAssignStructure} disabled={loading || !assignForm.employeeId || !assignForm.salaryStructureId} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700 transition">
              {loading ? 'Assigning...' : 'Assign Structure'}
            </button>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL: Generate Payroll */}
      {/* ═══════════════════════════════════════════ */}
      {showGenerateModal && (
        <Modal title="Generate Payroll" onClose={() => setShowGenerateModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Employee</label>
              <select value={generateForm.employeeId} onChange={e => setGenerateForm(f => ({...f, employeeId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select Employee</option>
                <option value="ALL">⚡ All Active Employees (Bulk)</option>
                {employees.filter(e => e.status === 'active' && e.salaryStructureId).map(e => (
                  <option key={e._id} value={e._id}>{e.name}</option>
                ))}
              </select>
            </div>
            <Input label="Month" type="month" value={generateForm.month} onChange={v => setGenerateForm(f => ({...f, month: v}))} />
            {generateForm.employeeId && generateForm.employeeId !== 'ALL' && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bonus" type="number" value={generateForm.bonus} onChange={v => setGenerateForm(f => ({...f, bonus: v}))} />
                <Input label="Incentives" type="number" value={generateForm.incentives} onChange={v => setGenerateForm(f => ({...f, incentives: v}))} />
              </div>
            )}
            <Input label="Notes" value={generateForm.notes} onChange={v => setGenerateForm(f => ({...f, notes: v}))} placeholder="Optional notes" />
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <FiAlertCircle className="inline mr-1" />
              Attendance deduction is auto-calculated: (Absent × PerDay) + (HalfDay × PerDay × 0.5). Sundays are excluded from working days.
            </div>
            <button onClick={handleGeneratePayroll} disabled={loading || !generateForm.employeeId || !generateForm.month} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-700 transition">
              {loading ? 'Generating...' : 'Generate Payroll'}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── Reusable Components ──

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return (
    <div className={`rounded-xl p-5 border ${colors[color] || colors.indigo}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm"><Icon size={20} /></div>
        <div>
          <p className="text-xs opacity-70">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><FiX size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
      />
    </div>
  );
}
