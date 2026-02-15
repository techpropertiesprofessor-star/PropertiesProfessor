import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { taskAPI, employeeAPI } from '../api/client';

export default function TaskDetailsPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignedToName, setAssignedToName] = useState('');

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await taskAPI.getById(id);
        setTask(res.data);
        // Fetch assigned to name if possible
        const assignedId = res.data.assignedTo || res.data.assignee || res.data.assigned_to;
        if (assignedId) {
          try {
            const empRes = await employeeAPI.getById(assignedId);
            const emp = empRes.data;
            setAssignedToName(emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name || emp.email || assignedId);
          } catch {
            setAssignedToName(assignedId);
          }
        } else {
          setAssignedToName('-');
        }
      } catch (err) {
        setError('Task not found or failed to load.');
      } finally {
        setLoading(false);
      }
    }
    fetchTask();
  }, [id]);

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return !isNaN(d) ? d.toLocaleDateString() : '-';
  }

  if (loading) return <div className="flex h-screen"><div className="hidden md:block"><Sidebar /></div><div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}><Header /><main className="flex-1 flex items-center justify-center overflow-y-auto">Loading...</main></div></div>;
  if (error) return <div className="flex h-screen"><div className="hidden md:block"><Sidebar /></div><div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}><Header /><main className="flex-1 flex items-center justify-center text-red-600 overflow-y-auto">{error}</main></div></div>;
  if (!task) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">
          <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline">&larr; Back</button>
          <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
            <p className="text-gray-700 mb-4">{task.description}</p>
            <div className="mb-2"><span className="font-semibold">Priority:</span> {task.priority}</div>
            <div className="mb-2"><span className="font-semibold">Status:</span> {task.status}</div>
            <div className="mb-2"><span className="font-semibold">Due Date:</span> {formatDate(task.due_date || task.dueDate)}</div>
            <div className="mb-2"><span className="font-semibold">Assigned To:</span> {assignedToName}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
