import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { inventoryAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AddInventoryForm from '../components/AddInventoryForm';
import PostPropertyBasicDetails from './PostPropertyBasicDetails';

function InventoryPage() {
  // Fetch all projects for dropdowns/filters
  const fetchProjects = async () => {
    try {
      const response = await inventoryAPI.getProjects();
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };
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
    const [projectNameText, setProjectNameText] = useState('');
    const [projectCityText, setProjectCityText] = useState('');
    const [towerNameText, setTowerNameText] = useState('');
  const [newUnit, setNewUnit] = useState({
    project_id: '',
    tower_id: '',
    unit_number: '',
    floor_number: '',
    bhk: '',
    carpet_area: '',
    built_up_area: '',
    super_area: '',
    base_price: '',
    final_price: '',
    price_per_sqft: '',
    status: 'available',
    listing_type: 'sale',
    availability_date: '',
    keys_location: '',
    keys_remarks: '',
    return (
      <div className="flex h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-teal-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 p-6 overflow-y-auto">
            {/* Main page content and all modals go here, unchanged */}
            {/* ...existing code... */}
          </main>
        </div>
      </div>
    );





  // Fetch units from backend with current filters
  // Memoize fetchUnits to avoid useEffect warning
  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.keys(filters).forEach(key => {
        if (filters[key]) params[key] = filters[key];
      });
      console.log('🔍 Searching with params:', params);
      const response = await inventoryAPI.searchUnits(params);
      console.log('📦 Response received:', response.data);
      console.log('📊 Units count:', response.data.units?.length);
      setUnits(Array.isArray(response.data.units) ? response.data.units : []);
    } catch (err) {
      console.error('Fetch units failed:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
    // fetchUnits(); // Only fetch on Search button now
    
    // Check for add parameter in URL and auto-open add form
    if (searchParams.get('add') === 'true') {
      setCreateModalOpen(true);
      // Clean up URL after opening
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchStats = async () => {
    try {
      const response = await inventoryAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'hold': return 'bg-yellow-100 text-yellow-800';
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'sold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKeysColor = (keys) => {
    switch(keys) {
      case 'on_site': return 'bg-purple-100 text-purple-800';
      case 'with_dealer': return 'bg-indigo-100 text-indigo-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

    const getListingTypeColor = (type) => {
      return type === 'sale' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
    };

    const getListingTypeLabel = (type) => {
      return type === 'sale' ? 'FOR SALE' : 'FOR RENT';
    };

  // Search button triggers fetchUnits and fetchStats
  const searchUnits = async () => {
    // Only trigger if any filter is set
    if (Object.values(filters).some(v => v)) {
      await fetchUnits();
      await fetchStats();
    }
  };


  // Debounce only the text query filter, others update instantly
  const handleFilterChange = (key, value) => {
    if (key === 'query') {
      if (debounceTimer) clearTimeout(debounceTimer);
      const t = setTimeout(() => {
        setFilters(prev => ({ ...prev, [key]: value }));
      }, 400);
      setDebounceTimer(t);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
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
    setUnits([]);
  };

  const handleNewUnitChange = (key, value) => {
    setNewUnit(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateUnit = async () => {
    if ((!newUnit.project_id && !projectNameText) || !newUnit.unit_number || !newUnit.bhk || !newUnit.carpet_area || !newUnit.final_price) {
      setCreateError('Project (select or type), Unit Number, BHK, Carpet Area, and Final Price are required');
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError('');
      // Resolve project
      let projectId = newUnit.project_id;
      if (!projectId && projectNameText) {
        const payload = {
          name: projectNameText,
          developer: '',
          location: projectCityText || '',
          address: '',
          city: projectCityText || '',
          state: '',
          pincode: '',
          project_type: '',
          total_towers: null,
          total_units: null,
          rera_number: '',
          possession_date: null,
          amenities: null,
          description: ''
        };
        const createdProject = await inventoryAPI.createProject(payload);
        projectId = createdProject.data._id || createdProject.data.id;
        await fetchProjects();
      }

      // Resolve tower
      let towerId = newUnit.tower_id;
      if (projectId && towerNameText) {
        const payload = {
          name: towerNameText,
          tower_number: '',
          total_floors: null,
          total_units: null
        };
        const createdTower = await inventoryAPI.createTower(projectId, payload);
        towerId = createdTower.data._id || createdTower.data.id;
      }

      // Parse BHK (e.g., '2 BHK' -> 2)
      let bhkValue = newUnit.bhk;
      if (typeof bhkValue === 'string') {
        const match = bhkValue.match(/(\d+)/);
        bhkValue = match ? Number(match[1]) : NaN;
      }
      if (typeof bhkValue !== 'number' || isNaN(bhkValue)) {
        setCreateError('BHK value must be a valid number');
        setCreateLoading(false);
        return;
      }
      // Validate ObjectId format for project/tower
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(projectId)) {
        setCreateError('Project ID is invalid. Please select a valid project.');
        setCreateLoading(false);
        return;
      }
      if (!objectIdRegex.test(towerId)) {
        setCreateError('Tower ID is invalid. Please select a valid tower.');
        setCreateLoading(false);
        return;
      }
      // Map frontend fields to backend fields (send all fields)
      const unitPayload = {
        project_id: projectId,
        tower_id: towerId,
        unit_number: newUnit.unit_number,
        floor_number: newUnit.floor_number,
        bhk: bhkValue,
        carpet_area: newUnit.carpet_area ? Number(newUnit.carpet_area) : undefined,
        built_up_area: newUnit.built_up_area ? Number(newUnit.built_up_area) : undefined,
        super_area: newUnit.super_area ? Number(newUnit.super_area) : undefined,
        base_price: newUnit.base_price ? Number(newUnit.base_price) : undefined,
        final_price: newUnit.final_price ? Number(newUnit.final_price) : undefined,
        price_per_sqft: newUnit.price_per_sqft ? Number(newUnit.price_per_sqft) : undefined,
        status: newUnit.status || 'available',
        availability_date: newUnit.availability_date || '',
        keys_location: newUnit.keys_location || '',
        keys_remarks: newUnit.keys_remarks || '',
        facing: newUnit.facing || '',
        furnished_status: newUnit.furnished_status || '',
        parking_slots: newUnit.parking_slots ? Number(newUnit.parking_slots) : undefined,
        owner_name: newUnit.owner_name || '',
        owner_phone: newUnit.owner_phone || '',
        owner_email: newUnit.owner_email || '',
        listing_type: newUnit.listing_type || 'sale',
      };
      const res = await inventoryAPI.createUnit(unitPayload);
      setCreateModalOpen(false);
      setNewUnit({
        project_id: '',
        tower_id: '',
        unit_number: '',
        floor_number: '',
        bhk: '',
        carpet_area: '',
        built_up_area: '',
        super_area: '',
        base_price: '',
        final_price: '',
        price_per_sqft: '',
        status: 'available',
        availability_date: '',
        keys_location: '',
        keys_remarks: '',
        facing: '',
        furnished_status: '',
        parking_slots: '',
        owner_name: '',
        owner_phone: '',
        owner_email: ''
      });
      setProjectNameText('');
      setProjectCityText('');
      setTowerNameText('');
      await fetchUnits();
      await fetchStats();
      if (res.data?._id || res.data?.id) {
        await viewUnit(res.data._id || res.data.id);
      }
    } catch (err) {
      console.error('Create unit failed:', err);
      setCreateError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create unit');
    } finally {
      setCreateLoading(false);
    }
  };

  const viewUnit = async (id) => {
    try {
      const response = await inventoryAPI.getUnit(id);
      setSelectedUnit(response.data);
      const mediaRes = await inventoryAPI.listUnitMedia(id);
      // Ensure unitMedia is always an array
      setUnitMedia(Array.isArray(mediaRes.data.media) ? mediaRes.data.media : []);
      setShareUrl('');
    } catch (err) {
      console.error('Failed to fetch unit details:', err);
    }
  };

  const handleUploadMedia = async (files) => {
    if (!selectedUnit) return;
    if (!files || files.length === 0) return;
    try {
      setUploading(true);
      await inventoryAPI.uploadUnitMedia(selectedUnit.id, Array.from(files), caption);
      const mediaRes = await inventoryAPI.listUnitMedia(selectedUnit.id);
      setUnitMedia(Array.isArray(mediaRes.data.media) ? mediaRes.data.media : []);
      setCaption('');
      // Refresh list and stats to show latest photo in cards
      await fetchUnits();
      await fetchStats();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!selectedUnit) return;
    try {
      await inventoryAPI.deleteUnitMedia(selectedUnit.id, mediaId);
      setUnitMedia(prev => prev.filter(m => m.id !== mediaId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const generateShare = async () => {
    if (!selectedUnit) return;
    try {
      const res = await inventoryAPI.enableUnitShare(selectedUnit.id);
      setShareUrl(res.data.share_url);
    } catch (err) {
      console.error('Share enable failed:', err);
    }
  };

  const backendOrigin = api.defaults.baseURL.replace(/\/api$/, '');
  const buildMediaUrl = (url) => `${backendOrigin}${url}`;

  const startEditUnit = async (id) => {
    try {
      const response = await inventoryAPI.getUnit(id);
      setEditUnit(response.data);
      setEditingUnitId(id);
    } catch (err) {
      setEditError('Failed to load unit for editing');
      console.error(err);
    }
  };

  const handleEditUnit = async () => {
    if (!editUnit || !editingUnitId) return;
    try {
      setEditLoading(true);
      setEditError('');
      const updatePayload = {
        unitNumber: editUnit.unitNumber || editUnit.unit_number || '',
        project: editUnit.project?._id || editUnit.project || '',
        tower: editUnit.tower?._id || editUnit.tower || '',
        status: editUnit.status,
        final_price: editUnit.final_price,
        base_price: editUnit.base_price,
        keys_location: editUnit.keys_location,
        keys_remarks: editUnit.keys_remarks,
        owner_name: editUnit.owner_name,
        owner_phone: editUnit.owner_phone,
        owner_email: editUnit.owner_email,
        bhk: editUnit.bhk ? Number(editUnit.bhk) : '',
        carpet_area: editUnit.carpet_area,
        built_up_area: editUnit.built_up_area,
        facing: editUnit.facing,
        furnished_status: editUnit.furnished_status,
        parking_slots: editUnit.parking_slots,
        floor_number: editUnit.floor_number,
        listing_type: editUnit.listing_type
      };
      await inventoryAPI.updateUnit(editingUnitId, updatePayload);
      setEditingUnitId(null);
      setEditUnit(null);
      setSelectedUnit(null); // Close detail modal
      await searchUnits(); // Refresh list
    } catch (err) {
      setEditError('Failed to update unit');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedUnit) return;
    try {
      // MongoDB uses _id field
      const unitId = selectedUnit._id || selectedUnit.id;
      if (!unitId) {
        alert('Unit ID not found. Please refresh and try again.');
        return;
      }
      console.log('Generating PDF for unit:', unitId);
      const response = await inventoryAPI.generatePDF(unitId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Property_${selectedUnit.unit_number || selectedUnit.unitNumber || 'details'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };


  // Remove unused handleQueryInput and queryInput

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
            value={filters.project_id}
            onChange={(e) => handleFilterChange('project_id', e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="hold">On Hold</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </select>

          <select
            value={filters.bhk}
            onChange={(e) => handleFilterChange('bhk', e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All BHK</option>
            <option value="1 BHK">1 BHK</option>
            <option value="2 BHK">2 BHK</option>
            <option value="3 BHK">3 BHK</option>
            <option value="4 BHK">4 BHK</option>
            <option value="5+ BHK">5+ BHK</option>
          </select>

            <select
              value={filters.listing_type}
              onChange={(e) => handleFilterChange('listing_type', e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">All (Sale & Rent)</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>

          <input
            type="number"
            placeholder="Min Budget (₹)"
            value={filters.budget_min}
            onChange={(e) => handleFilterChange('budget_min', e.target.value)}
            className="px-3 py-2 border rounded-md"
          />

          <input
            type="number"
            placeholder="Max Budget (₹)"
            value={filters.budget_max}
            onChange={(e) => handleFilterChange('budget_max', e.target.value)}
            className="px-3 py-2 border rounded-md"
          />

          <input
            type="number"
            placeholder="Min Area (sq.ft)"
            value={filters.area_min}
            onChange={(e) => handleFilterChange('area_min', e.target.value)}
            className="px-3 py-2 border rounded-md"
          />

          <input
            type="number"
            placeholder="Max Area (sq.ft)"
            value={filters.area_max}
            onChange={(e) => handleFilterChange('area_max', e.target.value)}
            className="px-3 py-2 border rounded-md"
          />


          <input
            type="text"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="px-3 py-2 border rounded-md"
          />

          <input
            type="text"
            placeholder="Search by unit, project, etc."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            className="px-3 py-2 border rounded-md"
          />

          <select
            value={filters.keys_location}
            onChange={(e) => handleFilterChange('keys_location', e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Keys Location</option>
            <option value="with_us">With Us</option>
            <option value="with_owner">With Owner</option>
            <option value="with_tenant">With Tenant</option>
            <option value="broker">With Broker</option>
          </select>

          <select
            value={filters.facing}
            onChange={(e) => handleFilterChange('facing', e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
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

          <select
            value={filters.furnished_status}
            onChange={(e) => handleFilterChange('furnished_status', e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Furnished Status</option>
            <option value="furnished">Furnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={searchUnits}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold"
          >
            🔍 Search
          </button>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Reset
          </button>
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
              {units.map((unit) => (
                <div key={unit.id} className="border rounded-xl bg-white shadow-lg hover:shadow-2xl transition p-0 flex flex-col justify-between min-h-[340px]">
                  <div className="p-5 pb-2 border-b flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-bold text-blue-900">
                        {/* Project Name */}
                        {unit.project?.name || unit.project_name || (typeof unit.project === 'string' ? unit.project : '-')}
                        <span className="text-xs text-gray-400 font-normal">(
                          {unit.tower?.name || unit.tower_name || (typeof unit.tower === 'string' ? unit.tower : '-')}
                        )</span>
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getListingTypeColor(unit.listing_type)}`}>{getListingTypeLabel(unit.listing_type)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-semibold text-gray-800">{unit.bhk ? unit.bhk + ' BHK' : '-'}</span>
                      <span className="text-xs text-gray-500">Unit #{unit.unitNumber || unit.unit_number || '-'}</span>
                      <span className="text-xs text-gray-500">Floor {unit.floor_number || '-'}{unit.total_floors ? `/${unit.total_floors}` : ''}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Area: {unit.area !== undefined && unit.area !== null ? unit.area + ' sqft' : (unit.carpet_area !== undefined && unit.carpet_area !== null ? unit.carpet_area + ' sqft' : '-')}</span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Super: {unit.super_area !== undefined && unit.super_area !== null && unit.super_area !== '' ? unit.super_area + ' sqft' : '-'}</span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Built-up: {unit.built_up_area !== undefined && unit.built_up_area !== null && unit.built_up_area !== '' ? unit.built_up_area + ' sqft' : '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-green-700">₹{unit.final_price && !isNaN(unit.final_price) ? (unit.final_price / 100000).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + 'L' : '-'}</span>
                        <span className="text-xs text-gray-500">Base: ₹{unit.base_price && !isNaN(unit.base_price) ? (unit.base_price / 100000).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + 'L' : '-'}</span>
                        <span className="text-xs text-gray-500">₹{unit.price_per_sqft && !isNaN(unit.price_per_sqft) ? unit.price_per_sqft.toLocaleString() : '-' } /sqft</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(unit.status)}`}>{unit.status || '-'}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Keys: {unit.keysLocation || unit.keys_location || '-'}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Facing: {unit.facing || '-'}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Furnished: {unit.furnished_status || '-'}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Parking: {unit.parking_slots !== undefined && unit.parking_slots !== null && unit.parking_slots !== '' ? unit.parking_slots : '-'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Owner: {unit.owner_name || '-'}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Phone: {unit.owner_phone || '-'}</span>
                        {unit.owner_email && <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Email: {unit.owner_email}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Available: {unit.availability_date ? (new Date(unit.availability_date).toLocaleDateString()) : '-'}</span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">Remarks: {unit.keys_remarks || '-'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 p-4 pt-2 border-t bg-gray-50">
                      <button
                        onClick={() => viewUnit(unit._id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition font-semibold shadow"
                        title="View unit details"
                      >
                        View
                      </button>
                      <button
                        onClick={() => startEditUnit(unit._id)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition font-semibold shadow"
                        title="Edit this unit"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Unit Details Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Unit Details</h2>
              <button
                onClick={() => setSelectedUnit(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Property Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project</label>
                    <p className="text-gray-900">{selectedUnit.project?.name || selectedUnit.project_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tower</label>
                    <p className="text-gray-900">{selectedUnit.tower?.name || selectedUnit.tower_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Unit Number</label>
                    <p className="text-gray-900">{selectedUnit.unitNumber || selectedUnit.unit_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Floor</label>
                    <p className="text-gray-900">{selectedUnit.floor_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">BHK</label>
                    <p className="text-gray-900">{selectedUnit.bhk || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Carpet Area</label>
                    <p className="text-gray-900">{selectedUnit.area || selectedUnit.carpet_area || '-'} sq.ft</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Built-up Area</label>
                    <p className="text-gray-900">{selectedUnit.built_up_area || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Super Area</label>
                    <p className="text-gray-900">{selectedUnit.super_area || '-'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Base Price</label>
                    <p className="text-gray-900">₹{selectedUnit.base_price ? (selectedUnit.base_price / 100000).toFixed(2) + 'L' : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Final Price</label>
                    <p className="text-xl font-bold text-gray-900">₹{selectedUnit.final_price ? (selectedUnit.final_price / 100000).toFixed(2) + 'L' : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Price per Sq.ft</label>
                    <p className="text-gray-900">₹{selectedUnit.price_per_sqft ? selectedUnit.price_per_sqft.toLocaleString() : '-'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Status & Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Property Type</label>
                    <p><span className={`px-2 py-1 text-xs font-semibold rounded ${getListingTypeColor(selectedUnit.listing_type)}`}>
                      {getListingTypeLabel(selectedUnit.listing_type)}
                    </span></p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p><span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(selectedUnit.status)}`}>
                      {selectedUnit.status || '-'}
                    </span></p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Keys Location</label>
                    <p><span className={`px-2 py-1 text-xs font-semibold rounded ${getKeysColor(selectedUnit.keysLocation || selectedUnit.keys_location)}`}>
                      {(selectedUnit.keysLocation || selectedUnit.keys_location || '-').replace('_', ' ')}
                    </span></p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Facing</label>
                    <p className="text-gray-900">{selectedUnit.facing || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Furnished</label>
                    <p className="text-gray-900">{selectedUnit.furnished_status || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Parking</label>
                    <p className="text-gray-900">{selectedUnit.parking_slots || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">RERA</label>
                    <p className="text-gray-900">{selectedUnit.rera_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Availability Date</label>
                    <p className="text-gray-900">{selectedUnit.availability_date ? (new Date(selectedUnit.availability_date).toLocaleDateString()) : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Keys Remarks</label>
                    <p className="text-gray-900">{selectedUnit.keys_remarks || '-'}</p>
                  </div>
                </div>
              </div>
              {(selectedUnit.owner_name || selectedUnit.owner_phone || selectedUnit.owner_email) && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Owner Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-gray-900">{selectedUnit.owner_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{selectedUnit.owner_phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedUnit.owner_email || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Media Gallery */}
              <div>
                <h3 className="font-semibold text-lg mb-2">Media</h3>
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={handleGeneratePDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold flex items-center gap-2"
                >
                  📄 Generate PDF
                </button>
                <button
                  onClick={() => setSelectedUnit(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold"
                >
                  Close
                </button>
                {user && (
                  <button
                    onClick={() => startEditUnit(selectedUnit.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
                  >
                    Edit Unit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Inventory Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-auto p-0 max-h-[95vh] flex flex-col shadow-lg">
            {/* Modal header removed as per request */}
            <div className="p-0">
              <AddInventoryForm
                onSubmit={async (form) => {
                  setCreateLoading(true);
                  setCreateError('');
                  try {
                    // Step 1: Ensure project exists or create one
                    let projectId;
                    const projectName = form.buildingName || form.city || 'Default Project';
                    const existingProjects = await inventoryAPI.getProjects();
                    const existingProject = existingProjects.data.find(p => p.name === projectName);
                    
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

                    // Step 2: Ensure tower exists or create one
                    let towerId;
                    const towerName = form.buildingName || 'Main Tower';
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-auto p-0 max-h-[95vh] flex flex-col shadow-lg">
            {/* Modal header removed as per request */}
            <div className="p-0">
              <AddInventoryForm
                onSubmit={async (form) => {
                  setCreateLoading(true);
                  setCreateError('');
                  try {
                    // Step 1: Ensure project exists or create one
                    let projectId;
                    const projectName = form.buildingName || form.city || 'Default Project';
                    const existingProjects = await inventoryAPI.getProjects();
                    const existingProject = existingProjects.data.find(p => p.name === projectName);
                    
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

                    // Step 2: Ensure tower exists or create one
                    let towerId;
                    const towerName = form.buildingName || 'Main Tower';
                    const existingTowers = await inventoryAPI.getTowers(projectId);
                    const existingTower = existingTowers.data.find(t => t.name === towerName);
                    
                    if (existingTower) {
                      towerId = existingTower._id;
                    } else {
                      const newTower = await inventoryAPI.createTower(projectId, {
                        name: towerName,
                        description: form.configType
                      });
                      towerId = newTower.data._id;
                    }

                    // Step 3: Prepare complete payload
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
                      status: 'AVAILABLE'
                    };
                    
                    // Step 4: Create FormData instead of JSON
const formData = new FormData();

// Append all fields
Object.keys(payload).forEach((key) => {
  if (payload[key] !== undefined && payload[key] !== null) {
    formData.append(key, payload[key]);
  }
});

// Append photos if exist
if (form.photos && form.photos.length > 0) {
  form.photos.forEach((file) => {
    formData.append("photos", file);
  });
}

// Step 5: Create unit with photos together
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
              {/* Property Details Section */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Floor Number</label>
                    <input
                      type="number"
                      value={editUnit.floor_number || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, floor_number: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">BHK</label>
                    <select
                      value={editUnit.bhk || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, bhk: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
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
                      <select
                        value={editUnit.listing_type || 'sale'}
                        onChange={(e) => setEditUnit(prev => ({ ...prev, listing_type: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="sale">For Sale</option>
                        <option value="rent">For Rent</option>
                      </select>
                    </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Carpet Area (sq.ft)</label>
                    <input
                      type="number"
                      value={editUnit.carpet_area || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, carpet_area: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Built-up Area (sq.ft)</label>
                    <input
                      type="number"
                      value={editUnit.built_up_area || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, built_up_area: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Facing</label>
                    <select
                      value={editUnit.facing || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, facing: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
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
                    <select
                      value={editUnit.furnished_status || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, furnished_status: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select status</option>
                      <option value="unfurnished">Unfurnished</option>
                      <option value="semi_furnished">Semi Furnished</option>
                      <option value="fully_furnished">Fully Furnished</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Parking Slots</label>
                    <input
                      type="number"
                      value={editUnit.parking_slots || 0}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, parking_slots: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Base Price (in ₹)</label>
                    <input
                      type="number"
                      value={editUnit.base_price || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, base_price: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Final Price (in ₹)</label>
                    <input
                      type="number"
                      value={editUnit.final_price || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, final_price: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Availability Section */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Availability & Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status *</label>
                    <select
                      value={editUnit.status || 'available'}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="available">Available</option>
                      <option value="hold">On Hold</option>
                      <option value="booked">Booked</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Keys Location</label>
                    <select
                      value={editUnit.keys_location || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, keys_location: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select location</option>
                      <option value="on_site">On Site</option>
                      <option value="with_dealer">With Dealer</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Keys Remarks</label>
                    <input
                      type="text"
                      value={editUnit.keys_remarks || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, keys_remarks: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Notes about keys location"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Information Section */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3">Owner Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Owner Name</label>
                    <input
                      type="text"
                      value={editUnit.owner_name || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, owner_name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Owner Phone</label>
                    <input
                      type="text"
                      value={editUnit.owner_phone || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, owner_phone: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                      maxLength="10"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600">Owner Email</label>
                    <input
                      type="email"
                      value={editUnit.owner_email || ''}
                      onChange={(e) => setEditUnit(prev => ({ ...prev, owner_email: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingUnitId(null);
                  setEditUnit(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUnit}
                disabled={editLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:opacity-60"
              >
                {editLoading ? 'Saving...' : 'Update Unit'}
              </button>
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
