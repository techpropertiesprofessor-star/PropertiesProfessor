import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { inventoryAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import AddInventoryForm from '../components/AddInventoryForm';
import InventoryCard from '../components/InventoryCard';
import useRealtimeData from '../hooks/useRealtimeData';
import { useSocket } from '../context/SocketContext';
import { FiX, FiHome, FiMapPin, FiLayers, FiMaximize, FiGrid, FiSun, FiUser, FiPhone, FiCalendar, FiFileText, FiEdit2, FiEye, FiDownload, FiKey, FiTruck, FiCheckCircle, FiDollarSign, FiMessageSquare } from 'react-icons/fi';

function InventoryPage() {
  const sidebarCollapsed = useSidebarCollapsed();
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
  const [hasSearched, setHasSearched] = useState(false);

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
        if (!filters[key]) return;
        // Normalize BHK filter: send digits or '5+' so backend matching is reliable
        if (key === 'bhk') {
          const raw = filters.bhk.toString();
          const digits = (raw.match(/(\d+)/) || [])[0];
          if (digits) {
            params.bhk = raw.includes('+') ? `${digits}+` : digits;
          } else {
            params.bhk = raw.replace(/\s+/g, '').toLowerCase();
          }
          return;
        }
        params[key] = filters[key];
      });
      // If the backend stores `bhk` in mixed string formats (e.g. '3bhk'),
      // some serverside filters may not match reliably. To ensure searches
      // always work, omit `bhk` when requesting from server and apply a
      // tolerant client-side filter afterwards.
      const bhkFilterForClient = params.bhk || null;
      if (bhkFilterForClient) delete params.bhk;

      const res = await inventoryAPI.getUnits(params);

      // normalize unit fields (support snake_case and camelCase from backend)
      const raw = Array.isArray(res.data) ? res.data : (res.data?.units || res.data || []);
      const normalize = (u) => ({
        _id: u._id || u.id || u._id,
        id: u._id || u.id,
        unit_number: u.unit_number || u.unitNumber || u.name || '',
        name: u.name || u.unit_number || u.unitNumber || '',
        location: u.location || u.address || '',
        bhk: u.bhk || (u.bhk && String(u.bhk)) || '',
        status: u.status || u.state || 'available',
        built_up_area: u.built_up_area || u.builtUpArea || u.carpet_area || '',
        super_area: u.super_area || u.superArea || '',
        base_price: u.base_price || u.basePrice || u.price || 0,
        final_price: u.final_price || u.finalPrice || u.price || 0,
        price_per_sqft: u.price_per_sqft || u.pricePerSqft || u.price_per_sqft || 0,
        parking_slots: u.parking_slots || u.parking || u.parkingSlots || 0,
        listing_type: u.listing_type || u.listingType || u.looking_to || '',
        keys_location: u.keys_location || u.keysLocation || '',
        furnished_status: u.furnished_status || u.furnishedStatus || '',
        owner_name: u.owner_name || (u.ownerDetails && u.ownerDetails.name) || '',
        owner_phone: u.owner_phone || (u.ownerDetails && u.ownerDetails.phone) || '',
        availability_date: u.availability_date || u.availabilityDate || '',
        remarks: u.remarks || u.keys_remarks || '',
        // Thumbnail: prefer media array (image) or photos field from backend
        thumbnail: (() => {
          try {
            if (Array.isArray(u.media) && u.media.length > 0) return buildMediaUrl(u.media[0].url || u.media[0].filename || u.media[0]);
            if (Array.isArray(u.photos) && u.photos.length > 0) return buildMediaUrl(u.photos[0].url || u.photos[0].filename || u.photos[0].name || u.photos[0]);
            if (u.thumbnail) return buildMediaUrl(u.thumbnail);
            if (u.cover_image) return buildMediaUrl(u.cover_image);
          } catch (e) { /* ignore */ }
          return null;
        })(),
        building_name: u.building_name || u.buildingName || u.tower || '',
        project_name: (u.project && (u.project.name || u.project.title)) || u.project_name || (u.project && u.projectId) || '',
        tower: u.tower || '',
        amenities: (function(){
          try{
            if (Array.isArray(u.amenities)) return u.amenities.map(a => typeof a === 'string' ? a : (a.name || a.title || JSON.stringify(a)));
            if (typeof u.amenities === 'string') return u.amenities.split(',').map(s => s.trim()).filter(Boolean);
            if (Array.isArray(u.features)) return u.features.map(a => typeof a === 'string' ? a : (a.name || a.title || JSON.stringify(a)));
            if (Array.isArray(u.facilities)) return u.facilities.map(a => typeof a === 'string' ? a : (a.name || a.title || JSON.stringify(a)));
          }catch(e){}
          return [];
        })(),
        raw: u
      });

      let normalized = raw.map(normalize);

      // Apply tolerant client-side BHK filtering if requested
      if (bhkFilterForClient) {
        const filterBhkRaw = bhkFilterForClient.toString().toLowerCase();
        const filterNum = (filterBhkRaw.match(/(\d+)/) || [])[0];
        normalized = normalized.filter((u) => {
          const unitBhkRaw = (u.bhk || '').toString().toLowerCase();
          const unitNum = (unitBhkRaw.match(/(\d+)/) || [])[0];
          if (filterNum) {
            const fN = Number(filterNum);
            if (filterBhkRaw.includes('+')) {
              const uN = unitNum ? Number(unitNum) : NaN;
              return !isNaN(uN) && uN >= fN;
            }
            if (unitNum) return Number(unitNum) === fN;
            return unitBhkRaw.includes(filterNum);
          }
          // fallback to substring match (normalize spaces/underscores)
          const norm = (s) => (s || '').toString().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
          return norm(unitBhkRaw).includes(norm(filterBhkRaw));
        });
      }

      setUnits(normalized);

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

  // Real-time: listen for unit updates and inventory creation via shared socket
  const { on, off } = useSocket() || {};

  useEffect(() => {
    if (!on || !off) return;
    const handleUnitUpdated = (payload) => {
      try {
        const unitId = payload && (payload.unitId || (payload.unit && (payload.unit._id || payload.unit.id)));
        const updatedUnit = payload.unit || payload;
        if (!unitId) return;
        setUnits((prev) => prev.map((u) =>
          (u._id || u.id) === unitId ? { ...u, ...updatedUnit, raw: updatedUnit } : u
        ));
        fetchStats();
      } catch (e) {
        console.error('Error applying unit-updated payload', e);
      }
    };
    on('unit-updated', handleUnitUpdated);
    return () => off('unit-updated', handleUnitUpdated);
  }, [on, off]);

  // Full refresh on inventory creation
  const refreshInventory = useCallback(() => {
    fetchUnits();
    fetchStats();
    fetchProjects();
  }, [fetchUnits]);
  useRealtimeData(['inventory-created'], refreshInventory);

  // Helpers
  const buildMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${api.defaults.baseURL || ''}/${url}`.replace(/([^:]\/\/)\//g, '$1');
  };

  const formatCurrency = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n) || isNaN(n)) return '-';
    return `₹${n.toLocaleString()}`;
  };

  const resolveListingKind = (u) => {
    const candidates = [
      u.listing_type,
      u.listingType,
      (u.raw && u.raw.listing_type),
      (u.raw && u.raw.listingType),
      u.looking_to,
      u.lookingTo,
      (u.raw && u.raw.looking_to),
      (u.raw && u.raw.lookingTo),
      u.transaction_type,
      (u.raw && u.raw.transaction_type),
    ];
    for (let c of candidates) {
      if (!c && typeof c !== 'number') continue;
      const s = String(c).toLowerCase();
      if (s.includes('rent')) return 'rent';
      if (s.includes('sale') || s.includes('sell')) return 'sale';
      if (s.includes('lease')) return 'rent';
    }
    return '';
  };

  const viewUnit = async (unitId) => {
    try {
      const res = await inventoryAPI.getUnit(unitId);
      const u = res.data || null;
      if (u) {
        const normalized = {
          _id: u._id || u.id,
          id: u._id || u.id,
          unit_number: u.unit_number || u.unitNumber || u.name || '',
          name: u.name || u.unit_number || u.unitNumber || '',
          location: u.location || u.address || '',
          bhk: u.bhk || '',
          status: u.status || 'available',
          built_up_area: u.built_up_area || u.builtUpArea || '',
          super_area: u.super_area || u.superArea || '',
          base_price: u.base_price || u.basePrice || 0,
          final_price: u.final_price || u.finalPrice || 0,
          price_per_sqft: u.price_per_sqft || u.pricePerSqft || 0,
          parking_slots: u.parking_slots || u.parking || 0,
          keys_location: u.keys_location || u.keysLocation || '',
          furnished_status: u.furnished_status || u.furnishedStatus || '',
          owner_name: u.owner_name || (u.ownerDetails && u.ownerDetails.name) || '',
          owner_phone: u.owner_phone || (u.ownerDetails && u.ownerDetails.phone) || '',
          availability_date: u.availability_date || u.availabilityDate || '',
          listing_type: u.listing_type || u.listingType || u.looking_to || '',
          remarks: u.remarks || u.keys_remarks || '',
          building_name: u.building_name || u.buildingName || u.tower || '',
          project_name: (u.project && (u.project.name || u.project.title)) || u.project_name || (u.project && u.projectId) || '',
          tower: u.tower || '',
          amenities: (function(){
            try{
              if (Array.isArray(u.amenities)) return u.amenities.map(a => typeof a === 'string' ? a : (a.name || a.title || JSON.stringify(a)));
              if (typeof u.amenities === 'string') return u.amenities.split(',').map(s => s.trim()).filter(Boolean);
              if (Array.isArray(u.features)) return u.features.map(a => typeof a === 'string' ? a : (a.name || a.title || JSON.stringify(a)));
              if (Array.isArray(u.facilities)) return u.facilities.map(a => typeof a === 'string' ? a : (a.name || a.title || JSON.stringify(a)));
            }catch(e){}
            return [];
          })(),
          tenant_name: u.tenant_name || u.raw?.tenant_name || u.tenantName || '',
          tenant_contact: u.tenant_contact || u.raw?.tenant_contact || u.tenantContact || '',
          tenant_start_date: u.tenant_start_date || u.raw?.tenant_start_date || u.tenantStartDate || '',
          tenant_end_date: u.tenant_end_date || u.raw?.tenant_end_date || u.tenantEndDate || '',
          raw: u
        };
        setSelectedUnit(normalized);
      } else {
        setSelectedUnit(null);
      }
      const mediaRes = await inventoryAPI.listUnitMedia(unitId);
      // backend may return { media: [] } or an array directly
      const mediaData = mediaRes?.data;
      setUnitMedia(Array.isArray(mediaData) ? mediaData : (mediaData?.media || []));
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
      // inventoryAPI.generatePDF returns a blob (responseType: 'blob')
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const id = selectedUnit.id || selectedUnit._id || 'unit';
      a.download = `unit_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke URL after short delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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
      // Basic client-side validation for tenant info when status is booked or sold
      const status = (editUnit.status || '').toString().toLowerCase();
      if (status === 'booked' || status === 'sold') {
        const name = (editUnit.tenant_name || '').toString().trim();
        const contact = (editUnit.tenant_contact || '').toString().trim();
        const start = (editUnit.tenant_start_date || '').toString().trim();
        const end = (editUnit.tenant_end_date || '').toString().trim();
        if (!name) {
          setEditError('Tenant Name is required when unit is Booked or Sold');
          setEditLoading(false);
          return;
        }
        if (!contact) {
          setEditError('Tenant Contact Number is required when unit is Booked or Sold');
          setEditLoading(false);
          return;
        }
        if (!start) {
          setEditError('Tenant Start Date is required when unit is Booked or Sold');
          setEditLoading(false);
          return;
        }
        if (status === 'booked' && !end) {
          setEditError('Tenant End Date is required when unit status is Booked');
          setEditLoading(false);
          return;
        }
      }

      // Safe payload: include tenant fields if present
      const payload = { ...editUnit };
      // Send update
      await inventoryAPI.updateUnit(editingUnitId, payload);
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
    setHasSearched(true);
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
    setHasSearched(false);
    setUnits([]);
  };

  // Client-side displayed units (real-time, case-insensitive filtering)
  const displayedUnits = units.filter((u) => {
    // start with true then apply filters
    try {
      const q = (filters.query || '').toString().trim().toLowerCase();

      if (q) {
        const fields = [
          (u.unit_number || u.name || '').toString().toLowerCase(),
          (u.owner_name || '').toString().toLowerCase(),
          (u.owner_phone || '').toString().toLowerCase(),
          (u.bhk || '').toString().toLowerCase(),
          ((u.raw && (u.raw.property_type || u.raw.propertyType)) || '').toString().toLowerCase()
        ];
        const matchesQuery = fields.some((f) => f && f.includes(q));
        if (!matchesQuery) return false;
      }

      if (filters.status && filters.status !== '' && (u.status || '').toString().toLowerCase() !== filters.status.toString().toLowerCase()) return false;
      if (filters.bhk && filters.bhk !== '') {
        const filterBhkRaw = filters.bhk.toString().toLowerCase();
        const unitBhkRaw = (u.bhk || '').toString().toLowerCase();
        const filterNum = (filterBhkRaw.match(/(\d+)/) || [])[0];
        const unitNum = (unitBhkRaw.match(/(\d+)/) || [])[0];

        if (filterNum) {
          const fN = Number(filterNum);
          if (filterBhkRaw.includes('+')) {
            // 5+ BHK means unitNum must be >=5
            const uN = unitNum ? Number(unitNum) : NaN;
            if (isNaN(uN) || uN < fN) return false;
          } else {
            // Exact numeric match when possible
            if (unitNum) {
              if (Number(unitNum) !== fN) return false;
            } else {
              // fallback: compare normalized strings
              if (!unitBhkRaw.includes(filterBhkRaw.replace(/\s+/g, ' ').trim()) && !unitBhkRaw.includes(filterNum)) return false;
            }
          }
        } else {
          // No number in filter — do a normalized substring match
          const norm = (s) => (s || '').toString().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
          if (!norm(unitBhkRaw).includes(norm(filterBhkRaw))) return false;
        }
      }
      if (filters.listing_type && filters.listing_type !== '' && ((u.listing_type || (u.raw && u.raw.listing_type)) || '').toString().toLowerCase() !== filters.listing_type.toString().toLowerCase()) return false;
      // Furnished matching: make 'furnished' match both 'furnished' and 'fully_furnished'
      const matchesFurnished = (filterVal, unitVal) => {
        const norm = (s) => (s || '').toString().toLowerCase().replace(/[_-]/g, ' ').trim();
        const f = norm(filterVal);
        const v = norm(unitVal);
        if (!f) return true;
        if (f === 'furnished') {
          return v === 'furnished' || v.includes('fully') || v === 'fully furnished' || v === 'fully_furnished';
        }
        if (f.includes('semi')) {
          return v.includes('semi');
        }
        if (f.includes('un')) {
          return v.includes('unfurn') || v === 'unfurnished';
        }
        return v === f;
      };

      if (filters.furnished_status && filters.furnished_status !== '' && !matchesFurnished(filters.furnished_status, u.furnished_status)) return false;
      if (filters.location && filters.location !== '' && !((u.location || '').toString().toLowerCase().includes(filters.location.toString().toLowerCase()))) return false;

      // numeric ranges
      const basePrice = Number(u.base_price || u.final_price || 0);
      if (filters.budget_min && Number(filters.budget_min) > 0 && basePrice < Number(filters.budget_min)) return false;
      if (filters.budget_max && Number(filters.budget_max) > 0 && basePrice > Number(filters.budget_max)) return false;

      const areaVal = Number(u.built_up_area || u.super_area || 0);
      if (filters.area_min && Number(filters.area_min) > 0 && areaVal < Number(filters.area_min)) return false;
      if (filters.area_max && Number(filters.area_max) > 0 && areaVal > Number(filters.area_max)) return false;

      return true;
    } catch (e) {
      return true;
    }
  });

  // Live stats computed from current units (either filtered or full list)
  const computeCounts = (arr) => {
    const res = {
      total_units: 0,
      for_sale: 0,
      for_rent: 0,
      available: 0,
      on_hold: 0,
      booked: 0,
      sold: 0,
      unspecified_listing: 0,
      unspecified_status: 0,
    };
    if (!Array.isArray(arr)) return res;
    res.total_units = arr.length;
    arr.forEach((u) => {
      const ltRaw = ((u.listing_type || (u.raw && u.raw.listing_type)) || '').toString();
      const lt = ltRaw.toLowerCase();
      let countedLt = false;
      if (lt.includes('sale') || lt.includes('sell') || lt === 'sell') { res.for_sale += 1; countedLt = true; }
      if (lt.includes('rent')) { res.for_rent += 1; countedLt = true; }
      if (!countedLt) res.unspecified_listing += 1;

      const stRaw = (u.status || u.state || '') || '';
      const st = stRaw.toString().toLowerCase();
      let countedSt = false;
      if (st.includes('available')) { res.available += 1; countedSt = true; }
      if (st.includes('hold') || st.includes('on hold')) { res.on_hold += 1; countedSt = true; }
      if (st.includes('book')) { res.booked += 1; countedSt = true; }
      if (st.includes('sold')) { res.sold += 1; countedSt = true; }
      if (!countedSt) res.unspecified_status += 1;
    });
    return res;
  };

  const liveStats = computeCounts(hasSearched ? displayedUnits : units);

  // Render UI (kept the original structure / classes)
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-teal-100">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
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

          {/* Stats Cards (live computed from current units) */}
          {(liveStats || stats) && (() => {
            const displayStats = liveStats || stats || {};
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-gray-500">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900">{displayStats.total_units || 0}</p>
                </div>
                <div className="bg-blue-50 rounded-lg shadow p-4">
                  <p className="text-sm text-blue-600">For Sale</p>
                  <p className="text-2xl font-bold text-blue-700">{displayStats.for_sale || 0}</p>
                </div>
                <div className="bg-orange-50 rounded-lg shadow p-4">
                  <p className="text-sm text-orange-600">For Rent</p>
                  <p className="text-2xl font-bold text-orange-700">{displayStats.for_rent || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600">Unspecified</p>
                  <p className="text-2xl font-bold text-gray-700">{displayStats.unspecified_listing || 0}</p>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-4">
                  <p className="text-sm text-green-600">Available</p>
                  <p className="text-2xl font-bold text-green-700">{displayStats.available || 0}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg shadow p-4">
                  <p className="text-sm text-yellow-600">On Hold</p>
                  <p className="text-2xl font-bold text-yellow-700">{displayStats.on_hold || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-lg shadow p-4">
                  <p className="text-sm text-purple-600">Booked</p>
                  <p className="text-2xl font-bold text-purple-700">{displayStats.booked || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600">Sold</p>
                  <p className="text-2xl font-bold text-gray-700">{displayStats.sold || 0}</p>
                </div>
              </div>
            );
          })()}

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
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={searchUnits} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">🔍 Search</button>
              <button onClick={resetFilters} className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Reset</button>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Searching...</div>
            ) : !hasSearched ? (
              <div className="p-8 text-center text-gray-500">Use filters and click Search to view inventory units.</div>
            ) : displayedUnits.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No units found matching filters.</div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedUnits.map((u) => (
                    <InventoryCard
                      key={u._id || u.id}
                      data={u}
                      user={user}
                      onView={() => viewUnit(u._id || u.id)}
                      onEdit={() => startEditUnit(u._id || u.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unit Detail Modal */}
          {selectedUnit && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
              <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl relative animate-fade-in">
                {/* Gradient Header Bar */}
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <FiHome className="text-white text-lg" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{selectedUnit.building_name || selectedUnit.project_name || 'Unit Details'}</h3>
                      <p className="text-blue-100 text-xs">{selectedUnit.bhk || 'Property'} {selectedUnit.unit_number ? `• Unit ${selectedUnit.unit_number}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const kind = resolveListingKind(selectedUnit || {});
                      if (kind === 'rent') return <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide">FOR RENT</span>;
                      if (kind === 'sale') return <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide">FOR SALE</span>;
                      const rawLabel = ((selectedUnit.raw && selectedUnit.raw.listing_type) || selectedUnit.listing_type || '').toString();
                      return rawLabel ? <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold tracking-wide">{rawLabel.toUpperCase()}</span> : null;
                    })()}
                    {selectedUnit.status && (() => {
                      const s = selectedUnit.status.toString().toLowerCase();
                      if (s.includes('sold')) return <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">SOLD</span>;
                      if (s.includes('book')) return <span className="px-3 py-1 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold">BOOKED</span>;
                      if (s.includes('hold')) return <span className="px-3 py-1 rounded-full bg-orange-400 text-white text-xs font-bold">ON HOLD</span>;
                      if (s.includes('available')) return <span className="px-3 py-1 rounded-full bg-emerald-400 text-white text-xs font-bold">AVAILABLE</span>;
                      return <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">{selectedUnit.status.toUpperCase()}</span>;
                    })()}
                    <button onClick={() => setSelectedUnit(null)} className="ml-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
                      <FiX className="text-white text-lg" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[calc(92vh-68px)]">
                  <div className="flex flex-col lg:flex-row">
                    {/* Left: Image Gallery */}
                    <div className="lg:w-1/2 p-5">
                      <div className="rounded-xl overflow-hidden bg-gray-100 aspect-video shadow-inner">
                        {unitMedia && unitMedia.length > 0 && unitMedia[0].media_type === 'image' ? (
                          <img src={buildMediaUrl(unitMedia[0].url)} alt={unitMedia[0].caption || ''} className="w-full h-full object-cover" />
                        ) : unitMedia && unitMedia.length > 0 && unitMedia[0].media_type !== 'image' ? (
                          <video controls className="w-full h-full object-cover">
                            <source src={buildMediaUrl(unitMedia[0].url)} />
                          </video>
                        ) : selectedUnit.thumbnail ? (
                          <img src={selectedUnit.thumbnail} alt={selectedUnit.name || ''} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <FiHome className="text-4xl mb-2" />
                            <span className="text-sm">No image available</span>
                          </div>
                        )}
                      </div>
                      {/* Thumbnail Grid */}
                      {unitMedia.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {unitMedia.map((m) => (
                            <div key={m.id} className="aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-blue-400 cursor-pointer transition-all shadow-sm">
                              {m.media_type === 'image' ? (
                                <img src={buildMediaUrl(m.url)} alt={m.caption || ''} className="w-full h-full object-cover" />
                              ) : (
                                <video className="w-full h-full object-cover">
                                  <source src={buildMediaUrl(m.url)} />
                                </video>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Price Card */}
                      <div className="mt-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 text-emerald-700 mb-1">
                          <FiDollarSign className="text-lg" />
                          <span className="text-sm font-semibold">Price</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(selectedUnit.base_price || selectedUnit.final_price)}</div>
                        {selectedUnit.price_per_sqft && (
                          <div className="text-xs text-gray-500 mt-1">₹{selectedUnit.price_per_sqft}/sqft</div>
                        )}
                      </div>
                    </div>

                    {/* Right: Details */}
                    <div className="lg:w-1/2 p-5 lg:border-l border-gray-100">
                      {/* Property Info Grid */}
                      <div className="mb-5">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FiFileText className="text-blue-500" /> Property Information
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: <FiHome className="text-blue-500" />, label: 'Property Type', value: selectedUnit.bhk },
                            { icon: <FiLayers className="text-purple-500" />, label: 'Floor', value: selectedUnit.floor_number ? `${selectedUnit.floor_number}${selectedUnit.total_floors ? ` / ${selectedUnit.total_floors}` : ''}` : null },
                            { icon: <FiMapPin className="text-red-500" />, label: 'Building', value: selectedUnit.building_name || selectedUnit.project_name },
                            { icon: <FiMaximize className="text-teal-500" />, label: 'Area', value: selectedUnit.area || selectedUnit.carpet_area ? `${selectedUnit.area || selectedUnit.carpet_area} sqft` : null },
                            { icon: <FiMaximize className="text-indigo-500" />, label: 'Super Area', value: selectedUnit.super_area ? `${selectedUnit.super_area} sqft` : null },
                            { icon: <FiMaximize className="text-cyan-500" />, label: 'Built-up Area', value: selectedUnit.built_up_area ? `${selectedUnit.built_up_area} sqft` : null },
                            { icon: <FiSun className="text-yellow-500" />, label: 'Facing', value: selectedUnit.facing },
                            { icon: <FiGrid className="text-green-500" />, label: 'Furnished', value: selectedUnit.furnished_status },
                            { icon: <FiTruck className="text-gray-500" />, label: 'Parking', value: selectedUnit.parking_slots },
                            { icon: <FiCalendar className="text-orange-500" />, label: 'Available', value: selectedUnit.availability_date ? new Date(selectedUnit.availability_date).toLocaleDateString() : null },
                          ].filter(item => item.value).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="mt-0.5">{item.icon}</div>
                              <div>
                                <div className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide">{item.label}</div>
                                <div className="text-sm font-medium text-gray-800">{item.value}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Owner Information */}
                      {(selectedUnit.owner_name || selectedUnit.owner_phone) && (
                        <div className="mb-5">
                          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiUser className="text-blue-500" /> Owner Information
                          </h4>
                          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                            {selectedUnit.owner_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <FiUser className="text-blue-600" />
                                <span className="text-gray-800 font-medium">{selectedUnit.owner_name}</span>
                              </div>
                            )}
                            {selectedUnit.owner_phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <FiPhone className="text-blue-600" />
                                <span className="text-gray-800">{selectedUnit.owner_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Remarks */}
                      {selectedUnit.remarks && (
                        <div className="mb-5">
                          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FiMessageSquare className="text-blue-500" /> Remarks
                          </h4>
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">{selectedUnit.remarks}</p>
                        </div>
                      )}

                      {/* Amenities */}
                      {selectedUnit.amenities && selectedUnit.amenities.length > 0 && (
                        <div className="mb-5">
                          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiCheckCircle className="text-blue-500" /> Amenities
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedUnit.amenities.map((a, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100">
                                <FiCheckCircle className="text-blue-400 text-[10px]" /> {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tenant Information */}
                      {(selectedUnit.tenant_name || selectedUnit.tenant_contact) && (
                        <div className="mb-5">
                          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FiKey className="text-blue-500" /> Tenant Information
                          </h4>
                          <div className="bg-amber-50 rounded-xl p-4 space-y-2 border border-amber-100">
                            {selectedUnit.tenant_name && (
                              <div className="flex items-center gap-2 text-sm">
                                <FiUser className="text-amber-600" />
                                <span className="text-gray-800 font-medium">{selectedUnit.tenant_name}</span>
                              </div>
                            )}
                            {selectedUnit.tenant_contact && (
                              <div className="flex items-center gap-2 text-sm">
                                <FiPhone className="text-amber-600" />
                                <span className="text-gray-800">{selectedUnit.tenant_contact}</span>
                              </div>
                            )}
                            {(selectedUnit.tenant_start_date || selectedUnit.tenant_end_date) && (
                              <div className="flex items-center gap-2 text-sm">
                                <FiCalendar className="text-amber-600" />
                                <span className="text-gray-800">
                                  {selectedUnit.tenant_start_date ? new Date(selectedUnit.tenant_start_date).toLocaleDateString() : '—'}
                                  {' → '}
                                  {selectedUnit.tenant_end_date ? new Date(selectedUnit.tenant_end_date).toLocaleDateString() : '—'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-center gap-3">
                    <button onClick={() => viewUnit(selectedUnit.id || selectedUnit._id)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-0.5">
                      <FiEye /> View
                    </button>
                    <button onClick={() => startEditUnit(selectedUnit.id || selectedUnit._id)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:-translate-y-0.5">
                      <FiEdit2 /> Edit
                    </button>
                    <button onClick={handleGeneratePDF} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:-translate-y-0.5">
                      <FiDownload /> Generate PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fixed footer action buttons for selected unit removed — actions are inside details column now */}

          {/* Create Inventory Modal */}
          {createModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
              <div className="bg-white rounded-lg p-0 w-full max-w-2xl mx-4 sm:mx-0 max-h-[95vh] overflow-y-auto">
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

                        // Create unit with JSON payload
                        const res = await inventoryAPI.createUnit(payload);
                        const unitId = res.data?._id || res.data?.id || res.data?.id;

                        // If photos were provided, upload them separately to the media endpoint
                        if (unitId && form.photos && form.photos.length > 0) {
                          try {
                            const mediaForm = new FormData();
                            form.photos.forEach((file) => mediaForm.append('files', file));
                            await inventoryAPI.uploadUnitMedia(unitId, mediaForm);
                          } catch (mediaErr) {
                            console.warn('Failed to upload photos after unit creation', mediaErr);
                          }
                        }

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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
              <div className="bg-white rounded-lg p-5 w-full max-w-3xl mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
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
                        <select
                          value={editUnit.status || 'available'}
                          onChange={(e) => {
                            const v = (e.target.value || '').toString().toLowerCase();
                            setEditUnit((p) => {
                              const next = { ...p, status: e.target.value };
                              // If status set back to available, clear tenant fields
                              if (v === 'available') {
                                next.tenant_name = '';
                                next.tenant_contact = '';
                                next.tenant_start_date = '';
                                next.tenant_end_date = '';
                              }
                              return next;
                            });
                          }}
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

                  {/* Tenant Information: show when status is booked or sold */}
                  {((editUnit.status || '').toString().toLowerCase() === 'booked' || (editUnit.status || '').toString().toLowerCase() === 'sold') && (
                    <div className="border-b pb-4">
                      <h3 className="font-semibold mb-3">Tenant Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Tenant Name *</label>
                          <input type="text" value={editUnit.tenant_name || ''} onChange={(e) => setEditUnit((p) => ({ ...p, tenant_name: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600">Contact Number *</label>
                          <input type="text" value={editUnit.tenant_contact || ''} onChange={(e) => setEditUnit((p) => ({ ...p, tenant_contact: e.target.value }))} className="w-full px-3 py-2 border rounded-md" maxLength="15" />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600">Start Date *</label>
                          <input type="date" value={editUnit.tenant_start_date ? editUnit.tenant_start_date.split('T')[0] : ''} onChange={(e) => setEditUnit((p) => ({ ...p, tenant_start_date: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-600">End Date {((editUnit.status || '').toString().toLowerCase() === 'booked') ? '*' : ''}</label>
                          <input type="date" value={editUnit.tenant_end_date ? editUnit.tenant_end_date.split('T')[0] : ''} onChange={(e) => setEditUnit((p) => ({ ...p, tenant_end_date: e.target.value }))} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                      </div>
                    </div>
                  )}

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
