import React, { useState, useEffect, useContext } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { AuthContext } from "../context/AuthContext";

// For demo: use localStorage. Replace with API for production.
const NOTES_KEY = "user_notes";

function getUserNotes(userId) {
  const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}") || {};
  return allNotes[userId] || [];
}

function saveUserNotes(userId, notes) {
  const allNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}") || {};
  allNotes[userId] = notes;
  localStorage.setItem(NOTES_KEY, JSON.stringify(allNotes));
}

export default function NotesPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    reminder: ""
  });

  // Load notes from localStorage whenever user or page is visited
  const loadNotes = React.useCallback(() => {
    if (user?._id) {
      setNotes(getUserNotes(user._id));
    }
  }, [user?._id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Reminder alert
  useEffect(() => {
    const interval = setInterval(() => {
      notes.forEach((note) => {
        if (note.reminder && !note.reminded) {
          const now = new Date();
          const remindAt = new Date(note.reminder);
          if (now >= remindAt) {
            alert(`Reminder: ${note.title}\n${note.content}`);
            note.reminded = true;
            saveUserNotes(user._id, [...notes]);
            setNotes([...notes]);
          }
        }
      });
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, [notes, user?._id]);

  const openModal = (idx = null) => {
    setEditIdx(idx);
    if (idx !== null) {
      setForm({ ...notes[idx] });
    } else {
      setForm({ title: "", content: "", reminder: "" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditIdx(null);
    setForm({ title: "", content: "", reminder: "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!form.title.trim()) return alert("Title required");
    let updated = [...notes];
    if (editIdx !== null) {
      updated[editIdx] = { ...form, created: updated[editIdx].created, reminded: false };
    } else {
      updated.unshift({ ...form, created: new Date().toISOString(), reminded: false });
    }
    saveUserNotes(user._id, updated);
    setNotes([...updated]); // Force fresh state with new array reference
    closeModal();
  };

  const handleDelete = (idx) => {
    if (!window.confirm("Delete this note?")) return;
    const updated = notes.filter((_, i) => i !== idx);
    setNotes(updated);
    saveUserNotes(user._id, updated);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">My Personal Notes</h1>
              <p className="text-gray-600">Your private diary and reminders</p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow"
            >
              + New Note
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.length === 0 && (
              <div className="col-span-full text-center text-gray-400">No notes yet.</div>
            )}
            {notes.map((note, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-5 flex flex-col relative border-l-4 border-blue-400">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold text-blue-800">{note.title}</h2>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(idx)} className="text-blue-500 hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(idx)} className="text-red-500 hover:underline text-sm">Delete</button>
                  </div>
                </div>
                <div className="text-gray-700 mb-2 whitespace-pre-line">{note.content}</div>
                <div className="text-xs text-gray-400 mb-1">Created: {new Date(note.created).toLocaleString()}</div>
                {note.reminder && (
                  <div className="text-xs text-blue-600">Reminder: {new Date(note.reminder).toLocaleString()}</div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">{editIdx !== null ? "Edit Note" : "Add New Note"}</h3>
            </div>
            <div className="p-6 space-y-4">
              <input
                name="title"
                placeholder="Title"
                value={form.title}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
              <textarea
                name="content"
                placeholder="Write your note..."
                value={form.content}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                rows={4}
              />
              <label className="block text-sm text-gray-600">Reminder (optional)</label>
              <input
                name="reminder"
                type="datetime-local"
                value={form.reminder}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
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
