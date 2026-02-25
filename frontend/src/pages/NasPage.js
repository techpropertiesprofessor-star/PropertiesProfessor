import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { nasAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed';
import {
  FiFolder, FiFolderPlus, FiUpload, FiTrash2, FiEdit2, FiX, FiArrowLeft,
  FiImage, FiVideo, FiFile, FiDownload, FiPlay, FiCalendar, FiUser,
  FiMaximize, FiGrid, FiList, FiSearch, FiHardDrive, FiPlus
} from 'react-icons/fi';

export default function NasPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);

  // ─── State ──────────────────────────────────────────────
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Create folder modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit folder
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Video modal
  const [videoModalSrc, setVideoModalSrc] = useState(null);
  const [videoModalName, setVideoModalName] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Fetch folders ──────────────────────────────────────
  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await nasAPI.listFolders();
      setFolders(res.data || []);
    } catch (err) {
      console.error('Failed to fetch NAS folders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  // ─── Open folder ────────────────────────────────────────
  const openFolder = async (folder) => {
    setSelectedFolder(folder);
    setLoadingFiles(true);
    try {
      const res = await nasAPI.getFolder(folder._id);
      setFolderFiles(res.data?.files || []);
    } catch (err) {
      console.error('Failed to load folder:', err);
      setFolderFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // ─── Create folder ──────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    try {
      await nasAPI.createFolder({ name: newFolderName.trim(), description: newFolderDesc.trim() });
      setNewFolderName('');
      setNewFolderDesc('');
      setShowCreateModal(false);
      fetchFolders();
    } catch (err) {
      console.error('Failed to create folder:', err);
      alert('Failed to create folder: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreating(false);
    }
  };

  // ─── Edit folder ────────────────────────────────────────
  const handleEditFolder = async (folderId) => {
    try {
      await nasAPI.updateFolder(folderId, { name: editName.trim(), description: editDesc.trim() });
      setEditingFolder(null);
      fetchFolders();
      if (selectedFolder?._id === folderId) {
        setSelectedFolder(prev => ({ ...prev, name: editName.trim(), description: editDesc.trim() }));
      }
    } catch (err) {
      console.error('Failed to update folder:', err);
    }
  };

  // ─── Delete folder ──────────────────────────────────────
  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Are you sure? This will delete the folder and ALL files inside it.')) return;
    try {
      await nasAPI.deleteFolder(folderId);
      if (selectedFolder?._id === folderId) {
        setSelectedFolder(null);
        setFolderFiles([]);
      }
      fetchFolders();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  // ─── Upload files ───────────────────────────────────────
  const handleUpload = async (files) => {
    if (!selectedFolder || !files.length) return;
    setUploading(true);
    setUploadProgress(`Uploading ${files.length} file(s)...`);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('files', f));
      const res = await nasAPI.uploadFiles(selectedFolder._id, formData);
      setUploadProgress(`✓ Uploaded ${res.data?.uploaded?.length || 0} file(s)`);
      // Refresh folder contents
      openFolder(selectedFolder);
      fetchFolders(); // update counts
      setTimeout(() => setUploadProgress(''), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadProgress('✗ Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete file ────────────────────────────────────────
  const handleDeleteFile = async (fileKey) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await nasAPI.deleteFile(selectedFolder._id, fileKey);
      setFolderFiles(prev => prev.filter(f => f.key !== fileKey));
      fetchFolders(); // update counts
    } catch (err) {
      console.error('Delete file failed:', err);
    }
  };

  // ─── Download file ──────────────────────────────────────
  const handleDownload = async (file) => {
    try {
      const url = file.downloadUrl;
      if (!url) return;
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.originalName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // ─── Helpers ────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getFileIcon = (type) => {
    if (type === 'image') return <FiImage className="text-blue-500" />;
    if (type === 'video') return <FiVideo className="text-red-500" />;
    return <FiFile className="text-gray-500" />;
  };

  const filteredFolders = folders.filter(f =>
    !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = folderFiles.filter(f =>
    !searchQuery || (f.originalName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        <main className="p-4 sm:p-6 overflow-y-auto h-full">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-3">
              {selectedFolder && (
                <button
                  onClick={() => { setSelectedFolder(null); setFolderFiles([]); setSearchQuery(''); }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="text-xl" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FiHardDrive className="text-indigo-600" />
                  {selectedFolder ? selectedFolder.name : 'NAS Storage'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selectedFolder
                    ? `${filteredFiles.length} file(s) • Created by ${selectedFolder.createdByName} on ${formatDate(selectedFolder.createdAt)}`
                    : `${folders.length} folder(s) • Shared media storage`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder={selectedFolder ? 'Search files...' : 'Search folders...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48"
                />
              </div>
              {/* View mode toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  <FiGrid className="text-sm" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  <FiList className="text-sm" />
                </button>
              </div>
              {/* Actions */}
              {!selectedFolder ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <FiFolderPlus className="text-base" /> New Folder
                </button>
              ) : (
                <label className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                  <FiUpload className="text-base" /> {uploading ? 'Uploading...' : 'Upload Files'}
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ''; }}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${uploadProgress.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : uploadProgress.startsWith('✗') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              {uploadProgress}
            </div>
          )}

          {/* ─── FOLDER LIST VIEW ──────────────────────────── */}
          {!selectedFolder && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <FiFolder className="mx-auto text-5xl mb-3" />
                  <p className="text-lg font-medium">No folders yet</p>
                  <p className="text-sm mt-1">Create a folder to start uploading media</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                  >
                    <FiPlus /> Create First Folder
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredFolders.map(folder => (
                    <div
                      key={folder._id}
                      className="group relative bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all cursor-pointer p-4"
                      onClick={() => openFolder(folder)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-50 rounded-2xl flex items-center justify-center mb-3">
                          <FiFolder className="text-3xl text-indigo-500" />
                        </div>
                        <h3 className="font-semibold text-sm text-gray-800 truncate w-full">{folder.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {folder.fileCount || 0} files
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                          {folder.imageCount > 0 && <span className="flex items-center gap-0.5"><FiImage className="text-blue-400" />{folder.imageCount}</span>}
                          {folder.videoCount > 0 && <span className="flex items-center gap-0.5"><FiVideo className="text-red-400" />{folder.videoCount}</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 truncate w-full">
                          <FiUser className="inline mr-0.5" />{folder.createdByName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          <FiCalendar className="inline mr-0.5" />{formatDate(folder.createdAt)}
                        </p>
                      </div>
                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingFolder(folder._id); setEditName(folder.name); setEditDesc(folder.description || ''); }}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="text-xs text-blue-500" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder._id); }}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="text-xs text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List view for folders */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Folder Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Files</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Created By</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFolders.map(folder => (
                        <tr
                          key={folder._id}
                          className="border-b hover:bg-indigo-50/50 cursor-pointer transition-colors"
                          onClick={() => openFolder(folder)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FiFolder className="text-indigo-500 text-lg" />
                              <span className="font-medium text-gray-800">{folder.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {folder.fileCount || 0}
                            {folder.imageCount > 0 && <span className="ml-2 text-xs text-blue-500">{folder.imageCount} img</span>}
                            {folder.videoCount > 0 && <span className="ml-2 text-xs text-red-500">{folder.videoCount} vid</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{folder.createdByName}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(folder.createdAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={(e) => { e.stopPropagation(); setEditingFolder(folder._id); setEditName(folder.name); setEditDesc(folder.description || ''); }} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors mr-1" title="Edit">
                              <FiEdit2 className="text-blue-500 text-sm" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder._id); }} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                              <FiTrash2 className="text-red-500 text-sm" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ─── FILE LIST VIEW (inside a folder) ──────────── */}
          {selectedFolder && (
            <>
              {loadingFiles ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <FiUpload className="mx-auto text-5xl mb-3" />
                  <p className="text-lg font-medium">No files yet</p>
                  <p className="text-sm mt-1">Upload photos, videos or documents to this folder</p>
                  <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 cursor-pointer">
                    <FiUpload /> Upload Files
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.length) handleUpload(e.target.files); e.target.value = ''; }}
                    />
                  </label>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredFiles.map((file, idx) => (
                    <div key={file.key || idx} className="group relative bg-white rounded-xl border border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all overflow-hidden">
                      {/* Thumbnail / Preview */}
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        {file.type === 'image' && file.downloadUrl ? (
                          <img
                            src={file.downloadUrl}
                            alt={file.originalName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                          />
                        ) : file.type === 'video' && file.downloadUrl ? (
                          <>
                            <video className="w-full h-full object-cover" muted preload="metadata">
                              <source src={file.downloadUrl} />
                            </video>
                            {/* Play button overlay */}
                            <button
                              onClick={() => { setVideoModalSrc(file.downloadUrl); setVideoModalName(file.originalName || 'Video'); }}
                              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                            >
                              <div className="w-14 h-14 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center shadow-xl transition-colors">
                                <FiPlay className="text-white text-2xl ml-1" />
                              </div>
                            </button>
                            {/* VIDEO badge */}
                            <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow">
                              Video
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            {getFileIcon(file.type)}
                            <span className="sr-only">{file.type}</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-gray-800 truncate" title={file.originalName}>{file.originalName}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-gray-400">{formatSize(file.size)}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(file.uploadedAt)}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                          <FiUser className="inline mr-0.5" />{file.uploadedByName || 'Unknown'}
                        </p>
                      </div>
                      {/* Hover actions */}
                      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                        {file.type === 'video' && file.downloadUrl && (
                          <button
                            onClick={() => { setVideoModalSrc(file.downloadUrl); setVideoModalName(file.originalName || 'Video'); }}
                            className="p-1.5 bg-white/90 rounded-full shadow hover:bg-green-50 transition-colors"
                            title="Play Video"
                          >
                            <FiPlay className="text-green-600 text-xs" />
                          </button>
                        )}
                        {file.type === 'image' && file.downloadUrl && (
                          <button
                            onClick={() => window.open(file.downloadUrl, '_blank')}
                            className="p-1.5 bg-white/90 rounded-full shadow hover:bg-blue-50 transition-colors"
                            title="View Full Size"
                          >
                            <FiMaximize className="text-blue-600 text-xs" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 bg-white/90 rounded-full shadow hover:bg-blue-50 transition-colors"
                          title="Download"
                        >
                          <FiDownload className="text-blue-600 text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.key)}
                          className="p-1.5 bg-white/90 rounded-full shadow hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="text-red-600 text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List view for files */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">File</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Size</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Uploaded By</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map((file, idx) => (
                        <tr key={file.key || idx} className="border-b hover:bg-indigo-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.type)}
                              <span className="font-medium text-gray-800 truncate max-w-[200px]" title={file.originalName}>{file.originalName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              file.type === 'image' ? 'bg-blue-100 text-blue-700' :
                              file.type === 'video' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {file.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{formatSize(file.size)}</td>
                          <td className="px-4 py-3 text-gray-500">{file.uploadedByName || 'Unknown'}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDate(file.uploadedAt)}</td>
                          <td className="px-4 py-3 text-right">
                            {file.type === 'video' && file.downloadUrl && (
                              <button
                                onClick={() => { setVideoModalSrc(file.downloadUrl); setVideoModalName(file.originalName || 'Video'); }}
                                className="p-1.5 hover:bg-green-100 rounded-lg transition-colors mr-1"
                                title="Play"
                              >
                                <FiPlay className="text-green-600 text-sm" />
                              </button>
                            )}
                            <button onClick={() => handleDownload(file)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors mr-1" title="Download">
                              <FiDownload className="text-blue-500 text-sm" />
                            </button>
                            <button onClick={() => handleDeleteFile(file.key)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                              <FiTrash2 className="text-red-500 text-sm" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* ─── CREATE FOLDER MODAL ──────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiFolderPlus className="text-indigo-600" /> New Folder
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <FiX className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Project Photos, Reels, Marketing Videos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT FOLDER MODAL ────────────────────────────── */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingFolder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiEdit2 className="text-blue-600" /> Edit Folder
              </h2>
              <button onClick={() => setEditingFolder(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <FiX className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditingFolder(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={() => handleEditFolder(editingFolder)}
                disabled={!editName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULLSCREEN VIDEO PLAYER MODAL ────────────────── */}
      {videoModalSrc && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setVideoModalSrc(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium text-sm truncate max-w-md">{videoModalName}</h3>
              <button
                onClick={() => setVideoModalSrc(null)}
                className="p-2 text-white hover:text-red-400 transition-colors"
                title="Close"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <video
              controls
              autoPlay
              className="w-full max-h-[80vh] rounded-xl shadow-2xl bg-black"
            >
              <source src={videoModalSrc} />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
