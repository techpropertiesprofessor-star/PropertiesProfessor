import React, { useState } from 'react';
import { leadAPI } from '../api/client';

function LeadUpload({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [assignMethod, setAssignMethod] = useState('round_robin');
  const [manualEmployee, setManualEmployee] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel or CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    if (assignMethod === 'manual' && !manualEmployee) {
      alert('Please enter employee ID for manual assignment');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assign_method', assignMethod);
    if (assignMethod === 'manual') {
      formData.append('employee_id', manualEmployee);
    }

    try {
      const response = await leadAPI.upload(formData);
      setUploadResult(response.data);
      setFile(null);
      if (onUploadComplete) onUploadComplete(response.data);
    } catch (err) {
      console.error('Upload failed:', err);
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Leads (Excel/CSV)</h3>
      
      {/* File Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File (.xlsx, .xls, .csv)
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Assignment Method */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assignment Method
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="round_robin"
              checked={assignMethod === 'round_robin'}
              onChange={(e) => setAssignMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm">Round Robin (Auto-assign evenly)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="manual"
              checked={assignMethod === 'manual'}
              onChange={(e) => setAssignMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm">Manual (Assign to specific employee)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="none"
              checked={assignMethod === 'none'}
              onChange={(e) => setAssignMethod(e.target.value)}
              className="mr-2"
            />
            <span className="text-sm">None (Upload without assignment)</span>
          </label>
        </div>
      </div>

      {/* Manual Employee ID */}
      {assignMethod === 'manual' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID
          </label>
          <input
            type="number"
            value={manualEmployee}
            onChange={(e) => setManualEmployee(e.target.value)}
            placeholder="Enter employee ID"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`w-full py-2 px-4 rounded-md font-semibold ${
          !file || uploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {uploading ? 'Uploading...' : 'Upload Leads'}
      </button>

      {/* Upload Result */}
      {uploadResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-semibold text-green-800 mb-2">Upload Successful!</h4>
          <div className="text-sm text-green-700 space-y-1">
            <p>✅ Total Rows: {uploadResult.total_rows}</p>
            <p>✅ Inserted: {uploadResult.inserted}</p>
            <p>⚠️ Duplicates: {uploadResult.duplicates}</p>
            <p>❌ Errors: {uploadResult.errors}</p>
            <p>📦 Batch ID: {uploadResult.batch_id}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadUpload;
