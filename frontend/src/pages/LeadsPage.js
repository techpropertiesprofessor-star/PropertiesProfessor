import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { leadAPI, employeeAPI } from '../api/client';
import io from 'socket.io-client';
import LeadUpload from '../components/LeadUpload';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

function LeadsPage({ newMessageCount = 0, resetNewMessageCount }) {
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
  const [remarkInputs, setRemarkInputs] = useState({});
  const [employees, setEmployees] = useState([]); // All employees/managers
  const [loading, setLoading] = useState(false);  const [showUpload, setShowUpload] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // =====================
  // PAGINATION STATE
  // =====================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const pageLimit = 20;

  // =====================
  // SOCKET.IO FOR REAL-TIME UPDATES
  // =====================
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    setSocket(newSocket);
    
    // Listen for real-time remarks updates
    newSocket.on('lead-remarks-updated', (data) => {
      console.log('📝 Received remarks update:', data);
      setLeads(prevLeads => {
        const updated = prevLeads.map(lead => {
          if (String(lead._id) === String(data.leadId)) {
            console.log('✅ Updating lead in UI:', lead._id);
            return { ...lead, remarks: data.remarks, updatedAt: data.updatedAt };
          }
          return lead;
        });
        return updated;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // =====================
  // ADD LEAD STATE & HANDLERS
  // =====================
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '', source: '', assignedTo: '' });

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
        assignedTo: newLead.assignedTo || undefined
      });
      setShowAddLead(false);
      setNewLead({ name: '', phone: '', source: '', assignedTo: '' });
      fetchLeads(currentPage);
    } catch (err) {
      alert('Failed to add lead');
    }
  };

  useEffect(() => {
    fetchLeads(currentPage);
    fetchEmployees();
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
  }, [currentPage, searchParams, setSearchParams]);

  // =====================
  // FETCH LEADS WITH PAGINATION
  // =====================
  const fetchLeads = async (page = 1) => {
    setLoading(true);
    try {
      const response = await leadAPI.getAll({ page, limit: pageLimit });
      
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
  const handleUpdateRemarks = async (leadId, remarks) => {
    try {
      await leadAPI.updateRemarks(leadId, remarks);
      // Real-time update will be handled by Socket.IO event
      // Clear the input field
      setRemarkInputs(prev => ({ ...prev, [leadId]: '' }));
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
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <div className="hidden md:block"><Sidebar /></div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
        <main className="flex-1 p-4 md:p-8 relative overflow-y-auto">
          {/* Modern Card Container */}
          <div className="max-w-7xl mx-auto">
            {/* Modern Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-900 tracking-tight flex items-center gap-3">
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
                      <div className="flex flex-col sm:flex-row gap-2 justify-end">
                        <button type="button" onClick={() => setShowAddLead(false)} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded hover:from-indigo-600 hover:to-blue-600">Add Lead</button>
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
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Assign To</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-700 uppercase text-left tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead, idx) => (
                      <tr key={lead._id} className={idx % 2 === 0 ? 'bg-white hover:bg-indigo-50 transition' : 'bg-indigo-50 hover:bg-indigo-100 transition'}>
                        <td className="px-4 py-3 align-middle whitespace-nowrap font-semibold text-gray-900">{lead.name || '-'}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">{lead.phone}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap capitalize text-indigo-700">{lead.source}</td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full font-bold ${getStatusColor(lead.status)}`}>{lead.status === 'assigned' ? '🟡' : lead.status === 'interested' ? '🟢' : lead.status === 'callback' ? '🟣' : lead.status === 'closed' ? '⚫' : '🔵'} {lead.status}</span>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          {/* Assignment dropdown: Only for non-EMPLOYEE roles */}
                          {user && user.role !== 'EMPLOYEE' ? (
                            <select
                              value={lead.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo._id : lead.assignedTo || ''}
                              onChange={async (e) => {
                                const employeeId = e.target.value;
                                if (lead.createdBy === 'website' && lead.assignedTo === null) {
                                  try {
                                    const allLeadsRes = await leadAPI.getAll();
                                    let allLeads = Array.isArray(allLeadsRes.data) ? allLeadsRes.data : (allLeadsRes.data?.leads || []);
                                    const duplicate = allLeads.find(l => l.phone === lead.phone && l.createdBy !== 'website');
                                    const already = allLeads.find(l => l.phone === lead.phone && l.source === lead.source && l.createdBy !== 'website');
                                    if (already) {
                                      await leadAPI.assign(already._id, employeeId);
                                    } else if (duplicate) {
                                      await leadAPI.assign(duplicate._id, employeeId);
                                    } else {
                                      const allowedSources = ['contact_form','schedule_visit','whatsapp','chatbot','manual','Friend'];
                                      let validSource = allowedSources.includes(lead.source) ? lead.source : 'contact_form';
                                      const newLeadRes = await leadAPI.create({
                                        name: lead.name,
                                        phone: lead.phone,
                                        email: lead.email,
                                        source: validSource,
                                        remarks: lead.remarks,
                                        assignedTo: employeeId,
                                        status: 'assigned',
                                        createdBy: 'dashboard'
                                      });
                                      await leadAPI.assign(newLeadRes.data._id, employeeId);
                                    }
                                    fetchLeads(currentPage);
                                  } catch (err) {
                                    alert('Failed to convert and assign lead');
                                  }
                                  return;
                                }
                                try {
                                  await leadAPI.assign(lead._id, employeeId);
                                  fetchLeads(currentPage);
                                } catch (err) {
                                  alert('Failed to assign lead');
                                }
                              }}
                              className="border rounded px-2 py-1 text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-200"
                              disabled={loading}
                            >
                              <option value="">Unassigned</option>
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
                          {/* Only EMPLOYEE can add/edit remarks */}
                          {(user && user.role === 'EMPLOYEE') ? (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const remarksValue = remarkInputs[lead._id] !== undefined 
                                  ? remarkInputs[lead._id] 
                                  : lead.remarks || '';
                                handleUpdateRemarks(lead._id, remarksValue);
                              }}
                              className="flex gap-1"
            >                              <input
                                type="text"
                                className="border rounded px-2 py-1 text-xs w-40 focus:ring-2 focus:ring-indigo-200"
                                placeholder="Add remarks..."
                                value={remarkInputs[lead._id] !== undefined ? remarkInputs[lead._id] : lead.remarks || ''}
                                onChange={e => setRemarkInputs(inputs => ({ ...inputs, [lead._id]: e.target.value }))}
                              />
                              <button 
                                type="submit" 
                                className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded text-xs hover:from-indigo-600 hover:to-blue-600"
                              >
                                Save
                              </button>
                            </form>
                          ) : (
                            <span className="text-gray-700 text-sm">{lead.remarks || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
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
                <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-xl w-full border border-indigo-100 animate-slideDown">
                  <div className="flex justify-between items-center px-8 pt-8 pb-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-indigo-800 tracking-tight flex items-center gap-2">
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7 text-indigo-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' /></svg>
                      Lead Details
                    </h2>
                    <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-indigo-600 text-2xl font-bold">×</button>
                  </div>
                  <div className="px-8 py-6 bg-white rounded-b-2xl">
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
                      <div><span className="text-gray-500 text-xs font-semibold uppercase">Remarks</span><div className="text-base text-gray-800">{selectedLead.remarks || '-'}</div></div>
                    </div>
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
