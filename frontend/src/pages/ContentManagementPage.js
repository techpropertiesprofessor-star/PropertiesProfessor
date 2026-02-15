import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { AuthContext } from '../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2, FiUserPlus, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';

export default function ContentManagementPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const { canViewContent, canCreateContent, loading: permissionsLoading } = usePermissions();
  const [content, setContent] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newContent, setNewContent] = useState({ title: '', description: '', content_type: 'blog' });
  const [selectedContent, setSelectedContent] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEditor, setSelectedEditor] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  
  // API Base URL
  const apiBase = process.env.REACT_APP_API_URL || '/api';

  useEffect(() => {
    loadContent();
    loadEmployees();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/content`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setContent(await response.json());
      }
    } catch (err) {
      showError('Failed to load content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch(`${apiBase}/employees`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        setEmployees(await response.json());
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const handleCreateContent = async (e) => {
    e.preventDefault();
    if (!canCreateContent) {
      showError('You do not have permission to create content');
      return;
    }
    if (!newContent.title || !newContent.content_type || !createDueDate) {
      showError('Title, content type, and due date are required');
      return;
    }

    try {
      setLoading(true);
      // 1. Create content
      const response = await fetch(`${apiBase}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newContent)
      });

      if (response.ok) {
        const created = await response.json();
        // 2. Mark content on calendar
        const calRes = await fetch(`${apiBase}/content-calendar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            content_id: created.id || created._id,
            marked_date: createDueDate,
            note: ''
          })
        });
        if (calRes.ok) {
          showSuccess('✅ Content created and added to calendar');
        } else {
          showError('Content created, but failed to add to calendar');
        }
        setNewContent({ title: '', description: '', content_type: 'blog' });
        setCreateDueDate('');
        setShowCreateForm(false);
        loadContent();
      } else {
        showError('Failed to create content');
      }
    } catch (err) {
      showError('Failed to create content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToEditor = async (e) => {
    e.preventDefault();
    if (!canCreateContent) {
      showError('You do not have permission to assign content');
      return;
    }
    if (!selectedEditor || !assignmentDueDate) {
      showError('Editor and due date are required');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/content-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content_id: selectedContent.id,
          editor_id: parseInt(selectedEditor),
          due_date: assignmentDueDate
        })
      });

      if (response.ok) {
        showSuccess('✅ Content assigned successfully');
        setShowAssignModal(false);
        setSelectedEditor('');
        setAssignmentDueDate('');
        loadContent();
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to assign content');
      }
    } catch (err) {
      showError('Failed to assign content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/content/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        showSuccess('✅ Content deleted');
        loadContent();
      } else {
        showError('Failed to delete content');
      }
    } catch (err) {
      showError('Failed to delete content');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (contentId, newStatus) => {
    if (!contentId) {
      showError('Invalid content ID. Cannot update status.');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/content/${contentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showSuccess('✅ Content status updated');
        loadContent();
      } else {
        showError('Failed to update status');
      }
    } catch (err) {
      showError('Failed to update status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'blog': return 'bg-blue-50 border-blue-200';
      case 'video': return 'bg-purple-50 border-purple-200';
      case 'social_media': return 'bg-pink-50 border-pink-200';
      case 'email': return 'bg-green-50 border-green-200';
      case 'document': return 'bg-orange-50 border-orange-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="text-gray-600 text-sm">Loading permissions...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!canViewContent) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to view content management.</p>
              <p className="text-sm mt-3 text-red-600">Contact an administrator if you need access.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="hidden md:block"><Sidebar /></div>
      
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        
        <main className="flex-1 overflow-auto">
          {/* Messages */}
          {successMsg && (
            <div className="fixed top-20 right-4 p-3 bg-green-50 border border-green-300 rounded text-green-800 text-xs z-50 animate-pulse">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="fixed top-20 right-4 p-3 bg-red-50 border border-red-300 rounded text-red-800 text-xs z-50 animate-pulse">
              {errorMsg}
            </div>
          )}

          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">📚 Content Management</h1>
                <p className="text-xs text-gray-600 mt-1">Total: {content.length} items</p>
              </div>
              {canCreateContent && (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="px-4 py-2 text-xs md:text-sm bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <FiPlus size={18} /> New Content
                </button>
              )}
            </div>

            {/* Create Form */}
            {showCreateForm && canCreateContent && (
              <div className="bg-white rounded-lg p-4 mb-6 border border-indigo-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Create New Content</h3>
                <form onSubmit={handleCreateContent} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newContent.title}
                      onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                      placeholder="Content title..."
                      className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <select
                      value={newContent.content_type}
                      onChange={(e) => setNewContent({ ...newContent, content_type: e.target.value })}
                      className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="blog">Blog Post</option>
                      <option value="video">Video</option>
                      <option value="social_media">Social Media</option>
                      <option value="email">Email Campaign</option>
                      <option value="document">Document</option>
                    </select>
                    <input
                      type="date"
                      value={createDueDate}
                      onChange={e => setCreateDueDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <textarea
                    value={newContent.description}
                    onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                    placeholder="Description..."
                    rows="3"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-semibold transition"
                    >
                      {loading ? '⏳' : '✓'} Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Content Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading && content.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                  Loading content...
                </div>
              ) : content.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                  No content yet. Create one to get started!
                </div>
              ) : (
                content.map((item) => (
                  <div key={item.id} className={`border-2 rounded-lg p-4 ${getTypeColor(item.content_type)}`}>
                    {/* Content Type Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-white rounded border">
                        {(item.content_type || '').replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getStatusColor(item.status)}`}>
                        {(item.status || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">{item.title}</h3>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                    )}

                    {/* Dates */}
                    <div className="text-xs text-gray-500 mb-3 space-y-0.5">
                      <p>📅 Created: {format(new Date(item.created_at), 'MMM dd, yyyy')}</p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      {/* Status Update Buttons */}
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => handleUpdateStatus(item._id, item.status === 'draft' ? 'pending_review' : 'draft')}
                          className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 font-semibold transition"
                        >
                          {item.status === 'draft' ? '📋' : '✏️'} Review
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item._id, 'approved')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-semibold transition"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item._id, 'published')}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold transition"
                        >
                          🚀 Publish
                        </button>
                      </div>

                      {/* Assign & Delete */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedContent(item);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-semibold transition flex items-center justify-center gap-1"
                        >
                          <FiUserPlus size={16} /> Assign
                        </button>
                        <button
                          onClick={() => handleDeleteContent(item.id)}
                          className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 font-semibold transition flex items-center justify-center gap-1"
                        >
                          <FiTrash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Assign "{selectedContent.title}" to Editor
            </h3>

            <form onSubmit={handleAssignToEditor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Select Editor *</label>
                <select
                  value={selectedEditor}
                  onChange={(e) => setSelectedEditor(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose an editor --</option>
                  {employees
                    .filter(e => e.role === 'EMPLOYEE')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Due Date *</label>
                <input
                  type="date"
                  value={assignmentDueDate}
                  onChange={(e) => setAssignmentDueDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedEditor('');
                    setAssignmentDueDate('');
                  }}
                  className="px-4 py-2 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-semibold transition"
                >
                  {loading ? '⏳' : '✓'} Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
