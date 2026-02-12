import React from 'react';

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

function Field({label, value}){
  return (
    <div className="text-xs text-gray-600">
      <strong className="text-gray-800">{label}:</strong> <span className="ml-1">{value || '-'}</span>
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
    if (statusRaw.includes('sold')) return { label: 'SOLD', className: 'bg-red-600 text-white' };
    if (statusRaw.includes('book')) return { label: 'BOOKED', className: 'bg-yellow-400 text-black' };
    if (statusRaw.includes('hold') || statusRaw.includes('on hold')) return { label: 'ON HOLD', className: 'bg-green-600 text-white' };
    if (statusRaw.includes('available')) return { label: 'AVAILABLE', className: 'bg-green-50 text-gray-800' };
    return null;
  })();

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm flex flex-col">
      <div className="relative">
        {d.thumbnail ? (
          <img src={d.thumbnail} alt={d.name || d.unit_number || 'Unit image'} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">-</div>
        )}
        {listingLabel && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">{listingLabel}</div>
        )}
        {statusBadge && (
          <div className={`absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded ${statusBadge.className}`}>
            {statusBadge.label}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-lg">{d.unit_number || d.name || 'Unit'}</h4>
          <p className="text-sm text-gray-500 mb-2">{d.location || '-'}</p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Property Type" value={d.bhk} />
            <Field label="Floor" value={d.floor_number || d.floor || '-'} />
            <Field label="Area" value={d.area || d.carpet_area || d.carpetArea || '-'} />
            <Field label="Super Area" value={d.super_area || d.superArea || '-'} />
            <Field label="Built-up" value={d.built_up_area || d.builtUpArea || '-'} />
            <Field label="Parking" value={d.parking_slots || d.parking || 0} />
            <Field label="Facing" value={d.facing || '-'} />
            <Field label="Furnished" value={d.furnished_status || d.furnishedStatus || '-'} />
          </div>

          <div className="mt-3">
            <div className="text-sm text-gray-700 font-semibold">Price: <span className="text-gray-900">₹{price.toLocaleString()}</span> {perSq ? (<span className="text-xs text-gray-500"> • ₹{perSq}/sqft</span>) : null}</div>
            <div className="mt-1 text-sm text-gray-600">Status: <span className="font-semibold text-gray-800">{(d.status || '-').toString().toUpperCase()}</span></div>
          </div>

          <div className="mt-3 text-sm text-gray-600 space-y-1">
            <div><strong className="text-gray-800">Owner:</strong> {d.owner_name || '-'}</div>
            <div><strong className="text-gray-800">Phone:</strong> {d.owner_phone || '-'}</div>
            <div><strong className="text-gray-800">Available:</strong> {d.availability_date ? new Date(d.availability_date).toLocaleDateString() : '-'}</div>
            <div><strong className="text-gray-800">Remarks:</strong> {d.remarks || '-'}</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onView} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded">View</button>
            {user && (
              <button onClick={onEdit} className="flex-1 px-3 py-2 bg-green-600 text-white rounded">Edit</button>
            )}
        </div>
      </div>
    </div>
  );
}
