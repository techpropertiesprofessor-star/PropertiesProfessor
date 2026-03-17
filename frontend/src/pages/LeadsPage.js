import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { leadAPI, employeeAPI, propertyAPI } from '../api/client';
import { useSocket } from '../context/SocketContext';
import useRealtimeData from '../hooks/useRealtimeData';
import LeadUpload from '../components/LeadUpload';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';

function LeadsPage({ newMessageCount = 0, resetNewMessageCount }) {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper: filter leads for employee
  const filterLeadsForEmployee = (leadsArr, user) => {
    if (user && user.role === 'EMPLOYEE' && user.employeeId) {
      const empId = String(user.employeeId);
      return leadsArr.filter(l => {
        if (!l.assignedTo) return false;
        if (typeof l.assignedTo === 'object' && l.assignedTo._id) {
          return String(l.assignedTo._id) === empId;
        }
        return String(l.assignedTo) === empId;
      });
    }
    return leadsArr;
  };

  // =====================
  // LEADS DOWNLOAD STATE & HANDLERS
  // =====================
  const [downloadStart, setDownloadStart] = useState('');
  const [downloadEnd, setDownloadEnd] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownloadLeads = async () => {
    setDownloadError('');
    if (!downloadStart || !downloadEnd) {
      setDownloadError('Please select both start and end dates.');
      return;
    }
    setDownloadLoading(true);
    try {
      const res = await leadAPI.download({ start: downloadStart, end: downloadEnd });
      // Create a blob and trigger download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_${downloadStart}_to_${downloadEnd}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setDownloadError('Failed to download leads.');
    } finally {
      setDownloadLoading(false);
    }
  };
  const [leads, setLeads] = useState([]);
  const [remarkNoteModal, setRemarkNoteModal] = useState(null); // { leadId, remark }
  const [remarkNoteText, setRemarkNoteText] = useState('');
  const [remarkFilter, setRemarkFilter] = useState('All'); // Filter tabs: All, Interested, Not Interested, Busy, Invalid Number
  const [sourceTab, setSourceTab] = useState('website'); // 'website' | '99acres' | 'housing.com'
  const [employees, setEmployees] = useState([]); // All employees/managers
  const [inventoryUnits, setInventoryUnits] = useState([]); // For property selection in Add Lead
  const [loading, setLoading] = useState(false);  const [showUpload, setShowUpload] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // =====================
  // PAGINATION STATE
  // =====================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const pageLimit = 15;

  // =====================
  // REAL-TIME UPDATES VIA SHARED SOCKET
  // =====================
  const { on, off } = useSocket() || {};

  // Listen for inline remarks updates
  useEffect(() => {
    if (!on || !off) return;
    const handleRemarksUpdate = (data) => {
      setLeads(prevLeads => prevLeads.map(lead =>
        String(lead._id) === String(data.leadId)
          ? { ...lead, remarks: data.remarks, remarkNotes: data.remarkNotes, updatedAt: data.updatedAt }
          : lead
      ));
    };
    on('lead-remarks-updated', handleRemarksUpdate);
    return () => off('lead-remarks-updated', handleRemarksUpdate);
  }, [on, off]);

  // Auto-refresh leads list on lead create/update/assign
  const refreshLeads = useCallback(() => {
    fetchLeads(currentPage);
  }, [currentPage, sourceTab]);
  useRealtimeData(['lead-created', 'lead-updated'], refreshLeads);

  // =====================
  // ADD LEAD STATE & HANDLERS
  // =====================
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', source: '', assignedTo: '', propertyId: '' });

  const handleNewLeadChange = (e) => {
    const { name, value } = e.target;
    setNewLead(prev => ({ ...prev, [name]: value }));
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) return;
    try {
      await leadAPI.create({
        name: newLead.name,
        phone: newLead.phone,
        source: newLead.source,
        assignedTo: newLead.assignedTo || undefined,
        propertyId: newLead.propertyId || undefined
      });
      setShowAddLead(false);
      setNewLead({ name: '', phone: '', source: '', assignedTo: '', propertyId: '' });
      fetchLeads(currentPage);
    } catch (err) {
      alert('Failed to add lead');
    }
  };

  useEffect(() => {
    fetchLeads(currentPage);
    fetchEmployees();
    fetchInventoryUnits();
    // Check if a leadId is set for viewing (from notification click)
    const viewLeadId = localStorage.getItem('viewLeadId');
    if (viewLeadId) {
      viewLead(viewLeadId);
      localStorage.removeItem('viewLeadId');
    }
    
    // Check for add parameter in URL and auto-open add form
    if (searchParams.get('add') === 'true') {
      setShowAddLead(true);
      // Clean up URL after opening
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [currentPage, sourceTab, searchParams, setSearchParams]);

  // =====================
  // FETCH LEADS WITH PAGINATION
  // =====================
  const fetchLeads = async (page = 1) => {
    setLoading(true);
    try {
      const response = await leadAPI.getAll({ page, limit: pageLimit, source: sourceTab });
      
      // Handle new paginated response format
      if (response.data.leads && response.data.pagination) {
        setLeads(response.data.leads);
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalLeads(response.data.pagination.totalLeads);
      } else if (Array.isArray(response.data)) {
        // Fallback for old API format
        const leadsArr = filterLeadsForEmployee(response.data, user);
        setLeads(leadsArr);
        setTotalLeads(leadsArr.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // FETCH EMPLOYEES (for assignment)
  // =====================
  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll();
      // Accept both array and {data: array} responses
      if (Array.isArray(res.data)) {
        setEmployees(res.data);
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        setEmployees(res.data.data);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchInventoryUnits = async () => {
    try {
      const res = await propertyAPI.list();
      const units = Array.isArray(res.data) ? res.data : [];
      setInventoryUnits(units);
    } catch (err) {
      console.error('Failed to fetch inventory units:', err);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchLeads(1);
    setCurrentPage(1);
  };

  const viewLead = async (id) => {
    try {
      const response = await leadAPI.getById(id);
      setSelectedLead(response.data || null);
    } catch (err) {
      console.error('Failed to fetch lead details:', err);
    }
  };

  // =====================
  // UPDATE REMARKS (ONLY FOR EMPLOYEE)
  // =====================
  const handleUpdateRemarks = async (leadId, remarks, note = '') => {
    try {
      const res = await leadAPI.updateRemarks(leadId, remarks, note);
      // Update lead in state immediately with API response
      const updatedLead = res.data;
      setLeads(prevLeads => prevLeads.map(lead =>
        String(lead._id) === String(leadId)
          ? { ...lead, remarks: updatedLead.remarks, remarkNotes: updatedLead.remarkNotes, updatedAt: updatedLead.updatedAt }
          : lead
      ));
    } catch (err) {
      console.error('Failed to update remarks:', err);
      alert('Failed to update remarks');
    }
  };

  // =====================
  // ASSIGN LEAD
  // =====================
  const assignLead = async (leadId, callerId) => {
    try {
      await leadAPI.assign(leadId, callerId);
      fetchLeads(currentPage);
    } catch (err) {
      console.error('Assign lead failed:', err);
      alert('Failed to assign lead');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'text-blue-700 bg-blue-100';
      case 'assigned': return 'text-yellow-700 bg-yellow-100';
      case 'interested': return 'text-green-700 bg-green-100';
      case 'callback': return 'text-purple-700 bg-purple-100';
      case 'closed': return 'text-gray-700 bg-gray-200';
      case 'completed': return 'text-emerald-700 bg-emerald-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
        <main className="flex-1 p-3 sm:p-4 md:p-8 relative overflow-y-auto">
          {/* Modern Card Container */}
          <div className="max-w-7xl mx-auto">
            {/* Modern Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-900 tracking-tight flex items-center gap-2 sm:gap-3">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-white shadow-md text-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-7 w-7">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  Lead Management
                </h1>
                <p className="text-indigo-500 font-medium mt-1 text-base md:text-lg">Track, assign, and manage your leads efficiently.</p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowAddLead(true)}
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-6 py-3 rounded-full shadow-lg font-bold text-lg flex items-center gap-2 transition-transform hover:scale-105"
                  style={{ boxShadow: '0 4px 24px 0 rgba(99,102,241,0.12)' }}
                >
                  <span className="text-2xl">＋</span> Add Lead
                </button>
              </div>
            </div>

            {/* Download Card */}
            <div className="mb-8 bg-white/90 rounded-2xl shadow-xl border border-indigo-100 p-6 max-w-2xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-indigo-700">Start Date</label>
                  <input type="date" value={downloadStart} onChange={e => setDownloadStart(e.target.value)} className="border px-2 py-1 rounded focus:ring-2 focus:ring-indigo-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-indigo-700">End Date</label>
                  <input type="date" value={downloadEnd} onChange={e => setDownloadEnd(e.target.value)} className="border px-2 py-1 rounded focus:ring-2 focus:ring-indigo-200" />
                </div>
                <button
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold px-5 py-2 rounded-full shadow-md mt-4 md:mt-0"
                  onClick={handleDownloadLeads}
                  disabled={downloadLoading}
                >
                  {downloadLoading ? 'Downloading...' : 'Download CSV'}
                </button>
              </div>
              {downloadError && <div className="text-red-600 text-xs mt-2">{downloadError}</div>}
            </div>

            {/* Add Lead Modal */}
            {showAddLead && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-indigo-100 animate-slideDown">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-indigo-800">Add New Lead</h2>
                    <button onClick={() => setShowAddLead(false)} className="text-gray-400 hover:text-indigo-600 text-2xl">×</button>
                  </div>
                  <form onSubmit={handleAddLead} className="space-y-4">
                    <input type="text" name="name" value={newLead.name} onChange={handleNewLeadChange} placeholder="Name" className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-indigo-200" required />
                    <input type="text" name="phone" value={newLead.phone} onChange={handleNewLeadChange} placeholder="Phone" className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-indigo-200" maxLength="10" required />
                    <input type="text" name="source" value={newLead.source} onChange={handleNewLeadChange} placeholder="Source" className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-indigo-200" />
                    <select name="assignedTo" value={newLead.assignedTo} onChange={handleNewLeadChange} className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-indigo-200">
                      <option value="">Assign To</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name || (emp.first_name ? (emp.first_name + ' ' + (emp.last_name || '')) : emp.email || emp.phone)}</option>
                      ))}
                    </select>
                    <select name="propertyId" value={newLead.propertyId} onChange={handleNewLeadChange} className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-indigo-200">
                      <option value="">Link Property (Optional)</option>
                      {inventoryUnits.map(unit => (
                        <option key={unit._id} value={unit._id}>
                          {[unit.project?.name || unit.building_name, unit.tower?.name, unit.unitNumber, unit.bhk ? `${unit.bhk} BHK` : ''].filter(Boolean).join(' - ') || `Unit ${unit._id}`}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setShowAddLead(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded hover:from-indigo-600 hover:to-blue-600">Add Lead</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Pagination Info */}
            <div className="mb-4 text-center">
              <p className="text-indigo-700 font-semibold">
                Showing {leads.length > 0 ? ((currentPage - 1) * pageLimit + 1) : 0} - {Math.min(currentPage * pageLimit, totalLeads)} of {totalLeads} leads
              </p>
            </div>

            {/* Source Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { key: 'website', label: 'Website' },
                { key: '99acres', label: '99acres' },
                { key: 'housing.com', label: 'Housing.com' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setSourceTab(tab.key); setCurrentPage(1); }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                    sourceTab === tab.key
                      ? 'bg-indigo-600 text-white shadow-lg border-indigo-600'
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {tab.label}
                  {sourceTab === tab.key && (
                    <span className="ml-2 text-xs opacity-90">({totalLeads})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Remark Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {['All', 'Interested', 'Not Interested', 'Busy', 'Invalid Number', 'Closed'].map((tab) => {
                const count = tab === 'All'
                  ? leads.filter(l => l.status !== 'closed' && (!l.remarks || l.remarks === '' || !l.assignedTo)).length
                  : tab === 'Closed'
                  ? leads.filter(l => l.status === 'closed').length
                  : leads.filter(l => l.status !== 'closed' && l.remarks === tab).length;
                const isActive = remarkFilter === tab;
                const colorMap = {
                  'All': isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50',
                  'Interested': isActive ? 'bg-green-600 text-white shadow-lg' : 'bg-white text-green-700 border-green-200 hover:bg-green-50',
                  'Not Interested': isActive ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-red-700 border-red-200 hover:bg-red-50',
                  'Busy': isActive ? 'bg-yellow-500 text-white shadow-lg' : 'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50',
                  'Invalid Number': isActive ? 'bg-gray-600 text-white shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                  'Closed': isActive ? 'bg-red-800 text-white shadow-lg' : 'bg-white text-red-800 border-red-200 hover:bg-red-50',
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setRemarkFilter(tab)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 ${colorMap[tab]}`}
                  >
                    {tab} <span className={`ml-1 text-xs font-semibold ${isActive ? 'opacity-90' : 'opacity-60'}`}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Leads Table Card */}
            <div className="bg-white/90 rounded-2xl shadow-xl border border-indigo-100 overflow-x-auto p-0 md:p-6 animate-fadeIn">
              {loading ? (
                <div className="p-12 text-center text-gray-500 text-lg font-semibold">Loading leads...</div>
              ) : leads.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-lg font-semibold">No leads found</div>
              ) : (
                <table className="min-w-full table-auto border-separate border-spacing-y-1 text-base font-medium">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Contact Name</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Source</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Property</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Assign To</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...leads]
                      .filter(l => {
                        if (remarkFilter === 'Closed') {
                          return l.status === 'closed';
                        }
                        if (l.status === 'closed') return false;
                        if (remarkFilter === 'All') {
                          return !l.remarks || l.remarks === '' || !l.assignedTo;
                        }
                        return l.remarks === remarkFilter;
                      })
                      .sort((a, b) => {
                        if (remarkFilter === 'All') {
                          // Fresh/new leads first, then unassigned
                          const aFresh = !a.remarks || a.remarks === '' ? 0 : 1;
                          const bFresh = !b.remarks || b.remarks === '' ? 0 : 1;
                          if (aFresh !== bFresh) return aFresh - bFresh;
                          // Within same group, newer first
                          return new Date(b.createdAt) - new Date(a.createdAt);
                        }
                        return 0;
                    }).map((lead, idx) => (
                      <tr key={lead._id} className={idx % 2 === 0 ? 'bg-white hover:bg-indigo-50 transition' : 'bg-indigo-50 hover:bg-indigo-100 transition'}>
                        <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-gray-900">{lead.name || '-'}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{lead.phone}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap capitalize text-indigo-700">{lead.source}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          {lead.propertyId ? (
                            <a
                              href={`/property/${typeof lead.propertyId === 'object' ? lead.propertyId._id : lead.propertyId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              {lead.propertyName || 'View Property'}
                            </a>
                          ) : lead.propertyUrl ? (
                            <a
                              href={lead.propertyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              {lead.propertyName ? (lead.propertyName.length > 30 ? lead.propertyName.substring(0, 30) + '...' : lead.propertyName) : '99acres Listing'}
                            </a>
                          ) : lead.propertyName ? (
                            <span className="text-orange-700 text-xs font-medium bg-orange-50 px-2 py-0.5 rounded" title={lead.propertyName}>
                              {lead.propertyName.length > 30 ? lead.propertyName.substring(0, 30) + '...' : lead.propertyName}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {lead.message && (
                                <span className="text-amber-600 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded" title={lead.message}>
                                  {lead.message.length > 25 ? lead.message.substring(0, 25) + '...' : lead.message}
                                </span>
                              )}
                              {user && user.role !== 'EMPLOYEE' && (
                                <select
                                  value=""
                                  onChange={async (e) => {
                                    const pid = e.target.value;
                                    if (!pid) return;
                                    try {
                                      await leadAPI.updateProperty(lead._id, pid);
                                      fetchLeads(currentPage);
                                    } catch (err) {
                                      console.error('Failed to link property:', err);
                                      alert('Failed to link property');
                                    }
                                  }}
                                  className="border rounded px-2 py-1 text-xs bg-white shadow-sm focus:ring-2 focus:ring-emerald-200 w-36 text-gray-500"
                                >
                                  <option value="">Link Property</option>
                                  {inventoryUnits.map(unit => (
                                    <option key={unit._id} value={unit._id}>
                                      {[unit.project?.name || unit.building_name, unit.tower?.name, unit.unitNumber].filter(Boolean).join(' - ') || `Unit ${unit._id}`}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {!lead.message && (!user || user.role === 'EMPLOYEE') && (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold ${getStatusColor(lead.status)}`}>{lead.status === 'assigned' ? '🟡' : lead.status === 'interested' ? '🟢' : lead.status === 'callback' ? '🟣' : lead.status === 'closed' ? '⚫' : lead.status === 'completed' ? '✅' : '🔵'} {lead.status}</span>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          {/* Assignment dropdown: Only for non-EMPLOYEE roles */}
                          {user && user.role !== 'EMPLOYEE' ? (
                            <select
                              value={lead.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo._id : lead.assignedTo || ''}
                              onChange={async (e) => {
                                const employeeId = e.target.value;
                                // Guard: Don't proceed if no employee selected
                                if (!employeeId) {
                                  return;
                                }
                                try {
                                  console.log('Assigning lead', lead._id, 'to employee', employeeId);
                                  await leadAPI.assign(lead._id, employeeId);
                                  fetchLeads(currentPage);
                                } catch (err) {
                                  console.error('Failed to assign lead:', err);
                                  alert('Failed to assign lead: ' + (err.response?.data?.message || err.message));
                                }
                              }}
                              className="border rounded px-2 py-1 text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-200"
                              disabled={loading}
                            >
                              <option value="" disabled>
  Unassigned
</option>

                              {employees.map(emp => (
                                <option key={emp._id} value={emp._id}>
                                  {emp.name || (emp.first_name ? (emp.first_name + ' ' + (emp.last_name || '')) : emp.email || emp.phone)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-indigo-700 text-xs font-semibold">
                              {(() => {
                                let assignedEmp = null;
                                if (lead.assignedTo && typeof lead.assignedTo === 'object' && lead.assignedTo._id) {
                                  assignedEmp = employees.find(e => String(e._id) === String(lead.assignedTo._id));
                                } else if (lead.assignedTo) {
                                  assignedEmp = employees.find(e => String(e._id) === String(lead.assignedTo));
                                }
                                return assignedEmp
                                  ? (assignedEmp.name || (assignedEmp.first_name ? (assignedEmp.first_name + ' ' + (assignedEmp.last_name || '')) : assignedEmp.email || assignedEmp.phone))
                                  : 'Assigned';
                              })()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          {/* MANAGER can always add remarks, EMPLOYEE only if lead is assigned to them */}
                          {(user && (user.role === 'MANAGER' || (user.role === 'EMPLOYEE' && user.employeeId && (
                            (lead.assignedTo && typeof lead.assignedTo === 'object' && String(lead.assignedTo._id) === String(user.employeeId)) ||
                            (lead.assignedTo && typeof lead.assignedTo === 'string' && String(lead.assignedTo) === String(user.employeeId))
                          )))) ? (
                            <select
                              className={`border rounded px-2 py-1 text-xs w-36 focus:ring-2 focus:ring-indigo-200 cursor-pointer font-medium ${
                                lead.remarks === 'Interested' ? 'bg-green-50 text-green-700 border-green-300' :
                                lead.remarks === 'Not Interested' ? 'bg-red-50 text-red-700 border-red-300' :
                                lead.remarks === 'Busy' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                lead.remarks === 'Invalid Number' ? 'bg-gray-100 text-gray-700 border-gray-400' :
                                'bg-gray-50 text-gray-600 border-gray-300'
                              }`}
                              value={lead.remarks || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  setRemarkNoteModal({ leadId: lead._id, remark: val });
                                  setRemarkNoteText('');
                                }
                              }}
                            >
                              <option value="">Select Remark</option>
                              <option value="Interested">Interested</option>
                              <option value="Not Interested">Not Interested</option>
                              <option value="Busy">Busy</option>
                              <option value="Invalid Number">Invalid Number</option>
                            </select>
                          ) : (
                            <span className={`text-sm font-medium px-2 py-1 rounded ${
                              lead.remarks === 'Interested' ? 'bg-green-100 text-green-700' :
                              lead.remarks === 'Not Interested' ? 'bg-red-100 text-red-700' :
                              lead.remarks === 'Busy' ? 'bg-yellow-100 text-yellow-700' :
                              lead.remarks === 'Invalid Number' ? 'bg-gray-200 text-gray-700' :
                              'text-gray-700'
                            }`}>{lead.remarks || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap flex gap-2">
                          <button
                            onClick={async () => {
                              if (!lead.hasOwnProperty('assignedTo')) {
                                setSelectedLead(lead);
                              } else {
                                try {
                                  const response = await leadAPI.getById(lead._id);
                                  setSelectedLead(response.data || null);
                                } catch (err) {
                                  alert('Failed to fetch lead details');
                                }
                              }
                            }}
                            className="font-semibold px-4 py-1 rounded-lg transition-colors bg-gradient-to-r from-indigo-100 to-pink-100 text-indigo-700 border border-indigo-200 shadow-sm hover:bg-indigo-200 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            View
                          </button>
                          {lead.status !== 'closed' && (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Are you sure you want to close this lead?')) return;
                                try {
                                  await leadAPI.update(lead._id, { status: 'closed' });
                                  fetchLeads(currentPage);
                                } catch (err) {
                                  alert('Failed to close lead');
                                }
                              }}
                              className="font-semibold px-3 py-1 rounded-lg transition-colors bg-red-50 text-red-600 border border-red-200 shadow-sm hover:bg-red-100 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300 text-xs"
                            >
                              Close
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                <button
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    currentPage === 1
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600'
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg font-semibold ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white'
                              : 'bg-white text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    currentPage === totalPages
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Lead Details Modal */}
            {selectedLead && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-xl w-full border border-indigo-100 animate-slideDown max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center px-8 pt-8 pb-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-2xl flex-shrink-0">
                    <h2 className="text-2xl font-bold text-indigo-800 tracking-tight flex items-center gap-2">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7 text-indigo-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' /></svg>
                      Lead Details
                    </h2>
                    <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-indigo-600 text-2xl font-bold">×</button>
                  </div>
                  <div className="px-8 py-6 bg-white rounded-b-2xl overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4">
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Contact Name</span><div className="text-lg font-bold text-gray-900">{selectedLead.name}</div></div>
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Phone</span><div className="text-base text-gray-800">{selectedLead.phone}</div></div>
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Email</span><div className="text-base text-gray-800">{selectedLead.email || '-'}</div></div>
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Source</span><div className="text-base text-gray-800">{selectedLead.source}</div></div>
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Date Created</span><div className="text-base text-gray-800">{selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString() : '-'}</div></div>
                      {selectedLead.source === 'schedule_visit' && selectedLead.visitTime && (
                        <div className="md:col-span-2"><span className="text-gray-500 text-xs font-semibold uppercase">Visiting Time</span><div className="text-base text-gray-800">{new Date(selectedLead.visitTime).toLocaleString()}</div></div>
                      )}
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Status</span><div className="text-base text-gray-800">{selectedLead.status}</div></div>
                      <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase">Assigned To</span>
                        <div className="text-base text-gray-800">
                          {selectedLead.assignedTo
                            ? (typeof selectedLead.assignedTo === 'object'
                                ? selectedLead.assignedTo.name || selectedLead.assignedTo.email || 'Assigned'
                                : (() => {
                                    const emp = employees.find(e => String(e._id) === String(selectedLead.assignedTo));
                                    return emp ? (emp.name || emp.email) : 'Assigned';
                                  })()
                              )
                            : 'Unassigned'}
                        </div>
                      </div>
                      {selectedLead.propertyId && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500 text-xs font-semibold uppercase">Linked Property</span>
                          <div className="mt-1">
                            <a
                              href={`/property/${typeof selectedLead.propertyId === 'object' ? selectedLead.propertyId._id : selectedLead.propertyId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              {selectedLead.propertyName || 'View Property'}
                            </a>
                          </div>
                        </div>
                      )}
                      {!selectedLead.propertyId && selectedLead.propertyName && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500 text-xs font-semibold uppercase">Property Details (99acres)</span>
                          <div className="text-base text-gray-800 bg-orange-50 rounded-lg px-4 py-2 mt-1 border border-orange-200">{selectedLead.propertyName}</div>
                        </div>
                      )}
                      {!selectedLead.propertyId && selectedLead.propertyUrl && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500 text-xs font-semibold uppercase">99acres Property Link</span>
                          <div className="mt-1">
                            <a
                              href={selectedLead.propertyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              View on 99acres
                            </a>
                          </div>
                        </div>
                      )}
                      {selectedLead.message && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500 text-xs font-semibold uppercase">Property / Inquiry</span>
                          <div className="text-base text-gray-800 bg-indigo-50 rounded-lg px-4 py-2 mt-1">{selectedLead.message}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase">Current Remark</span>
                        <div className={`text-base font-semibold mt-0.5 ${
                          selectedLead.remarks === 'Interested' ? 'text-green-700' :
                          selectedLead.remarks === 'Not Interested' ? 'text-red-700' :
                          selectedLead.remarks === 'Busy' ? 'text-yellow-700' :
                          selectedLead.remarks === 'Invalid Number' ? 'text-gray-600' :
                          'text-gray-800'
                        }`}>{selectedLead.remarks || '-'}</div>
                      </div>
                    </div>

                    {/* Remark Notes History */}
                    {selectedLead.remarkNotes && selectedLead.remarkNotes.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Remark Notes
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {[...selectedLead.remarkNotes].reverse().map((rn, idx) => (
                            <div key={idx} className={`rounded-lg px-3 py-2 border text-sm ${
                              rn.remark === 'Interested' ? 'bg-green-50 border-green-200' :
                              rn.remark === 'Not Interested' ? 'bg-red-50 border-red-200' :
                              rn.remark === 'Busy' ? 'bg-yellow-50 border-yellow-200' :
                              rn.remark === 'Invalid Number' ? 'bg-gray-50 border-gray-300' :
                              'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                                  rn.remark === 'Interested' ? 'bg-green-200 text-green-800' :
                                  rn.remark === 'Not Interested' ? 'bg-red-200 text-red-800' :
                                  rn.remark === 'Busy' ? 'bg-yellow-200 text-yellow-800' :
                                  rn.remark === 'Invalid Number' ? 'bg-gray-300 text-gray-800' :
                                  'bg-gray-200 text-gray-800'
                                }`}>{rn.remark}</span>
                                <span className="text-gray-400 text-xs">{rn.createdAt ? new Date(rn.createdAt).toLocaleString() : ''}</span>
                              </div>
                              {rn.note && <p className="text-gray-700 text-sm mt-1">{rn.note}</p>}
                              {rn.addedByName && <p className="text-gray-400 text-xs mt-1">— {rn.addedByName}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Remark Note Popup Modal */}
            {remarkNoteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-indigo-100 animate-slideDown">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Add Note</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Remark: <span className={`font-semibold ${
                      remarkNoteModal.remark === 'Interested' ? 'text-green-600' :
                      remarkNoteModal.remark === 'Not Interested' ? 'text-red-600' :
                      remarkNoteModal.remark === 'Busy' ? 'text-yellow-600' :
                      remarkNoteModal.remark === 'Invalid Number' ? 'text-gray-600' :
                      'text-gray-600'
                    }`}>{remarkNoteModal.remark}</span>
                  </p>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-none"
                    rows={3}
                    placeholder="Write a note (optional)..."
                    value={remarkNoteText}
                    onChange={(e) => setRemarkNoteText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-4 justify-end">
                    <button
                      onClick={() => { setRemarkNoteModal(null); setRemarkNoteText(''); }}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateRemarks(remarkNoteModal.leadId, remarkNoteModal.remark, remarkNoteText);
                        setRemarkNoteModal(null);
                        setRemarkNoteText('');
                      }}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg hover:from-indigo-600 hover:to-blue-600 font-medium shadow"
                    >
                      Save Remark
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default LeadsPage;
