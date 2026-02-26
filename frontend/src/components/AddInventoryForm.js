import React, { useState } from 'react';

// Helper: Radio group
// Helper: Card group (for property type options)
function CardGroup({ label, name, options, value, onChange, required }) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map(opt => (
          <label key={opt.value} className={`cursor-pointer flex flex-col items-center px-4 py-3 rounded-xl border text-center shadow-sm transition font-medium text-sm ${value === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
            onClick={() => onChange(opt.value)}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="hidden"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// Helper: Button group (for bathrooms, balconies, parking, etc.)
function ButtonGroup({ label, name, options, value, onChange, required }) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`px-4 py-2 rounded-lg border font-semibold text-sm ${value === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Helper: Toggle group (for multi-select chips)
function ToggleGroup({ label, name, options, value, onChange, required }) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`px-4 py-2 rounded-full border font-semibold text-sm ${value.includes(opt.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
            onClick={() => {
              if (value.includes(opt.value)) {
                onChange(value.filter(v => v !== opt.value));
              } else {
                onChange([...value, opt.value]);
              }
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
function RadioGroup({ label, name, options, value, onChange, required }) {
  return (
    <div className="mb-4">
      <label className="block font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-3">
        {options.map(opt => (
          <label key={opt.value} className={`cursor-pointer px-4 py-2 rounded-lg border ${value === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700'} transition`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="hidden"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

// Icon components for commercial property types
const CommercialIcons = {
  office: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
  retail_shop: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18l-2 13H5L3 3zm0 0l-1 1m19-1l1 1M5 16v5h14v-5M9 21v-3h6v3" /></svg>),
  showroom: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
  warehouse: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>),
  plot: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>),
  others: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
};

// Amenity icons for commercial
const AmenityIcons = {
  cctv: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>),
  power_backup: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>),
  furnishing: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
  ups: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>),
  central_ac: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>),
  oxygen_duct: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>),
  internet: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" /></svg>),
  vastu: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>),
  fire_extinguishers: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>),
  fire_sensors: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
  security: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>),
  water_storage: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>),
  dg_availability: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>),
  cafeteria: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>),
  reception: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>),
  pantry: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>),
  fire_noc: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>),
  occupancy_cert: () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>),
};

// SECTION 1: Basic Property Details
export default function AddInventoryForm({ onSubmit, loading = false }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    // Section 1
    propertyType: '',
    lookingTo: '',
    city: '',
    buildingName: '',
    unitNumber: '',
    // Section 2 (Residential)
    configType: '',
    bhk: '',
    builtUpArea: '',
    superArea: '',
    age: '',
    floorNumber: '',
    totalFloors: '',
    bathrooms: '',
    balconies: '',
    parking: '',
    facing: '',
    furnishType: '',
    maintenanceCharges: '',
    amenities: [],
    showAmenities: false,
    keysLocation: '',
    keysRemarks: '',
    availabilityDate: '',
    ownerDetails: {
      name: '',
      phone: '',
      email: ''
    },
    // Section 3 (Residential)
    addressLine1: '',
    addressLine2: '',
    pincode: '',
    landmark: '',
    state: '',
    // Section 4 (Residential)
    basePrice: '',
    finalPrice: '',
    pricePerSqft: '',
    // Section 5
    photos: [],
    // Section 6 (review is just display)
    // --- Commercial-specific fields ---
    commercialBuilding: '',
    commercialLocality: '',
    possessionStatus: '',
    zoneType: '',
    locationHub: '',
    propertyCondition: '',
    commercialBuiltUpArea: '',
    ownership: '',
    commercialPrice: '',
    negotiable: '',
    taxGovtIncluded: '',
    dgUpsIncluded: '',
    commercialTotalFloors: '',
    yourFloor: '',
    numberOfStaircase: '',
    passengerLifts: '',
    serviceLifts: '',
    privateParking: '',
    publicParking: '',
    isPreLeased: '',
    commercialAmenities: [],
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  // Validation for each step
  function validate(currentStep = step) {
    const e = {};
    const commercial = form.propertyType === 'commercial';
    if (currentStep === 1) {
      if (!form.propertyType) e.propertyType = 'Property type is required.';
      if (!form.lookingTo) e.lookingTo = 'Please select an option.';
      if (!form.city) e.city = 'City is required.';
      if (commercial) {
        if (!form.configType) e.configType = 'Select commercial property type.';
      } else {
        if (!form.buildingName) e.buildingName = 'Building/Society name is required.';
        if (!form.unitNumber || !form.unitNumber.trim()) e.unitNumber = 'Unit number is required.';
      }
    }
    if (currentStep === 2) {
      if (commercial) {
        if (!form.commercialLocality) e.commercialLocality = 'Please select a valid locality.';
        if (!form.possessionStatus) e.possessionStatus = 'Possession status is required.';
        if (!form.zoneType) e.zoneType = 'Zone type is required.';
        if (!form.locationHub) e.locationHub = 'Location hub is required.';
        if (!form.propertyCondition) e.propertyCondition = 'Property condition is required.';
        if (!form.commercialBuiltUpArea || isNaN(form.commercialBuiltUpArea) || Number(form.commercialBuiltUpArea) <= 0) e.commercialBuiltUpArea = 'Built up area is required.';
        if (!form.ownership) e.ownership = 'Ownership type is required.';
      } else {
        if (!form.configType) e.configType = 'Select property configuration.';
        if (!form.builtUpArea || isNaN(form.builtUpArea) || Number(form.builtUpArea) <= 0) e.builtUpArea = 'Built Up Area is required.';
        if (!form.age || isNaN(form.age) || form.age < 0 || form.age > 99) e.age = 'Age must be 0–99.';
        if (!form.bathrooms) e.bathrooms = 'Select bathroom count.';
        if (form.balconies === '') e.balconies = 'Select balcony count.';
        if (!form.furnishType) e.furnishType = 'Select furnish type.';
        
        // Owner Details validation
        if (!form.ownerDetails.name) {
          e.ownerName = 'Owner name is required.';
        } else if (form.ownerDetails.name.trim().length < 3) {
          e.ownerName = 'Owner name must be at least 3 characters.';
        } else if (!/^[a-zA-Z\s]+$/.test(form.ownerDetails.name)) {
          e.ownerName = 'Owner name can only contain letters and spaces.';
        }
        
        if (!form.ownerDetails.phone) {
          e.ownerPhone = 'Phone number is required.';
        } else if (!/^[0-9]{10}$/.test(form.ownerDetails.phone)) {
          e.ownerPhone = 'Phone number must be exactly 10 digits.';
        }
        
        if (form.ownerDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerDetails.email)) {
          e.ownerEmail = 'Please enter a valid email address.';
        }
      }
    }
    if (currentStep === 3) {
      if (commercial) {
        if (!form.commercialPrice || isNaN(form.commercialPrice) || Number(form.commercialPrice) <= 0) e.commercialPrice = 'Price is required.';
        if (!form.commercialTotalFloors) e.commercialTotalFloors = 'Total floors is required.';
        if (!form.yourFloor) e.yourFloor = 'Your floor is required.';
        if (!form.passengerLifts) e.passengerLifts = 'Passenger lifts is required.';
        if (!form.serviceLifts) e.serviceLifts = 'Service lifts is required.';
        if (!form.isPreLeased) e.isPreLeased = 'Please select an option.';
      } else {
        if (!form.addressLine1) e.addressLine1 = 'Address Line 1 is required.';
        if (!form.pincode || !/^\d{6}$/.test(form.pincode)) e.pincode = 'Valid 6-digit pincode required.';
        if (!form.state) e.state = 'State is required.';
      }
    }
    if (currentStep === 4) {
      if (commercial) {
        // Amenities are optional
      } else {
      if (!form.basePrice || isNaN(form.basePrice) || Number(form.basePrice) <= 0) e.basePrice = 'Base price required.';
      if (!form.finalPrice || isNaN(form.finalPrice) || Number(form.finalPrice) <= 0) e.finalPrice = 'Final price required.';
      // pricePerSqft is auto-calculated, no validation needed
      }
    }
    if (currentStep === 5) {
      // Photos are optional — user can upload later from detail modal
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field, value) {
    setForm(f => {
      const updated = { ...f, [field]: value };
      // Auto-calculate Price per Sq.ft when finalPrice or builtUpArea changes (residential)
      if (field === 'finalPrice' || field === 'builtUpArea') {
        const price = parseFloat(field === 'finalPrice' ? value : updated.finalPrice);
        const area = parseFloat(field === 'builtUpArea' ? value : updated.builtUpArea);
        if (price > 0 && area > 0) {
          updated.pricePerSqft = Math.round(price / area);
        }
      }
      // Auto-calculate for commercial properties
      if (field === 'commercialPrice' || field === 'commercialBuiltUpArea') {
        const price = parseFloat(field === 'commercialPrice' ? value : updated.commercialPrice);
        const area = parseFloat(field === 'commercialBuiltUpArea' ? value : updated.commercialBuiltUpArea);
        if (price > 0 && area > 0) {
          updated.commercialPricePerSqft = Math.round(price / area);
        }
      }
      return updated;
    });
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function handleOwnerDetailsChange(field, value) {
    setForm(f => ({
      ...f,
      ownerDetails: { ...f.ownerDetails, [field]: value }
    }));
    setErrors(e => ({ ...e, [`owner${field.charAt(0).toUpperCase()}${field.slice(1)}`]: undefined }));
  }

  function handleNext(e) {
    e.preventDefault();
    if (validate(step)) {
      setStep(s => s + 1);
    }
  }

  function handleBack(e) {
    e.preventDefault();
    setStep(s => s - 1);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting || loading) return; // Prevent double submission
    if (validate(step)) {
      // Normalize some fields before submitting
      const normalized = { ...form };
      // Normalize lookingTo/sale value: map 'sell' to 'sale' for consistency
      if (normalized.lookingTo && normalized.lookingTo.toString().toLowerCase() === 'sell') {
        normalized.lookingTo = 'sale';
      }
      // Also set listing_type for backend compatibility
      normalized.listing_type = normalized.listing_type || normalized.lookingTo || '';

      setSubmitting(true);
      Promise.resolve(onSubmit(normalized)).finally(() => setSubmitting(false));
    }
  }

  return (
    <form className="space-y-0 bg-gradient-to-b from-slate-50 via-white to-blue-50/30 rounded-2xl shadow-2xl border border-blue-200/60 p-0 sm:p-0 relative overflow-hidden">
      {/* Form header with gradient and icon */}
      <div className="relative flex flex-col items-center justify-center py-6 px-4 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-t-2xl shadow-lg">
        <button
          type="button"
          aria-label="Close"
          onClick={() => typeof window !== 'undefined' && window.history.back()}
          className="absolute right-3 top-3 text-white/70 hover:text-white text-2xl font-bold focus:outline-none transition-colors"
        >
          ×
        </button>
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 shadow-lg border border-white/30">
          <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' /></svg>
        </div>
        <h1 className="text-xl font-extrabold text-white tracking-tight mb-1">Add Property Details</h1>
        <p className="text-blue-100 text-sm">Please fill all required fields to add a new property.</p>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400"></div>
      </div>

      {/* Step Progress Bar */}
      <div className="px-4 sm:px-8 pt-6 pb-2 bg-white">
        {/* Progress percentage */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Step {step} of 6</span>
          <span className="text-xs font-bold text-blue-600">{Math.round((step / 6) * 100)}% Complete</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${(step / 6) * 100}%` }}></div>
        </div>

        {/* Stepper icons */}
        <div className="flex items-center justify-between mb-4">
          {[1,2,3,4,5,6].map((n, idx) => {
            const residentialLabels = ['Basic Details','Configuration','Address','Pricing','Photos & Videos','Review'];
            const commercialLabels = ['Basic Details','Property Details','Financials & Details','Amenities','Photos & Videos','Review'];
            const labels = form.propertyType === 'commercial' ? commercialLabels : residentialLabels;
            const isCompleted = step > n;
            const isActive = step === n;
            return (
            <React.Fragment key={n}>
              <div className="flex flex-col items-center gap-1.5 min-w-0">
                <div className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-sm transition-all duration-300 ${
                  isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100 scale-110' :
                  isCompleted ? 'bg-emerald-500 text-white shadow-md' :
                  'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}>
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : n}
                </div>
                <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight transition-colors ${
                  isActive ? 'text-blue-700' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
                }`}>
                  {labels[idx]}
                </span>
              </div>
              {n < 6 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* SECTION 1 */}
      {step === 1 && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">1</span>
            Basic Details
          </h2>
          <RadioGroup
            label="Property Type"
            name="propertyType"
            required
            value={form.propertyType}
            onChange={v => handleChange('propertyType', v)}
            options={[
              { label: 'Residential', value: 'residential' },
              { label: 'Commercial', value: 'commercial' },
            ]}
          />
          {errors.propertyType && <div className="text-red-500 text-xs mb-2">{errors.propertyType}</div>}
          <RadioGroup
            label="Looking to"
            name="lookingTo"
            required
            value={form.lookingTo}
            onChange={v => handleChange('lookingTo', v)}
            options={
              form.propertyType === 'commercial'
                ? [
                    { label: 'Rent', value: 'rent' },
                    { label: 'Sale', value: 'sale' },
                  ]
                : [
                    { label: 'Rent', value: 'rent' },
                    { label: 'Sale', value: 'sale' },
                    { label: 'PG/Co-living', value: 'pg' },
                  ]
            }
          />
          {errors.lookingTo && <div className="text-red-500 text-xs mb-2">{errors.lookingTo}</div>}
          <div className="mb-4">
            <label className="block font-medium mb-1">Search City <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={form.city}
              onChange={e => handleChange('city', e.target.value)}
              placeholder="Enter city"
            />
            {errors.city && <div className="text-red-500 text-xs mt-1">{errors.city}</div>}
          </div>

          {/* Commercial: Show property sub-type selector on Basic Details page */}
          {form.propertyType === 'commercial' && (
            <>
              <div className="mb-6">
                <label className="block font-medium mb-2">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: 'Office', value: 'office', Icon: CommercialIcons.office },
                    { label: 'Retail Shop', value: 'retail_shop', Icon: CommercialIcons.retail_shop },
                    { label: 'Showroom', value: 'showroom', Icon: CommercialIcons.showroom },
                    { label: 'Warehouse', value: 'warehouse', Icon: CommercialIcons.warehouse },
                    { label: 'Plot', value: 'plot', Icon: CommercialIcons.plot },
                    { label: 'Others', value: 'others', Icon: CommercialIcons.others },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex flex-col items-center justify-center px-3 py-4 rounded-xl border-2 transition font-medium text-xs gap-2 ${form.configType === opt.value ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}
                      onClick={() => handleChange('configType', opt.value)}
                    >
                      <opt.Icon />
                      {opt.label}
                    </button>
                  ))}
                </div>
                {errors.configType && <div className="text-red-500 text-xs mt-1">{errors.configType}</div>}
              </div>
            </>
          )}

          {/* Residential: Show building and unit fields */}
          {form.propertyType !== 'commercial' && (
            <>
              <div className="mb-4">
                <label className="block font-medium mb-1">Building / Apartment / Society Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={form.buildingName}
                  onChange={e => handleChange('buildingName', e.target.value)}
                  placeholder="Enter name"
                />
                {errors.buildingName && <div className="text-red-500 text-xs mt-1">{errors.buildingName}</div>}
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Unit Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={form.unitNumber}
                  onChange={e => handleChange('unitNumber', e.target.value)}
                  placeholder="Enter unit number (e.g. A-101)"
                />
                {errors.unitNumber && <div className="text-red-500 text-xs mt-1">{errors.unitNumber}</div>}
              </div>
            </>
          )}
        </div>
      )}

      {/* SECTION 2: Property Configuration (Residential) / Property Details (Commercial) */}
      {step === 2 && form.propertyType === 'commercial' && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">2</span>
            Property Details
          </h2>

          {/* Building/Project/Society */}
          <div className="mb-4">
            <label className="block font-medium mb-1 text-gray-500">Building/Project/Society (Optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border-b border-gray-300 bg-transparent focus:border-blue-500 outline-none"
              value={form.commercialBuilding}
              onChange={e => handleChange('commercialBuilding', e.target.value)}
              placeholder="Building/Project/Society (Optional)"
            />
          </div>

          {/* Locality */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Locality <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`w-full px-3 py-2 border-b ${errors.commercialLocality ? 'border-red-500' : 'border-gray-300'} bg-transparent focus:border-blue-500 outline-none`}
              value={form.commercialLocality}
              onChange={e => handleChange('commercialLocality', e.target.value)}
              placeholder="Enter locality"
            />
            {errors.commercialLocality && <div className="text-red-500 text-xs mt-1">{errors.commercialLocality}</div>}
          </div>

          {/* POSSESSION INFO */}
          <div className="mt-8 mb-6 border-t pt-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">Possession Info</h3>
            <ButtonGroup
              label="Possession status"
              name="possessionStatus"
              required
              value={form.possessionStatus}
              onChange={v => handleChange('possessionStatus', v)}
              options={[
                { label: 'Ready to move', value: 'ready_to_move' },
                { label: 'Under construction', value: 'under_construction' },
              ]}
            />
            {errors.possessionStatus && <div className="text-red-500 text-xs mt-1">{errors.possessionStatus}</div>}
          </div>

          {/* ABOUT THE PROPERTY */}
          <div className="mt-6 mb-6 border-t pt-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">About The Property</h3>

            {/* Zone Type */}
            <div className="mb-4">
              <label className="block font-medium mb-2">Zone Type <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Industrial', value: 'industrial' },
                  { label: 'Commercial', value: 'commercial' },
                  { label: 'Residential', value: 'residential' },
                  { label: 'Special economic zone', value: 'sez' },
                  { label: 'Open Spaces', value: 'open_spaces' },
                  { label: 'Agricultural zone', value: 'agricultural' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.zoneType === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('zoneType', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.zoneType && <div className="text-red-500 text-xs mt-1">{errors.zoneType}</div>}
            </div>

            {/* Location Hub */}
            <div className="mb-4">
              <label className="block font-medium mb-2">Location Hub <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'IT Park', value: 'it_park' },
                  { label: 'Business Park', value: 'business_park' },
                  { label: 'Others', value: 'others' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.locationHub === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('locationHub', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.locationHub && <div className="text-red-500 text-xs mt-1">{errors.locationHub}</div>}
            </div>

            {/* Property Condition */}
            <div className="mb-4">
              <label className="block font-medium mb-2">Property Condition <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Ready to use', value: 'ready_to_use' },
                  { label: 'Bare shell', value: 'bare_shell' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.propertyCondition === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('propertyCondition', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.propertyCondition && <div className="text-red-500 text-xs mt-1">{errors.propertyCondition}</div>}
            </div>

            {/* Built Up Area */}
            <div className="mb-4">
              <label className="block font-medium mb-1">Built Up Area <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className={`flex-1 px-3 py-2 border-b ${errors.commercialBuiltUpArea ? 'border-red-500' : 'border-gray-300'} bg-transparent focus:border-blue-500 outline-none`}
                  value={form.commercialBuiltUpArea}
                  onChange={e => handleChange('commercialBuiltUpArea', e.target.value)}
                  placeholder="Enter area"
                  min={0}
                />
                <span className="text-gray-500 text-sm font-medium">sq. ft.</span>
              </div>
              {errors.commercialBuiltUpArea && <div className="text-red-500 text-xs mt-1">{errors.commercialBuiltUpArea}</div>}
            </div>

            {/* Ownership */}
            <div className="mb-4">
              <label className="block font-medium mb-2">Ownership <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Freehold', value: 'freehold' },
                  { label: 'Leasehold', value: 'leasehold' },
                  { label: 'Cooperative society', value: 'cooperative_society' },
                  { label: 'Power of attorney', value: 'power_of_attorney' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.ownership === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('ownership', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {errors.ownership && <div className="text-red-500 text-xs mt-1">{errors.ownership}</div>}
            </div>
          </div>
        </div>
      )}

      {step === 2 && form.propertyType !== 'commercial' && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">2</span>
            Property Configuration
          </h2>
          {/* ...existing code for Section 2... */}
          <CardGroup
            label="Property Type"
            name="configType"
            required
            value={form.configType}
            onChange={v => handleChange('configType', v)}
            options={
              form.propertyType === 'commercial'
                ? [
                    { label: 'Office', value: 'office' },
                    { label: 'Retail Shop', value: 'retail_shop' },
                    { label: 'Showroom', value: 'showroom' },
                    { label: 'Warehouse', value: 'warehouse' },
                    { label: 'Plot', value: 'plot' },
                    { label: 'Others', value: 'others' },
                  ]
                : [
                    { label: 'Apartment', value: 'apartment' },
                    { label: 'Independent House', value: 'independent_house' },
                    { label: 'Duplex', value: 'duplex' },
                    { label: 'Independent Floor', value: 'independent_floor' },
                    { label: 'Villa', value: 'villa' },
                    { label: 'Penthouse', value: 'penthouse' },
                    { label: 'Studio', value: 'studio' },
                    { label: 'Farm House', value: 'farm_house' },
                  ]
            }
          />
          {errors.configType && <div className="text-red-500 text-xs mb-2">{errors.configType}</div>}
          
          <ButtonGroup
            label="BHK"
            name="bhk"
            value={form.bhk}
            onChange={v => handleChange('bhk', v)}
            options={[
              { label: '1 RK', value: '1rk' },
              { label: '1 BHK', value: '1bhk' },
              { label: '2 BHK', value: '2bhk' },
              { label: '3 BHK', value: '3bhk' },
              { label: '4 BHK', value: '4bhk' },
              { label: '5+ BHK', value: '5+bhk' },
            ]}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Built Up Area (Sq. ft.) <span className="text-red-500">*</span></label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                value={form.builtUpArea}
                onChange={e => handleChange('builtUpArea', e.target.value)}
                min={1}
                placeholder="e.g. 1200"
              />
              {errors.builtUpArea && <div className="text-red-500 text-xs mt-1">{errors.builtUpArea}</div>}
            </div>
            <div>
              <label className="block font-medium mb-1">Super Area (Sq. ft.)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                value={form.superArea}
                onChange={e => handleChange('superArea', e.target.value)}
                placeholder="Enter super area"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Floor Number</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                value={form.floorNumber}
                onChange={e => handleChange('floorNumber', e.target.value)}
                placeholder="e.g. 5"
                min={0}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Total Floors</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                value={form.totalFloors}
                onChange={e => handleChange('totalFloors', e.target.value)}
                placeholder="e.g. 10"
                min={1}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block font-medium mb-1">Age of Property (years) <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              value={form.age}
              onChange={e => handleChange('age', e.target.value)}
              min={0}
              max={99}
              placeholder="0–99"
            />
            {errors.age && <div className="text-red-500 text-xs mt-1">{errors.age}</div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ButtonGroup
              label="Bathrooms"
              name="bathrooms"
              required
              value={form.bathrooms}
              onChange={v => handleChange('bathrooms', v)}
              options={[
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' },
              ]}
            />
            <ButtonGroup
              label="Balconies"
              name="balconies"
              required
              value={form.balconies}
              onChange={v => handleChange('balconies', v)}
              options={[
                { label: '0', value: '0' },
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' },
              ]}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ButtonGroup
              label="Parking"
              name="parking"
              value={form.parking}
              onChange={v => handleChange('parking', v)}
              options={[
                { label: '0', value: '0' },
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '3+', value: '3+' },
              ]}
            />
            <div>
              <label className="block font-medium mb-1">Facing</label>
              <select
                className="w-full px-3 py-2 border rounded-md border-gray-300"
                value={form.facing}
                onChange={e => handleChange('facing', e.target.value)}
              >
                <option value="">Select Facing</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="north-east">North-East</option>
                <option value="north-west">North-West</option>
                <option value="south-east">South-East</option>
                <option value="south-west">South-West</option>
              </select>
            </div>
          </div>
          
          <RadioGroup
            label="Furnish Type"
            name="furnishType"
            required
            value={form.furnishType}
            onChange={v => handleChange('furnishType', v)}
            options={[
              { label: 'Fully Furnished', value: 'fully_furnished' },
              { label: 'Semi Furnished', value: 'semi_furnished' },
              { label: 'Unfurnished', value: 'unfurnished' },
            ]}
          />
          {errors.furnishType && <div className="text-red-500 text-xs mb-2">{errors.furnishType}</div>}

          {/* Maintenance Charges */}
          <ButtonGroup
            label="Maintenance Charges"
            name="maintenanceCharges"
            value={form.maintenanceCharges}
            onChange={v => handleChange('maintenanceCharges', v)}
            options={[
              { label: 'Include in rent', value: 'include_in_rent' },
              { label: 'Separate', value: 'separate' },
            ]}
          />

          <div className="mb-2">
            <button
              type="button"
              className="text-blue-600 underline text-sm"
              onClick={() => handleChange('showAmenities', !form.showAmenities)}
            >
              + Add Furnishings / Amenities
            </button>
          </div>
          {form.showAmenities && (
            <ToggleGroup
              label="Furnishings / Amenities"
              name="amenities"
              value={form.amenities}
              onChange={v => handleChange('amenities', v)}
              options={[
                { label: 'AC', value: 'ac' },
                { label: 'TV', value: 'tv' },
                { label: 'Fridge', value: 'fridge' },
                { label: 'Washing Machine', value: 'washing_machine' },
                { label: 'Geyser', value: 'geyser' },
                { label: 'Modular Kitchen', value: 'modular_kitchen' },
                { label: 'Wardrobe', value: 'wardrobe' },
                { label: 'Bed', value: 'bed' },
                { label: 'Sofa', value: 'sofa' },
                { label: 'Dining Table', value: 'dining_table' },
                { label: 'RO', value: 'ro' },
                { label: 'Microwave', value: 'microwave' },
                { label: 'Chimney', value: 'chimney' },
                { label: 'Water Purifier', value: 'water_purifier' },
                { label: 'Fan', value: 'fan' },
                { label: 'Light', value: 'light' },
              ]}
            />
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block font-medium mb-1">Key Location</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={form.keysLocation}
                onChange={e => handleChange('keysLocation', e.target.value)}
                placeholder="e.g. With Owner, With Security"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Availability Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border rounded-md"
                value={form.availabilityDate}
                onChange={e => handleChange('availabilityDate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block font-medium mb-1">Key Remarks</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md"
              value={form.keysRemarks}
              onChange={e => handleChange('keysRemarks', e.target.value)}
              placeholder="Any additional information about keys"
              rows={2}
            />
          </div>

          {/* Owner Details Section */}
          <div className="mt-8 mb-4 border-t pt-6">
            <h3 className="text-lg font-bold mb-4 text-blue-900 tracking-tight flex items-center gap-2">
              <span className="inline-block w-1.5 h-5 bg-blue-600 rounded-full mr-2"></span>
              Owner Details
            </h3>
            
            <div className="mb-4">
              <label className="block font-medium mb-1">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.ownerName ? 'border-red-500' : 'border-gray-300'
                }`}
                value={form.ownerDetails.name}
                onChange={e => handleOwnerDetailsChange('name', e.target.value)}
                placeholder="Enter owner's full name"
              />
              {errors.ownerName && <div className="text-red-500 text-xs mt-1">{errors.ownerName}</div>}
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.ownerPhone ? 'border-red-500' : 'border-gray-300'
                }`}
                value={form.ownerDetails.phone}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleOwnerDetailsChange('phone', value);
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
              {errors.ownerPhone && <div className="text-red-500 text-xs mt-1">{errors.ownerPhone}</div>}
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-1">
                Email ID
              </label>
              <input
                type="email"
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.ownerEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                value={form.ownerDetails.email}
                onChange={e => handleOwnerDetailsChange('email', e.target.value)}
                placeholder="owner@example.com"
              />
              {errors.ownerEmail && <div className="text-red-500 text-xs mt-1">{errors.ownerEmail}</div>}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Address (Residential) / Financials & Details (Commercial) */}
      {step === 3 && form.propertyType === 'commercial' && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          {/* FINANCIALS */}
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">Financials</h3>
            <div className="mb-4">
              <label className="block font-medium mb-1">Price <span className="text-red-500">*</span></label>
              <input
                type="number"
                className={`w-full px-3 py-2 border-b ${errors.commercialPrice ? 'border-red-500' : 'border-gray-300'} bg-transparent focus:border-blue-500 outline-none`}
                value={form.commercialPrice}
                onChange={e => handleChange('commercialPrice', e.target.value)}
                placeholder="Enter price"
                min={0}
              />
              {errors.commercialPrice && <div className="text-red-500 text-xs mt-1">{errors.commercialPrice}</div>}
            </div>
            <ButtonGroup
              label="Negotiable"
              name="negotiable"
              value={form.negotiable}
              onChange={v => handleChange('negotiable', v)}
              options={[
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
            <div className="mb-4">
              <label className="block font-medium mb-2">Tax & Govt. charge included?</label>
              <div className="flex gap-2 flex-wrap">
                {[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }].map(opt => (
                  <button key={opt.value} type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.taxGovtIncluded === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('taxGovtIncluded', opt.value)}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-2">DG & UPS Charge included?</label>
              <div className="flex gap-2 flex-wrap">
                {[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }].map(opt => (
                  <button key={opt.value} type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.dgUpsIncluded === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('dgUpsIncluded', opt.value)}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* FLOORS AVAILABLE */}
          <div className="mb-6 border-t pt-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">Floors Available</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Total Floors <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  className={`w-full px-3 py-2 border-b ${errors.commercialTotalFloors ? 'border-red-500' : 'border-gray-300'} bg-transparent focus:border-blue-500 outline-none`}
                  value={form.commercialTotalFloors}
                  onChange={e => handleChange('commercialTotalFloors', e.target.value)}
                  placeholder="e.g. 10"
                  min={1}
                />
                {errors.commercialTotalFloors && <div className="text-red-500 text-xs mt-1">{errors.commercialTotalFloors}</div>}
              </div>
              <div>
                <label className="block font-medium mb-1">Your Floor <span className="text-red-500">*</span></label>
                <select
                  className={`w-full px-3 py-2 border rounded-md ${errors.yourFloor ? 'border-red-500' : 'border-gray-300'}`}
                  value={form.yourFloor}
                  onChange={e => handleChange('yourFloor', e.target.value)}
                >
                  <option value="">Select Floor</option>
                  <option value="lower_basement">Lower Basement</option>
                  <option value="upper_basement">Upper Basement</option>
                  <option value="ground">Ground</option>
                  {Array.from({ length: 50 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                  ))}
                </select>
                {errors.yourFloor && <div className="text-red-500 text-xs mt-1">{errors.yourFloor}</div>}
              </div>
            </div>
          </div>

          {/* LIFTS & STAIRCASES */}
          <div className="mb-6 border-t pt-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">Lifts & Staircases</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-medium mb-1">Number of staircase</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border-b border-gray-300 bg-transparent focus:border-blue-500 outline-none"
                  value={form.numberOfStaircase}
                  onChange={e => handleChange('numberOfStaircase', e.target.value)}
                  placeholder="Enter number"
                  min={0}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Passengers Lifts <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  className={`w-full px-3 py-2 border-b ${errors.passengerLifts ? 'border-red-500' : 'border-gray-300'} bg-transparent focus:border-blue-500 outline-none`}
                  value={form.passengerLifts}
                  onChange={e => handleChange('passengerLifts', e.target.value)}
                  placeholder="Enter number"
                  min={0}
                />
                {errors.passengerLifts && <div className="text-red-500 text-xs mt-1">{errors.passengerLifts}</div>}
              </div>
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-1">Service Lifts <span className="text-red-500">*</span></label>
              <input
                type="number"
                className={`w-full px-3 py-2 border-b ${errors.serviceLifts ? 'border-red-500' : 'border-gray-300'} bg-transparent focus:border-blue-500 outline-none`}
                value={form.serviceLifts}
                onChange={e => handleChange('serviceLifts', e.target.value)}
                placeholder="Enter number"
                min={0}
              />
              {errors.serviceLifts && <div className="text-red-500 text-xs mt-1">{errors.serviceLifts}</div>}
            </div>
          </div>

          {/* PARKING */}
          <div className="mb-6 border-t pt-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">Parking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1 text-gray-500">Private Parking</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border-b border-gray-300 bg-transparent focus:border-blue-500 outline-none"
                  value={form.privateParking}
                  onChange={e => handleChange('privateParking', e.target.value)}
                  placeholder="Enter number"
                  min={0}
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-500">Public Parking</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border-b border-gray-300 bg-transparent focus:border-blue-500 outline-none"
                  value={form.publicParking}
                  onChange={e => handleChange('publicParking', e.target.value)}
                  placeholder="Enter number"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* OTHER DETAILS */}
          <div className="mb-6 border-t pt-6">
            <h3 className="text-sm font-bold mb-4 text-gray-800 tracking-wider uppercase">Other Details</h3>
            <div className="mb-4">
              <label className="block font-medium mb-2">Is it pre-leased/pre-rented? <span className="text-red-500">*</span></label>
              <div className="flex gap-2 flex-wrap">
                {[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }].map(opt => (
                  <button key={opt.value} type="button"
                    className={`px-4 py-2 rounded-lg border font-semibold text-sm ${form.isPreLeased === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'}`}
                    onClick={() => handleChange('isPreLeased', opt.value)}
                  >{opt.label}</button>
                ))}
              </div>
              {errors.isPreLeased && <div className="text-red-500 text-xs mt-1">{errors.isPreLeased}</div>}
            </div>
          </div>
        </div>
      )}

      {step === 3 && form.propertyType !== 'commercial' && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">3</span>
            Address
          </h2>
          {/* ...existing code for Section 3... */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Address Line 1 <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition bg-blue-50/50 hover:bg-blue-100 placeholder-gray-400 text-base"
              value={form.addressLine1}
              onChange={e => handleChange('addressLine1', e.target.value)}
              placeholder="Flat/House No, Street, Area"
            />
            {errors.addressLine1 && <div className="text-red-500 text-xs mt-1">{errors.addressLine1}</div>}
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Address Line 2</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={form.addressLine2}
              onChange={e => handleChange('addressLine2', e.target.value)}
              placeholder="(Optional)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Pincode <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={form.pincode}
                onChange={e => handleChange('pincode', e.target.value)}
                placeholder="6-digit pincode"
                maxLength={6}
              />
              {errors.pincode && <div className="text-red-500 text-xs mt-1">{errors.pincode}</div>}
            </div>
            <div>
              <label className="block font-medium mb-1">Landmark</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                value={form.landmark}
                onChange={e => handleChange('landmark', e.target.value)}
                placeholder="Nearby landmark (optional)"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">State <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              value={form.state}
              onChange={e => handleChange('state', e.target.value)}
              placeholder="State"
            />
            {errors.state && <div className="text-red-500 text-xs mt-1">{errors.state}</div>}
          </div>
        </div>
      )}

      {/* SECTION 4: Pricing (Residential) / Amenities (Commercial) */}
      {step === 4 && form.propertyType === 'commercial' && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">4</span>
            Amenities
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { label: 'CCTV', value: 'cctv', Icon: AmenityIcons.cctv },
              { label: 'Power Backup', value: 'power_backup', Icon: AmenityIcons.power_backup },
              { label: 'Furnishing', value: 'furnishing', Icon: AmenityIcons.furnishing },
              { label: 'UPS', value: 'ups', Icon: AmenityIcons.ups },
              { label: 'Central Air Conditioning', value: 'central_ac', Icon: AmenityIcons.central_ac },
              { label: 'Oxygen Duct', value: 'oxygen_duct', Icon: AmenityIcons.oxygen_duct },
              { label: 'Internet Connectivity', value: 'internet', Icon: AmenityIcons.internet },
              { label: 'Vastu Compliant', value: 'vastu', Icon: AmenityIcons.vastu },
              { label: 'Fire extinguishers', value: 'fire_extinguishers', Icon: AmenityIcons.fire_extinguishers },
              { label: 'Fire sensors', value: 'fire_sensors', Icon: AmenityIcons.fire_sensors },
              { label: 'Security Personnel', value: 'security', Icon: AmenityIcons.security },
              { label: 'Water Storage', value: 'water_storage', Icon: AmenityIcons.water_storage },
              { label: 'DG Availability', value: 'dg_availability', Icon: AmenityIcons.dg_availability },
              { label: 'Cafeteria', value: 'cafeteria', Icon: AmenityIcons.cafeteria },
              { label: 'Reception Area', value: 'reception', Icon: AmenityIcons.reception },
              { label: 'Pantry', value: 'pantry', Icon: AmenityIcons.pantry },
              { label: 'Fire NOC Certified', value: 'fire_noc', Icon: AmenityIcons.fire_noc },
              { label: 'Occupancy Certificate', value: 'occupancy_cert', Icon: AmenityIcons.occupancy_cert },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`flex flex-col items-center justify-center px-2 py-4 rounded-xl border-2 transition font-medium text-xs gap-2 text-center min-h-[90px] ${
                  (form.commercialAmenities || []).includes(opt.value)
                    ? 'bg-purple-100 border-purple-500 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
                onClick={() => {
                  const current = form.commercialAmenities || [];
                  if (current.includes(opt.value)) {
                    handleChange('commercialAmenities', current.filter(v => v !== opt.value));
                  } else {
                    handleChange('commercialAmenities', [...current, opt.value]);
                  }
                }}
              >
                <opt.Icon />
                <span className="leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && form.propertyType !== 'commercial' && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">4</span>
            Pricing
          </h2>
          <div className="mb-4">
            <label className="block font-medium mb-1">Base Price (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              value={form.basePrice}
              onChange={e => handleChange('basePrice', e.target.value)}
              placeholder="Enter base price"
            />
            {errors.basePrice && <div className="text-red-500 text-xs mt-1">{errors.basePrice}</div>}
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Final Price (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              value={form.finalPrice}
              onChange={e => handleChange('finalPrice', e.target.value)}
              placeholder="Enter final price"
            />
            {errors.finalPrice && <div className="text-red-500 text-xs mt-1">{errors.finalPrice}</div>}
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Price per Sq.ft (₹) <span className="text-gray-400 text-xs font-normal">(auto-calculated)</span></label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600"
              value={form.pricePerSqft}
              readOnly
              placeholder="Auto-calculated from Final Price ÷ Built Up Area"
            />
            {form.finalPrice && form.builtUpArea && form.pricePerSqft ? (
              <div className="text-green-600 text-xs mt-1">₹{Number(form.finalPrice).toLocaleString('en-IN')} ÷ {form.builtUpArea} sq.ft = ₹{Number(form.pricePerSqft).toLocaleString('en-IN')}/sq.ft</div>
            ) : (
              <div className="text-gray-400 text-xs mt-1">Enter Final Price and Built Up Area to auto-calculate</div>
            )}
            {errors.pricePerSqft && <div className="text-red-500 text-xs mt-1">{errors.pricePerSqft}</div>}
          </div>
        </div>
      )}

      {/* SECTION 5: Photos & Videos */}
      {step === 5 && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">5</span>
            Photos & Videos
          </h2>

          {/* Upload Zone */}
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
            <label className="flex flex-col items-center justify-center cursor-pointer py-6">
              <input
                type="file"
                accept="image/*,video/*,.pdf,.heic,.heif"
                multiple
                className="hidden"
                onChange={e => {
                  const newFiles = Array.from(e.target.files || []);
                  handleChange('photos', [...(form.photos || []), ...newFiles]);
                  e.target.value = '';
                }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-blue-700 font-semibold">Click to upload photos & videos</span>
              <span className="text-xs text-blue-400 mt-1">Files are stored on DigitalOcean Spaces</span>
              <span className="text-[10px] text-gray-400 mt-1">Supports: JPG, PNG, HEIC, GIF, WebP, MP4, MOV, PDF</span>
            </label>
          </div>

          {/* File Preview Grid */}
          {form.photos && form.photos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {form.photos.length} file(s) selected
                </span>
                <button
                  type="button"
                  onClick={() => handleChange('photos', [])}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {form.photos.map((file, idx) => (
                  <div key={idx} className="relative group aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {file.type && file.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onLoad={(e) => { URL.revokeObjectURL(e.target.src); }}
                      />
                    ) : file.type && file.type.startsWith('video/') ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800 relative">
                        <video className="w-full h-full object-cover" muted>
                          <source src={URL.createObjectURL(file)} />
                        </video>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-blue-600 text-sm">&#9654;</div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => {
                        const updated = form.photos.filter((_, i) => i !== idx);
                        handleChange('photos', updated);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      &times;
                    </button>
                    {/* File name */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 truncate">
                      {file.name}
                    </div>
                    {/* File size badge */}
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded">
                      {file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.photos && <div className="text-red-500 text-xs mt-2">{errors.photos}</div>}
        </div>
      )}

      {/* SECTION 6: Review & Submit */}
      {step === 6 && (
        <div className="mx-4 sm:mx-8 mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 transition-all duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 tracking-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 text-sm font-bold">6</span>
            Review & Submit
          </h2>
          <div className="mb-4">
            <strong>Property Type:</strong> {form.propertyType}<br />
            <strong>Looking To:</strong> {form.lookingTo}<br />
            <strong>City:</strong> {form.city}<br />
            <strong>Config Type:</strong> {form.configType}<br />

            {form.propertyType === 'commercial' ? (
              <>
                <strong>Building/Project:</strong> {form.commercialBuilding || 'N/A'}<br />
                <strong>Locality:</strong> {form.commercialLocality}<br />
                <strong>Possession Status:</strong> {form.possessionStatus}<br />
                <strong>Zone Type:</strong> {form.zoneType}<br />
                <strong>Location Hub:</strong> {form.locationHub}<br />
                <strong>Property Condition:</strong> {form.propertyCondition}<br />
                <strong>Built Up Area:</strong> {form.commercialBuiltUpArea} sq.ft.<br />
                <strong>Ownership:</strong> {form.ownership}<br />
                <strong>Price:</strong> ₹{form.commercialPrice}<br />
                <strong>Negotiable:</strong> {form.negotiable || 'N/A'}<br />
                <strong>Tax & Govt. Charge Included:</strong> {form.taxGovtIncluded || 'N/A'}<br />
                <strong>DG & UPS Charge Included:</strong> {form.dgUpsIncluded || 'N/A'}<br />
                <strong>Total Floors:</strong> {form.commercialTotalFloors}<br />
                <strong>Your Floor:</strong> {form.yourFloor}<br />
                <strong>Staircases:</strong> {form.numberOfStaircase || 'N/A'}<br />
                <strong>Passenger Lifts:</strong> {form.passengerLifts}<br />
                <strong>Service Lifts:</strong> {form.serviceLifts}<br />
                <strong>Private Parking:</strong> {form.privateParking || 'N/A'}<br />
                <strong>Public Parking:</strong> {form.publicParking || 'N/A'}<br />
                <strong>Pre-leased/Pre-rented:</strong> {form.isPreLeased}<br />
                <strong>Amenities:</strong> {(form.commercialAmenities || []).join(', ') || 'N/A'}<br />
              </>
            ) : (
              <>
                <strong>Building Name:</strong> {form.buildingName}<br />
                <strong>BHK:</strong> {form.bhk || 'N/A'}<br />
                <strong>Built Up Area:</strong> {form.builtUpArea} sq.ft.<br />
                <strong>Super Area:</strong> {form.superArea || 'N/A'} sq.ft.<br />
                <strong>Floor:</strong> {form.floorNumber || 'N/A'} / {form.totalFloors || 'N/A'}<br />
                <strong>Age:</strong> {form.age} years<br />
                <strong>Bathrooms:</strong> {form.bathrooms}<br />
                <strong>Balconies:</strong> {form.balconies}<br />
                <strong>Parking:</strong> {form.parking || 'N/A'}<br />
                <strong>Facing:</strong> {form.facing || 'N/A'}<br />
                <strong>Furnish Type:</strong> {form.furnishType}<br />
                <strong>Maintenance Charges:</strong> {form.maintenanceCharges || 'N/A'}<br />
                <strong>Amenities:</strong> {form.amenities.join(', ') || 'N/A'}<br />
                <strong>Key Location:</strong> {form.keysLocation || 'N/A'}<br />
                <strong>Key Remarks:</strong> {form.keysRemarks || 'N/A'}<br />
                <strong>Availability Date:</strong> {form.availabilityDate || 'N/A'}<br />
                <strong>Owner Name:</strong> {form.ownerDetails.name}<br />
                <strong>Owner Phone:</strong> {form.ownerDetails.phone}<br />
                <strong>Owner Email:</strong> {form.ownerDetails.email || 'N/A'}<br />
                <strong>Address:</strong> {form.addressLine1} {form.addressLine2} {form.landmark} {form.state} {form.pincode}<br />
                <strong>Base Price:</strong> {form.basePrice}<br />
                <strong>Final Price:</strong> {form.finalPrice}<br />
                <strong>Price per Sqft:</strong> {form.pricePerSqft}<br />
              </>
            )}
            <strong>Photos:</strong> {form.photos && form.photos.length} file(s)
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 z-10 rounded-b-2xl">
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-600 rounded-lg font-medium text-sm border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-blue-700 hover:shadow-md transition-all"
            >
              {form.propertyType === 'commercial'
                ? (step === 1 ? 'Next: Property Details' : step === 2 ? 'Next: Financials' : step === 3 ? 'Next: Amenities' : step === 4 ? 'Next: Photos' : 'Next')
                : 'Continue'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loading}
              className={`inline-flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-semibold text-sm shadow-sm transition-all ${
                submitting || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md'
              }`}
            >
              {submitting || loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Submit Property
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
