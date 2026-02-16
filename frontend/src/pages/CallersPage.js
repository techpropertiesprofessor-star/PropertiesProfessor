import React, { useState, useEffect, useContext, useCallback } from "react";
import { useSearchParams } from 'react-router-dom';
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { callerAPI, leadAPI, employeeAPI } from "../api/client";
import CallersList from "../components/CallersList";
import { AuthContext } from "../context/AuthContext";
import useRealtimeData from '../hooks/useRealtimeData';

export default function CallersPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [callers, setCallers] = useState([]);
  const [leads, setLeads] = useState([]); // ✅ ASSIGNED LEADS
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    company: "",
    lastResponse: "",
    notes: "",
    assignedTo: ""
  });
  const [employees, setEmployees] = useState([]);
    useEffect(() => {
      // Fetch employees for assignment dropdown
      const fetchEmployees = async () => {
        try {
          const res = await employeeAPI.getAll();
          setEmployees(Array.isArray(res.data) ? res.data : res.data?.data || []);
        } catch (err) {
          setEmployees([]);
        }
      };
      fetchEmployees();
    }, []);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    loadCallers();
    
    // Check for add parameter in URL and auto-open add form
    if (searchParams.get('add') === 'true') {
      setShowAddModal(true);
      // Clean up URL after opening
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ✅ LOAD ASSIGNED LEADS FOR CALLER
  useEffect(() => {
    if (!user?._id) return;

    leadAPI
      .getAll({ assignedTo: user._id })
      .then((res) => {
        setLeads(res.data?.data || []);
      })
      .catch((err) => {
        console.error("Failed to load assigned leads", err);
      });
  }, [user?._id]);

  const loadCallers = async () => {
    try {
      const res = await callerAPI.getList();
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setCallers(data);
    } catch (err) {
      setCallers([]);
    }
  };

  // Real-time callers updates
  const refreshCallers = useCallback(() => loadCallers(), []);
  useRealtimeData(['lead-created', 'lead-updated', 'lead-remarks-updated', 'caller-created', 'caller-updated', 'caller-deleted'], refreshCallers);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "last_response") {
      setFormData({ ...formData, lastResponse: value });
    } else if (name === "assignedTo") {
      setFormData({ ...formData, assignedTo: value });
    } else if (name === "notes") {
      setFormData({ ...formData, notes: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddOrUpdateCaller = async () => {
    if (!formData.name || !formData.phone) {
      alert("Name and Phone are required");
      return;
    }
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        company: formData.company,
        lastResponse: formData.lastResponse,
        notes: formData.notes,
        assignedTo: formData.assignedTo
      };
      if (editId) {
        await callerAPI.update(editId, payload);
      } else {
        await callerAPI.create(payload);
      }
      setShowAddModal(false);
      setFormData({ name: "", phone: "", company: "", lastResponse: "", notes: "", assignedTo: "" });
      setEditId(null);
      loadCallers();
    } catch (err) {
      alert(editId ? "Failed to update caller" : "Failed to add caller");
    }
  };

  const handleEditClick = (caller) => {
    setFormData({
      name: caller.name || "",
      phone: caller.phone || "",
      company: caller.company || "",
      lastResponse: caller.lastResponse || caller.last_response || "",
    });
    setEditId(caller.id || caller._id);
    setShowAddModal(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>

      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />

        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto">
          {/* PAGE HEADER */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Data Assignment & Calling
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Call assigned leads and record responses
              </p>
            </div>

            {/* Only show Add Caller button for non-EMPLOYEE roles */}
            {user?.role !== 'EMPLOYEE' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow"
              >
                + Add Client
              </button>
            )}
          </div>

          {/* ...existing code... */}

          {/* EXISTING CALLERS LIST */}
          <CallersList />
        </main>
      </div>

      {/* ADD / EDIT CALLER MODAL (UNCHANGED) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">
                {editId ? "Edit Caller" : "Add New Client"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <input
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                maxLength="10"
              />
              <input
                name="company"
                placeholder="Company"
                value={formData.company}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
              <textarea
                name="notes"
                placeholder="Notes"
                value={formData.notes || ''}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                rows={2}
              />
              <select
                name="assignedTo"
                value={formData.assignedTo || ''}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">Assigned To</option>
                {employees.filter(emp => (emp.role === 'EMPLOYEE' || emp.role === 'employee')).map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name || (emp.first_name ? (emp.first_name + ' ' + (emp.last_name || '')) : emp.email || emp.phone)}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditId(null);
                  setFormData({ name: "", phone: "", company: "", lastResponse: "" });
                }}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOrUpdateCaller}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
