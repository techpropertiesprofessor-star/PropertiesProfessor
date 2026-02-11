import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { inventoryAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AddInventoryForm from '../components/AddInventoryForm';

function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);

  const [units, setUnits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitMedia, setUnitMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [newUnit, setNewUnit] = useState({});

  // Edit state
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editUnit, setEditUnit] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    query: '',
    project_id: '',
    status: '',
    bhk: '',
    listing_type: '',
    budget_min: '',
    budget_max: '',
    area_min: '',
    area_max: '',
    location: '',
    keys_location: '',
    facing: '',
    furnished_status: ''
  });

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await inventoryAPI.getProjects();
      setProjects(response.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  // Fetch stats (if backend provides)
  const fetchStats = async () => {
    try {
      if (inventoryAPI.getStats) {
        const res = await inventoryAPI.getStats();
        setStats(res.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch units
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params[key] = filters[key];
      });
      const res = await inventoryAPI.getUnits(params);

      // assume API returns an array in res.data
      setUnits(Array.isArray(res.data) ? res.data : res.data?.units || []);

    } catch (err) {
      console.error('Failed to fetch units:', err);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProjects();
    fetchUnits();
    fetchStats();
  }, [fetchUnits]);

  // Helpers
  const buildMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${api.defaults.baseURL || ''}/${url}`.replace(/([^:]\/\/)\//g, '$1');
  };

  const viewUnit = async (unitId) => {
    try {
      const res = await inventoryAPI.getUnit(unitId);
      setSelectedUnit(res.data || null);
      const mediaRes = await inventoryAPI.listUnitMedia(unitId);
      setUnitMedia(mediaRes.data || []);
    } catch (err) {
      console.error('Failed to view unit:', err);
    }
  };

  const handleUploadMedia = async (files) => {
    if (!selectedUnit) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      if (caption) formData.append('caption', caption);
      await inventoryAPI.uploadUnitMedia(selectedUnit.id || selectedUnit._id, formData);
      await viewUnit(selectedUnit.id || selectedUnit._id);
      setCaption('');
    } catch (err) {
      console.error('Upload media failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!selectedUnit) return;
    try {
      await inventoryAPI.deleteUnitMedia(selectedUnit.id || selectedUnit._id, mediaId);
      await viewUnit(selectedUnit.id || selectedUnit._id);
    } catch (err) {
      console.error('Delete media failed:', err);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedUnit) return;
    try {
      const res = await inventoryAPI.generatePDF(selectedUnit.id || selectedUnit._id);
      if (res.data && res.data.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err) {
      console.error('Generate PDF failed:', err);
    }
  };

  const startEditUnit = async (unitId) => {
    try {
      setEditingUnitId(unitId);
      const res = await inventoryAPI.getUnit(unitId);
      setEditUnit(res.data || null);
    } catch (err) {
      console.error('Failed to start edit:', err);
    }
  };

  const handleEditUnit = async () => {
    if (!editingUnitId || !editUnit) return;
    setEditLoading(true);
    setEditError('');
    try {
      await inventoryAPI.updateUnit(editingUnitId, editUnit);
      setEditingUnitId(null);
      setEditUnit(null);
      await fetchUnits();
      await fetchStats();
    } catch (err) {
      console.error('Edit unit failed:', err);
      setEditError(err.response?.data?.message || err.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const searchUnits = async () => {
    // uses filters state
    await fetchUnits();
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      project_id: '',
      status: '',
      bhk: '',
      listing_type: '',
      budget_min: '',
      budget_max: '',
      area_min: '',
      area_max: '',
      location: '',
      keys_location: '',
      facing: '',
      furnished_status: ''
    });
  };

  // Render UI (kept the original structure / classes)
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-teal-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold"
              style={{ minWidth: '140px' }}
            >
              + Add Inventory
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Total Units</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_units}</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4">
                <p className="text-sm text-blue-600">For Sale</p>
                <p className="text-2xl font-bold text-blue-700">{stats.for_sale || 0}</p>
              </div>
              <div className="bg-orange-50 rounded-lg shadow p-4">
                <p className="text-sm text-orange-600">For Rent</p>
                <p className="text-2xl font-bold text-orange-700">{stats.for_rent || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4">
                <p className="text-sm text-green-600">Available</p>
                <p className="text-2xl font-bold text-green-700">{stats.available}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-4">
                <p className="text-sm text-yellow-600">On Hold</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.on_hold}</p>
              </div>
              <div className="bg-purple-50 rounded-lg shadow p-4">
                <p className="text-sm text-purple-600">Booked</p>
                <p className="text-2xl font-bold text-purple-700">{stats.booked}</p>
              </div>
              <div className="bg-gray-50 rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Sold</p>
                <p className="text-2xl font-bold text-gray-700">{stats.sold}</p>
              </div>
            </div>
          )}

          {/* Search Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="font-semibold mb-3">Search Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <select
                className="px-3 py-2 border rounded-md"
                value={filters.project_id}
                onChange={(e) => setFilters((p) => ({ ...p, project_id: e.target.value }))}
              >
                <option value="">All Projects</option>
                {projects && projects.length > 0 ? (
                  projects.map((pr) => (
                    <option key={pr._id || pr.id} value={pr._id || pr.id}>{pr.name}</option>
                  ))
                ) : (
                  // fallback static options to match previous UI
                  <>
                    <option value="dc">dc</option>
                    <option value="jaypee">jaypee</option>
                    <option value="guar">Guar</option>
                    <option value="m3m">m3m</option>
                    <option value="bhutani">Bhutani</option>
                  </>
                )}
              </select>

              <select
                className="px-3 py-2 border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="hold">On Hold</option>
                <option value="booked">Booked</option>
                <option value="sold">Sold</option>
              </select>

              <select
                className="px-3 py-2 border rounded-md"
                value={filters.bhk}
                onChange={(e) => setFilters((p) => ({ ...p, bhk: e.target.value }))}
              >
                <option value="">All BHK</option>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="5+ BHK">5+ BHK</option>
              </select>

              <select
                className="px-3 py-2 border rounded-md"
                value={filters.listing_type}
                onChange={(e) => setFilters((p) => ({ ...p, listing_type: e.target.value }))}
              >
                <option value="">All (Sale &amp; Rent)</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>

              <input type="number" placeholder="Min Budget (₹)" className="px-3 py-2 border rounded-md" value={filters.budget_min || ''} onChange={(e) => setFilters((p) => ({ ...p, budget_min: e.target.value }))} />
              <input type="number" placeholder="Max Budget (₹)" className="px-3 py-2 border rounded-md" value={filters.budget_max || ''} onChange={(e) => setFilters((p) => ({ ...p, budget_max: e.target.value }))} />
              <input type="number" placeholder="Min Area (sq.ft)" className="px-3 py-2 border rounded-md" value={filters.area_min || ''} onChange={(e) => setFilters((p) => ({ ...p, area_min: e.target.value }))} />
              <input type="number" placeholder="Max Area (sq.ft)" className="px-3 py-2 border rounded-md" value={filters.area_max || ''} onChange={(e) => setFilters((p) => ({ ...p, area_max: e.target.value }))} />
              <input type="text" placeholder="Location" className="px-3 py-2 border rounded-md" value={filters.location || ''} onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))} />
              <input type="text" placeholder="Search by unit, project, etc." className="px-3 py-2 border rounded-md" value={filters.query || ''} onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))} />

              <select className="px-3 py-2 border rounded-md" value={filters.keys_location || ''} onChange={(e) => setFilters((p) => ({ ...p, keys_location: e.target.value }))}>
                <option value="">Keys Location</option>
                <option value="with_us">With Us</option>
                <option value="with_owner">With Owner</option>
                <option value="with_tenant">With Tenant</option>
                <option value="broker">With Broker</option>
              </select>

              <select className="px-3 py-2 border rounded-md" value={filters.facing || ''} onChange={(e) => setFilters((p) => ({ ...p, facing: e.target.value }))}>
                <option value="">All Facing</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north-east">North-East</option>
                <option value="north-west">North-West</option>
                <option value="south-east">South-East</option>
                <option value="south-west">South-West</option>
              </select>

              <select className="px-3 py-2 border rounded-md" value={filters.furnished_status || ''} onChange={(e) => setFilters((p) => ({ ...p, furnished_status: e.target.value }))}>
                <option value="">Furnished Status</option>
                <option value="furnished">Furnished</option>
                <option value="semi-furnished">Semi-Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={searchUnits} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">🔍 Search</button>
              <button onClick={resetFilters} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Reset</button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Searching...</div>
            ) : units.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No units found matching filters.</div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {units.map((u) => (
                    <div key={u._id || u.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <h4 className="font-semibold text-lg">{u.unit_number || u.name || 'Unit'}</h4>
                      <p className="text-sm text-gray-500">{u.location || ''}</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => viewUnit(u._id || u.id)} className="px-3 py-1 bg-emerald-600 text-white rounded">View</button>
                        {user && (user.role === 'admin' || user.role === 'manager') && (
                          <button onClick={() => startEditUnit(u._id || u.id)} className="px-3 py-1 bg-green-600 text-white rounded">Edit</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unit Detail / Media / Upload area */}
          {selectedUnit && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <h3 className="font-semibold text-lg">Unit: {selectedUnit.unit_number || selectedUnit.name}</h3>
                  <div className="mt-3">
                    <p className="text-sm text-gray-500">Status: {selectedUnit.status}</p>
                    <p className="text-sm text-gray-500">BHK: {selectedUnit.bhk}</p>
                    <p className="text-sm text-gray-500">Built-up: {selectedUnit.built_up_area}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 items-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Owner: {selectedUnit.owner_name || '-'}</p>
                    <p className="text-sm text-gray-500">Phone: {selectedUnit.owner_phone || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Media Gallery */}
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Media</h4>
                {unitMedia.length === 0 ? (
                  <p className="text-gray-500">No media uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
                    {unitMedia.map((m) => (
                      <div key={m.id} className="border rounded-md overflow-hidden">
                        {m.media_type === 'image' ? (
                          <img src={buildMediaUrl(m.url)} alt={m.caption || ''} className="w-full h-40 object-cover" />
                        ) : (
                          <video controls className="w-full h-40">
                            <source src={buildMediaUrl(m.url)} />
                          </video>
                        )}
                        <div className="p-2 flex items-center justify-between text-sm">
                          <span className="text-gray-600 truncate">{m.caption || ''}</span>
                          {user && (user.role === 'admin' || user.role === 'manager') && (
                            <button onClick={() => handleDeleteMedia(m.id)} className="text-red-600 hover:text-red-800">Delete</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Media */}
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-semibold mb-2">Upload Photos/Videos</h4>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*,video/*" multiple onChange={(e) => handleUploadMedia(e.target.files)} />
                  <input type="text" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} className="px-3 py-2 border rounded-md flex-1" />
                </div>
                {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={handleGeneratePDF} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold flex items-center gap-2">📄 Generate PDF</button>
                <button onClick={() => setSelectedUnit(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold">Close</button>
                {user && (
                  <button onClick={() => startEditUnit(selectedUnit.id || selectedUnit._id)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold">Edit Unit</button>
                )}
              </div>
            </div>
          )}

          {/* Create Inventory Modal */}
          {createModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-0 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
                <div className="p-0">
                  <AddInventoryForm
                    onSubmit={async (form) => {
                      setCreateLoading(true);
                      setCreateError('');
                      try {
                        // Create project/tower/unit as the original code intended
                        let projectId;
                        const projectName = form.buildingName || form.city || 'Default Project';
                        const existingProjects = await inventoryAPI.getProjects();
                        const existingProject = (existingProjects.data || []).find((p) => p.name === projectName);

                        if (existingProject) {
                          projectId = existingProject._id;
                        } else {
                          const newProject = await inventoryAPI.createProject({
                            name: projectName,
                            location: form.city,
                            description: `${form.propertyType} - ${form.lookingTo}`
                          });
                          projectId = newProject.data._id;
                        }

                        // towers
                        let towerId;
                        const towerName = form.buildingName || 'Main Tower';
                        const existingTowers = await inventoryAPI.getTowers(projectId);
                        const existingTower = (existingTowers.data || []).find((t) => t.name === towerName);
                        if (existingTower) {
                          towerId = existingTower._id;
                        } else {
                          const newTower = await inventoryAPI.createTower(projectId, { name: towerName, description: form.configType });
                          towerId = newTower.data._id;
                        }

                        const payload = {
                          project: projectId,
                          tower: towerId,
                          unitNumber: `${form.configType}-${Date.now()}`,
                          property_type: form.propertyType,
                          looking_to: form.lookingTo,
                          city: form.city,
                          building_name: form.buildingName,
                          config_type: form.configType,
                          bhk: form.bhk,
                          built_up_area: Number(form.builtUpArea) || 0,
                          super_area: Number(form.superArea) || 0,
                          floor_number: Number(form.floorNumber) || 0,
                          total_floors: Number(form.totalFloors) || 0,
                          age: Number(form.age) || 0,
                          bathrooms: Number(form.bathrooms) || 0,
                          balconies: Number(form.balconies) || 0,
                          parking_slots: Number(form.parking) || 0,
                          facing: form.facing,
                          furnished_status: form.furnishType,
                          amenities: form.amenities || [],
                          keys_location: form.keysLocation,
                          keys_remarks: form.keysRemarks,
                          availability_date: form.availabilityDate,
                          owner_name: form.ownerDetails?.name || '',
                          owner_phone: form.ownerDetails?.phone || '',
                          owner_email: form.ownerDetails?.email || '',
                          location: `${form.addressLine1}, ${form.addressLine2}, ${form.city}, ${form.state}`,
                          address_line1: form.addressLine1,
                          address_line2: form.addressLine2,
                          pincode: form.pincode,
                          landmark: form.landmark,
                          state: form.state,
                          base_price: Number(form.basePrice) || 0,
                          final_price: Number(form.finalPrice) || 0,
                          price_per_sqft: Number(form.pricePerSqft) || 0,
                          status: 'available'

                        };

                        // Convert payload + photos to FormData
                        const formData = new FormData();
                        Object.keys(payload).forEach((key) => {
                          if (payload[key] !== undefined && payload[key] !== null) formData.append(key, payload[key]);
                        });
                        if (form.photos && form.photos.length > 0) {
                          form.photos.forEach((file) => formData.append('photos', file));
                        }

                        const res = await inventoryAPI.createUnit(formData);
                        const unitId = res.data?._id || res.data?.id;

                        setCreateModalOpen(false);
                        await fetchProjects();
                        await fetchUnits();
                        await fetchStats();
                        if (unitId) await viewUnit(unitId);
                      } catch (err) {
                        console.error('Create unit error:', err);
                        setCreateError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create unit');
                      } finally {
                        setCreateLoading(false);
                      }
                    }}
                  />
                  {createError && <div className="text-red-500 text-xs p-2">{createError}</div>}
                  {createLoading && <div className="text-gray-500 text-xs p-2">Saving...</div>}
                </div>
              </div>
            </div>
          )}

          {/* Edit Unit Modal */}
          {editingUnitId && editUnit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-5 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold">Edit Unit (Unit: {editUnit.unit_number})</h2>
                  <button
                    onClick={() => {
                      setEditingUnitId(null);
                      setEditUnit(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    ✕
                  </button>
                </div>

                {editError && (
                  <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{editError}</div>
                )}

                {editUnit.updated_at && editUnit.edited_by_first_name && (
                  <div className="mb-4 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    <strong>Last edited:</strong> {editUnit.edited_by_first_name} {editUnit.edited_by_last_name} on {new Date(editUnit.updated_at).toLocaleDateString()} at {new Date(editUnit.updated_at).toLocaleTimeString()}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Property Details Section (kept controls similar to original) */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">Property Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Floor Number</label>
                        <input type="number" value={editUnit.floor_number || ''} onChange={(e) => setEditUnit((p) => ({ ...p, floor_number: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">BHK</label>
                        <select value={editUnit.bhk || ''} onChange={(e) => setEditUnit((p) => ({ ...p, bhk: e.target.value }))} className="w-full px-3 py-2 border rounded-md">
                          <option value="">Select</option>
                          <option value="1 BHK">1 BHK</option>
                          <option value="2 BHK">2 BHK</option>
                          <option value="3 BHK">3 BHK</option>
                          <option value="4 BHK">4 BHK</option>
                          <option value="5+ BHK">5+ BHK</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Property Type</label>
                        <select value={editUnit.listing_type || 'sale'} onChange={(e) => setEditUnit((p) => ({ ...p, listing_type: e.target.value }))} className="w-full px-3 py-2 border rounded-md">
                          <option value="sale">For Sale</option>
                          <option value="rent">For Rent</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Carpet Area (sq.ft)</label>
                        <input type="number" value={editUnit.carpet_area || ''} onChange={(e) => setEditUnit((p) => ({ ...p, carpet_area: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Built-up Area (sq.ft)</label>
                        <input type="number" value={editUnit.built_up_area || ''} onChange={(e) => setEditUnit((p) => ({ ...p, built_up_area: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Facing</label>
                        <select value={editUnit.facing || ''} onChange={(e) => setEditUnit((p) => ({ ...p, facing: e.target.value }))} className="w-full px-3 py-2 border rounded-md">
                          <option value="">Select facing</option>
                          <option value="north">North</option>
                          <option value="south">South</option>
                          <option value="east">East</option>
                          <option value="west">West</option>
                          <option value="northeast">Northeast</option>
                          <option value="northwest">Northwest</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Furnished Status</label>
                        <select value={editUnit.furnished_status || ''} onChange={(e) => setEditUnit((p) => ({ ...p, furnished_status: e.target.value }))} className="w-full px-3 py-2 border rounded-md">
                          <option value="">Select status</option>
                          <option value="unfurnished">Unfurnished</option>
                          <option value="semi_furnished">Semi Furnished</option>
                          <option value="fully_furnished">Fully Furnished</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-600">Parking Slots</label>
                        <input type="number" value={editUnit.parking_slots || 0} onChange={(e) => setEditUnit((p) => ({ ...p, parking_slots: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">Pricing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Base Price (in ₹)</label>
                        <input type="number" value={editUnit.base_price || ''} onChange={(e) => setEditUnit((p) => ({ ...p, base_price: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Final Price (in ₹)</label>
                        <input type="number" value={editUnit.final_price || ''} onChange={(e) => setEditUnit((p) => ({ ...p, final_price: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Availability & Owner */}
                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">Availability & Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status *</label>
                        <select value={editUnit.status || 'available'} onChange={(e) => setEditUnit((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 border rounded-md">
                          <option value="available">Available</option>
                          <option value="hold">On Hold</option>
                          <option value="booked">Booked</option>
                          <option value="sold">Sold</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Keys Location</label>
                        <select value={editUnit.keys_location || ''} onChange={(e) => setEditUnit((p) => ({ ...p, keys_location: e.target.value }))} className="w-full px-3 py-2 border rounded-md">
                          <option value="">Select location</option>
                          <option value="on_site">On Site</option>
                          <option value="with_dealer">With Dealer</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Keys Remarks</label>
                        <input type="text" value={editUnit.keys_remarks || ''} onChange={(e) => setEditUnit((p) => ({ ...p, keys_remarks: e.target.value }))} className="w-full px-3 py-2 border rounded-md" placeholder="e.g., Notes about keys location" />
                      </div>
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-semibold mb-3">Owner Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Owner Name</label>
                        <input type="text" value={editUnit.owner_name || ''} onChange={(e) => setEditUnit((p) => ({ ...p, owner_name: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Owner Phone</label>
                        <input type="text" value={editUnit.owner_phone || ''} onChange={(e) => setEditUnit((p) => ({ ...p, owner_phone: e.target.value }))} className="w-full px-3 py-2 border rounded-md" maxLength="10" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Owner Email</label>
                        <input type="email" value={editUnit.owner_email || ''} onChange={(e) => setEditUnit((p) => ({ ...p, owner_email: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => { setEditingUnitId(null); setEditUnit(null); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                  <button onClick={handleEditUnit} disabled={editLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:opacity-60">{editLoading ? 'Saving...' : 'Update Unit'}</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

export default InventoryPage;
