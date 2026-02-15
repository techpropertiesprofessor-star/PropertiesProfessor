import React from 'react';
import { FiMapPin, FiHome, FiLayers, FiMaximize, FiGrid, FiSun, FiUser, FiPhone, FiCalendar, FiMessageSquare, FiEye, FiEdit2, FiTag } from 'react-icons/fi';

function resolveListingType(d) {
  if (!d) return '';
  const candidates = [
    d.listing_type,
    d.listingType,
    (d.raw && d.raw.listing_type),
    (d.raw && d.raw.listingType),
    d.looking_to,
    d.lookingTo,
    (d.raw && d.raw.looking_to),
    (d.raw && d.raw.lookingTo),
    d.transaction_type,
    (d.raw && d.raw.transaction_type),
  ];
  for (let c of candidates) {
    if (!c && typeof c !== 'number') continue;
    const s = String(c).toLowerCase();
    if (s.includes('rent')) return 'rent';
    if (s.includes('sale') || s.includes('sell')) return 'sale';
    if (s.includes('lease')) return 'rent';
  }
  return '';
}

function InfoChip({ icon: Icon, label, value }) {
  if (!value || value === '-' || value === '0') return null;
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
      <Icon size={13} className="text-indigo-500 flex-shrink-0" />
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 ml-auto">{value}</span>
    </div>
  );
}

export default function InventoryCard({data, onView, onEdit, user}){
  const d = data || {};
  const price = d.base_price || d.final_price || 0;
  const perSq = d.price_per_sqft || d.pricePerSqft || null;
  const listingKind = resolveListingType(d);
  const listingLabel = listingKind === 'rent' ? 'FOR RENT' : (listingKind === 'sale' ? 'FOR SALE' : ((d.listing_type || (d.raw && d.raw.listing_type) || '').toString() || '').toUpperCase());

  // status color mapping
  const statusRaw = (d.status || '').toString().toLowerCase();
  const statusBadge = (() => {
    if (statusRaw.includes('sold')) return { label: 'SOLD', bg: 'bg-red-500', text: 'text-white', dot: 'bg-red-300' };
    if (statusRaw.includes('book')) return { label: 'BOOKED', bg: 'bg-amber-500', text: 'text-white', dot: 'bg-amber-300' };
    if (statusRaw.includes('hold') || statusRaw.includes('on hold')) return { label: 'ON HOLD', bg: 'bg-orange-500', text: 'text-white', dot: 'bg-orange-300' };
    if (statusRaw.includes('available')) return { label: 'AVAILABLE', bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-300' };
    return null;
  })();

  const bhk = d.bhk || d.bhk_type || '-';
  const floorInfo = d.floor_number || d.floor || '-';
  const totalFloors = d.total_floors || null;

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col border border-gray-100 hover:border-indigo-200 hover:-translate-y-1">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        {d.thumbnail ? (
          <img src={d.thumbnail} alt={d.name || d.unit_number || 'Unit'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center">
            <FiHome size={40} className="text-indigo-200" />
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {listingLabel && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full bg-indigo-600 text-white shadow-lg backdrop-blur-sm uppercase tracking-wider">
              <FiTag size={10} />{listingLabel}
            </span>
          )}
          {statusBadge && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full ${statusBadge.bg} ${statusBadge.text} shadow-lg backdrop-blur-sm`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} animate-pulse`}></span>
              {statusBadge.label}
            </span>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white text-xl font-extrabold drop-shadow-lg">₹{price.toLocaleString('en-IN')}</p>
              {perSq && <p className="text-white/80 text-xs drop-shadow">₹{perSq}/sqft</p>}
            </div>
            {bhk && bhk !== '-' && (
              <span className="bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full shadow">{bhk}</span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Title & Location */}
        <div className="mb-3">
          <h4 className="font-bold text-gray-900 text-base leading-tight line-clamp-1">{d.unit_number || d.name || 'Unit'}</h4>
          {d.location && d.location !== '-' && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <FiMapPin size={11} className="text-red-400 flex-shrink-0" />
              <span className="line-clamp-1">{d.location}</span>
            </p>
          )}
        </div>

        {/* Property Info Chips */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <InfoChip icon={FiLayers} label="Floor" value={totalFloors ? `${floorInfo}/${totalFloors}` : floorInfo} />
          <InfoChip icon={FiMaximize} label="Area" value={d.super_area || d.superArea ? `${d.super_area || d.superArea} sqft` : (d.built_up_area || d.builtUpArea ? `${d.built_up_area || d.builtUpArea} sqft` : null)} />
          <InfoChip icon={FiGrid} label="Parking" value={d.parking_slots || d.parking || null} />
          <InfoChip icon={FiSun} label="Facing" value={d.facing && d.facing !== '-' ? d.facing : null} />
        </div>

        {/* Furnished Status */}
        {(d.furnished_status || d.furnishedStatus) && (d.furnished_status || d.furnishedStatus) !== '-' && (
          <div className="mb-3">
            <span className="inline-flex items-center text-xs text-gray-600 bg-blue-50 rounded-full px-2.5 py-1 font-medium">
              🛋️ {(d.furnished_status || d.furnishedStatus).replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 my-2" />

        {/* Owner Info */}
        <div className="space-y-1.5 mb-4">
          {d.owner_name && d.owner_name !== '-' && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <FiUser size={12} className="text-gray-400" />
              <span className="font-medium text-gray-800">{d.owner_name}</span>
            </div>
          )}
          {d.owner_phone && d.owner_phone !== '-' && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <FiPhone size={12} className="text-gray-400" />
              <span>{d.owner_phone}</span>
            </div>
          )}
          {d.availability_date && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <FiCalendar size={12} className="text-gray-400" />
              <span>{new Date(d.availability_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
          {d.remarks && d.remarks !== '-' && (
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <FiMessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2 italic">{d.remarks}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2">
          <button 
            onClick={onView} 
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            <FiEye size={14} />View
          </button>
          {user && (
            <button 
              onClick={onEdit} 
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <FiEdit2 size={14} />Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
