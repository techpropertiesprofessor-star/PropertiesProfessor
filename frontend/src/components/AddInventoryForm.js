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

// SECTION 1: Basic Property Details
export default function AddInventoryForm({ onSubmit }) {
  const [form, setForm] = useState({
    // Section 1
    propertyType: '',
    lookingTo: '',
    city: '',
    buildingName: '',
    unitNumber: '',
    // Section 2
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
    // Section 3
    addressLine1: '',
    addressLine2: '',
    pincode: '',
    landmark: '',
    state: '',
    // Section 4
    basePrice: '',
    finalPrice: '',
    pricePerSqft: '',
    // Section 5
    photos: [],
    // Section 6 (review is just display)
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);

  // Validation for each step
  function validate(currentStep = step) {
    const e = {};
    if (currentStep === 1) {
      if (!form.propertyType) e.propertyType = 'Property type is required.';
      if (!form.lookingTo) e.lookingTo = 'Please select an option.';
      if (!form.city) e.city = 'City is required.';
      if (!form.buildingName) e.buildingName = 'Building/Society name is required.';
      if (!form.unitNumber || !form.unitNumber.trim()) e.unitNumber = 'Unit number is required.';
    }
    if (currentStep === 2) {
      if (!form.configType) e.configType = 'Select property configuration.';
      if (!form.builtUpArea || isNaN(form.builtUpArea) || form.builtUpArea < 150 || form.builtUpArea > 1500) e.builtUpArea = 'Built Up Area must be 150–1500.';
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
    if (currentStep === 3) {
      if (!form.addressLine1) e.addressLine1 = 'Address Line 1 is required.';
      if (!form.pincode || !/^\d{6}$/.test(form.pincode)) e.pincode = 'Valid 6-digit pincode required.';
      if (!form.state) e.state = 'State is required.';
    }
    if (currentStep === 4) {
      if (!form.basePrice || isNaN(form.basePrice) || Number(form.basePrice) <= 0) e.basePrice = 'Base price required.';
      if (!form.finalPrice || isNaN(form.finalPrice) || Number(form.finalPrice) <= 0) e.finalPrice = 'Final price required.';
      if (!form.pricePerSqft || isNaN(form.pricePerSqft) || Number(form.pricePerSqft) <= 0) e.pricePerSqft = 'Price per sqft required.';
    }
    if (currentStep === 5) {
      if (!form.photos || form.photos.length === 0) e.photos = 'At least one photo is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
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
    if (validate(step)) {
      // Normalize some fields before submitting
      const normalized = { ...form };
      // Normalize lookingTo/sale value: map 'sell' to 'sale' for consistency
      if (normalized.lookingTo && normalized.lookingTo.toString().toLowerCase() === 'sell') {
        normalized.lookingTo = 'sale';
      }
      // Also set listing_type for backend compatibility
      normalized.listing_type = normalized.listing_type || normalized.lookingTo || '';

      onSubmit(normalized);
    }
  }

  return (
    <form className="space-y-12 bg-[repeating-linear-gradient(0deg,#f8fafc_0_32px,#e0e7ef_32px_33px)] bg-paper-texture rounded-2xl shadow-2xl border-2 border-blue-200 p-0 sm:p-0 relative overflow-hidden">
      {/* Form header with icon and subtitle */}
      <div className="relative flex flex-col items-center justify-center py-4 px-4 bg-white/90 border-b border-blue-100 rounded-t-2xl shadow-sm">
        <button
          type="button"
          aria-label="Close"
          onClick={() => typeof window !== 'undefined' && window.history.back()}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl font-bold focus:outline-none"
        >
          ×
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center mb-1 shadow">
          <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6 text-blue-700' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.212l-4.5 1.5 1.5-4.5 12.362-12.725z' /></svg>
        </div>
        <h1 className="text-xl font-extrabold text-blue-900 tracking-tight mb-1 font-serif">Add Property Details</h1>
        <p className="text-gray-500 text-sm font-serif">Please fill all required fields to add a new property.</p>
      </div>
      {/* Stepper */}
      <div className="flex items-center gap-2 sm:gap-4 mb-8 justify-center">
        {[1,2,3,4,5,6].map((n, idx) => (
          <React.Fragment key={n}>
            <div className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-base shadow ${step === n ? 'bg-blue-600 text-white scale-110' : 'bg-gray-200 text-gray-700'} transition-all duration-200`}>
              {n}
            </div>
            <div className={`font-semibold text-xs sm:text-sm ${step === n ? 'text-blue-700' : 'text-gray-500'} transition-all duration-200`}>
              {['Basic Details','Configuration','Address','Pricing','Photos & Videos','Review'][idx]}
            </div>
            {n < 6 && <div className="h-0.5 w-6 sm:w-10 bg-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* SECTION 1 */}
      {step === 1 && (
        <div className="bg-white/95 rounded-2xl shadow-xl border border-blue-100 p-8 sm:p-12 mb-10 animate-fadein">
          <h2 className="text-xl font-bold mb-6 text-blue-900 tracking-tight flex items-center gap-2"><span className="inline-block w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>Basic Property Details</h2>
          {/* ...existing code for Section 1... */}
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
            label="Looking To"
            name="lookingTo"
            required
            value={form.lookingTo}
            onChange={v => handleChange('lookingTo', v)}
            options={[
              { label: 'Rent', value: 'rent' },
              { label: 'Sale', value: 'sale' },
              { label: 'PG/Co-living', value: 'pg' },
            ]}
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
        </div>
      )}

      {/* SECTION 2: Property Configuration */}
      {step === 2 && (
        <div className="bg-white/95 rounded-2xl shadow-xl border border-blue-100 p-8 sm:p-12 mb-10 animate-fadein">
          <h2 className="text-xl font-bold mb-6 text-blue-900 tracking-tight flex items-center gap-2"><span className="inline-block w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>Property Configuration</h2>
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
                min={150}
                max={1500}
                placeholder="150–1500"
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

      {/* SECTION 3: Address */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 sm:p-8 mb-2 animate-fadein">
          <h2 className="text-xl font-bold mb-6 text-blue-900 tracking-tight flex items-center gap-2"><span className="inline-block w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>Address</h2>
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

      {/* SECTION 4: Pricing */}
      {step === 4 && (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 sm:p-8 mb-2 animate-fadein">
          <h2 className="text-xl font-bold mb-6 text-blue-900 tracking-tight flex items-center gap-2"><span className="inline-block w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>Pricing</h2>
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
            <label className="block font-medium mb-1">Price per Sq.ft (₹) <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-md"
              value={form.pricePerSqft}
              onChange={e => handleChange('pricePerSqft', e.target.value)}
              placeholder="Enter price per sqft"
            />
            {errors.pricePerSqft && <div className="text-red-500 text-xs mt-1">{errors.pricePerSqft}</div>}
          </div>
        </div>
      )}

      {/* SECTION 5: Photos */}
      {step === 5 && (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 sm:p-8 mb-2 animate-fadein">
          <h2 className="text-xl font-bold mb-6 text-blue-900 tracking-tight flex items-center gap-2"><span className="inline-block w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>Photos & Videos</h2>
          <div className="mb-4">
            <label className="block font-medium mb-1">Upload Photos & Videos <span className="text-red-500">*</span></label>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files || []);
                handleChange('photos', files);
              }}
            />
            {errors.photos && <div className="text-red-500 text-xs mt-1">{errors.photos}</div>}
            {form.photos && form.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.photos.map((file, idx) => (
                  <div key={idx} className="border rounded p-1 text-xs bg-gray-50">{file.name}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 6: Review & Submit */}
      {step === 6 && (
        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6 sm:p-8 mb-2 animate-fadein">
          <h2 className="text-xl font-bold mb-6 text-blue-900 tracking-tight flex items-center gap-2"><span className="inline-block w-1.5 h-6 bg-blue-600 rounded-full mr-2"></span>Review & Submit</h2>
          <div className="mb-4">
            <strong>Property Type:</strong> {form.propertyType}<br />
            <strong>Looking To:</strong> {form.lookingTo}<br />
            <strong>City:</strong> {form.city}<br />
            <strong>Building Name:</strong> {form.buildingName}<br />
            <strong>Config Type:</strong> {form.configType}<br />
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
            <strong>Photos:</strong> {form.photos && form.photos.length} file(s)
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 bg-white/95 p-4 sm:p-6 border-t z-10 rounded-b-2xl shadow-inner backdrop-blur">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold shadow"
            >
              Back
            </button>
          ) : <div />}

          {step < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg font-semibold shadow"
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
