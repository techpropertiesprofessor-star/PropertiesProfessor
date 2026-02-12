import React, { useState } from "react";

function ToggleGroup({ label, options, value, onChange, required, error, color = "purple", type = "button" }) {
  return (
    <div className="mb-6">
      <label className="block font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-3 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            type={type}
            className={`px-6 py-2 rounded-full border font-semibold text-sm transition
              ${
                value === opt.value
                  ? `bg-${color}-600 text-white border-${color}-600`
                  : "bg-white border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && <span className="mr-2">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

function CardGroup({ label, options, value, onChange, required, error }) {
  return (
    <div className="mb-6">
      <label className="block font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`flex flex-col items-center px-4 py-3 rounded-xl border text-center shadow-sm transition font-medium text-sm ${
              value === opt.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white border-gray-300 text-gray-700 hover:border-purple-400"
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && <span className="mb-1">{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
      </div>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

function Collapsible({ label, score, open, onToggle, children }) {
  return (
    <div className="mb-6">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 rounded-t-lg font-semibold text-left"
        onClick={onToggle}
      >
        <span>
          {label}
          {score && <span className="ml-2 text-green-600 text-xs font-semibold">Score {score}</span>}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="p-4 border border-t-0 rounded-b-lg bg-white">{children}</div>}
    </div>
  );
}

export default function AddInventoryPropertyDetailsResidential() {
  const [form, setForm] = useState({
    propertyCategory: "residential",
    intent: "",
    propertyType: "",
    bhk: "",
    transactionType: "",
    constructionStatus: "",
    bathrooms: "",
    balconies: "",
    furnishType: "",
    city: "",
    buildingName: "",
    builtUpArea: "",
    coveredParking: "",
    openParking: "",
    brokerage: "",
    showAdditional: false,
    cost: "",
    maintenance: "",
    carpetArea: "",
    floorNo: "",
    totalFloors: "",
    ownerDetails: {
      name: "",
      phone: "",
      email: ""
    }
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  function validate(f = form) {
    const e = {};
    if (!f.propertyCategory) e.propertyCategory = "Property type is required.";
    if (!f.intent) e.intent = "Please select an option.";
    if (!f.propertyType) e.propertyType = "Select property type.";
    if (!f.bhk) e.bhk = "Select BHK configuration.";
    if (!f.transactionType) e.transactionType = "Select transaction type.";
    if (!f.constructionStatus) e.constructionStatus = "Select construction status.";
    if (!f.bathrooms) e.bathrooms = "Select bathroom count.";
    if (f.balconies === "") e.balconies = "Select balcony count.";
    if (!f.furnishType) e.furnishType = "Select furnish type.";
    if (!f.city) e.city = "City is required.";
    if (!f.builtUpArea) e.builtUpArea = "Built up area is required.";
    if (!f.coveredParking) e.coveredParking = "Select covered parking.";
    if (!f.openParking) e.openParking = "Select open parking.";
    if (!f.brokerage) e.brokerage = "Select brokerage option.";
    
    // Owner Details validation
    if (!f.ownerDetails.name) {
      e.ownerName = "Owner name is required.";
    } else if (f.ownerDetails.name.trim().length < 3) {
      e.ownerName = "Owner name must be at least 3 characters.";
    } else if (!/^[a-zA-Z\s]+$/.test(f.ownerDetails.name)) {
      e.ownerName = "Owner name can only contain letters and spaces.";
    }
    
    if (!f.ownerDetails.phone) {
      e.ownerPhone = "Phone number is required.";
    } else if (!/^[0-9]{10}$/.test(f.ownerDetails.phone)) {
      e.ownerPhone = "Phone number must be exactly 10 digits.";
    }
    
    if (f.ownerDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.ownerDetails.email)) {
      e.ownerEmail = "Please enter a valid email address.";
    }
    
    if (f.showAdditional) {
      if (!f.cost) e.cost = "Cost is required.";
      if (!f.floorNo) e.floorNo = "Floor No. is required.";
      if (!f.totalFloors) e.totalFloors = "Total Floors is required.";
    }
    return e;
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleOwnerDetailsChange(field, value) {
    setForm((f) => ({
      ...f,
      ownerDetails: { ...f.ownerDetails, [field]: value }
    }));
    setTouched((t) => ({ ...t, [`owner${field.charAt(0).toUpperCase()}${field.slice(1)}`]: true }));
    setErrors((e) => ({ ...e, [`owner${field.charAt(0).toUpperCase()}${field.slice(1)}`]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    setTouched({
      propertyCategory: true,
      intent: true,
      propertyType: true,
      bhk: true,
      transactionType: true,
      constructionStatus: true,
      bathrooms: true,
      balconies: true,
      furnishType: true,
      city: true,
      builtUpArea: true,
      coveredParking: true,
      openParking: true,
      brokerage: true,
      ownerName: true,
      ownerPhone: true,
      ownerEmail: true,
      cost: true,
      floorNo: true,
      totalFloors: true,
    });
    if (Object.keys(eObj).length === 0) {
      // Submit logic here
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-2">
        <form
          className="w-full max-w-2xl bg-white rounded-xl shadow p-8 relative"
          onSubmit={handleSubmit}
        >
          <h1 className="text-2xl font-bold mb-8">Add Property Details</h1>
          <ToggleGroup
            label="Property Type"
            required
            value={form.propertyCategory}
            onChange={(v) => handleChange("propertyCategory", v)}
            error={touched.propertyCategory && errors.propertyCategory}
            color="purple"
            options={[
              { label: "Residential", value: "residential" },
              { label: "Commercial", value: "commercial" },
            ]}
          />
          <ToggleGroup
            label="Looking to"
            required
            value={form.intent}
            onChange={(v) => handleChange("intent", v)}
            error={touched.intent && errors.intent}
            color="purple"
            options={[
              { label: "Rent", value: "rent" },
              { label: "Sale", value: "sale" },
              { label: "PG / Co-living", value: "pg" },
            ]}
          />
          <CardGroup
            label="Property Type"
            required
            value={form.propertyType}
            onChange={(v) => handleChange("propertyType", v)}
            error={touched.propertyType && errors.propertyType}
            options={[
              { label: "Apartment", value: "apartment" },
              { label: "Independent House", value: "independent_house" },
              { label: "Duplex", value: "duplex" },
              { label: "Independent Floor", value: "independent_floor" },
              { label: "Villa", value: "villa" },
              { label: "Penthouse", value: "penthouse" },
              { label: "Studio", value: "studio" },
              { label: "Plot", value: "plot" },
              { label: "Farm House", value: "farm_house" },
              { label: "Agricultural Land", value: "agricultural_land" },
            ]}
          />
          <ToggleGroup
            label="BHK"
            required
            value={form.bhk}
            onChange={(v) => handleChange("bhk", v)}
            error={touched.bhk && errors.bhk}
            color="purple"
            options={[
              { label: "1 RK", value: "1rk" },
              { label: "1 BHK", value: "1bhk" },
              { label: "1.5 BHK", value: "1.5bhk" },
              { label: "2 BHK", value: "2bhk" },
              { label: "2.5 BHK", value: "2.5bhk" },
              { label: "3 BHK", value: "3bhk" },
              { label: "3.5 BHK", value: "3.5bhk" },
              { label: "4 BHK", value: "4bhk" },
              { label: "4.5 BHK", value: "4.5bhk" },
              { label: "5 BHK", value: "5bhk" },
              { label: "5+ BHK", value: "5+bhk" },
            ]}
          />
          <ToggleGroup
            label="Transaction Type"
            required
            value={form.transactionType}
            onChange={(v) => handleChange("transactionType", v)}
            error={touched.transactionType && errors.transactionType}
            color="purple"
            options={[
              { label: "New Booking", value: "new" },
              { label: "Resale", value: "resale" },
            ]}
          />
          <ToggleGroup
            label="Construction Status"
            required
            value={form.constructionStatus}
            onChange={(v) => handleChange("constructionStatus", v)}
            error={touched.constructionStatus && errors.constructionStatus}
            color="purple"
            options={[
              { label: "Ready to Move", value: "ready" },
              { label: "Under Construction", value: "under_construction" },
            ]}
          />
          <ToggleGroup
            label="Bathroom"
            required
            value={form.bathrooms}
            onChange={(v) => handleChange("bathrooms", v)}
            error={touched.bathrooms && errors.bathrooms}
            color="purple"
            options={[
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
            ]}
          />
          <ToggleGroup
            label="Balcony"
            required
            value={form.balconies}
            onChange={(v) => handleChange("balconies", v)}
            error={touched.balconies && errors.balconies}
            color="purple"
            options={[
              { label: "0", value: "0" },
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
            ]}
          />
          <ToggleGroup
            label="Furnish Type"
            required
            value={form.furnishType}
            onChange={(v) => handleChange("furnishType", v)}
            error={touched.furnishType && errors.furnishType}
            color="purple"
            options={[
              { label: "Fully Furnished", value: "fully_furnished", icon: <span>🛋️</span> },
              { label: "Semi Furnished", value: "semi_furnished", icon: <span>🛏️</span> },
              { label: "Unfurnished", value: "unfurnished", icon: <span>🚪</span> },
            ]}
          />
          <div className="mb-6">
            <label className="block font-medium mb-2">
              Search City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2 border rounded-md ${
                touched.city && errors.city
                  ? "border-red-500"
                  : "border-gray-300 focus:border-purple-500"
              }`}
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Enter city"
              onBlur={() => setTouched((t) => ({ ...t, city: true }))}
              autoComplete="off"
            />
            {touched.city && errors.city && (
              <div className="text-red-500 text-xs mt-1">{errors.city}</div>
            )}
          </div>
          <div className="mb-6">
            <label className="block font-medium mb-2">
              Building / Apartment / Society Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-md border-gray-300"
              value={form.buildingName}
              onChange={(e) => handleChange("buildingName", e.target.value)}
              placeholder="Enter name"
              autoComplete="off"
            />
          </div>
          <div className="mb-6">
            <label className="block font-medium mb-2">
              Built Up Area (Sq. ft.) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={`w-full px-4 py-2 border rounded-md ${
                touched.builtUpArea && errors.builtUpArea
                  ? "border-red-500"
                  : "border-gray-300 focus:border-purple-500"
              }`}
              value={form.builtUpArea}
              onChange={(e) => handleChange("builtUpArea", e.target.value)}
              placeholder="e.g. 1200"
              onBlur={() => setTouched((t) => ({ ...t, builtUpArea: true }))}
              min={1}
            />
            {touched.builtUpArea && errors.builtUpArea && (
              <div className="text-red-500 text-xs mt-1">{errors.builtUpArea}</div>
            )}
          </div>
          <ToggleGroup
            label="Covered Parking"
            required
            value={form.coveredParking}
            onChange={(v) => handleChange("coveredParking", v)}
            error={touched.coveredParking && errors.coveredParking}
            color="purple"
            options={[
              { label: "0", value: "0" },
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "3+", value: "3+" },
            ]}
          />
          <ToggleGroup
            label="Open Parking"
            required
            value={form.openParking}
            onChange={(v) => handleChange("openParking", v)}
            error={touched.openParking && errors.openParking}
            color="purple"
            options={[
              { label: "0", value: "0" },
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "3+", value: "3+" },
            ]}
          />
          <ToggleGroup
            label="Do you charge brokerage?"
            required
            value={form.brokerage}
            onChange={(v) => handleChange("brokerage", v)}
            error={touched.brokerage && errors.brokerage}
            color="purple"
            options={[
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" },
            ]}
          />

          {/* Owner Details Section */}
          <div className="mt-8 mb-6 border-t pt-6">
            <h2 className="text-xl font-bold mb-6 text-purple-900 tracking-tight flex items-center gap-2">
              <span className="inline-block w-1.5 h-6 bg-purple-600 rounded-full mr-2"></span>
              Owner Details
            </h2>
            
            <div className="mb-6">
              <label className="block font-medium mb-2">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-4 py-2 border rounded-md ${
                  touched.ownerName && errors.ownerName
                    ? "border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                value={form.ownerDetails.name}
                onChange={(e) => handleOwnerDetailsChange("name", e.target.value)}
                placeholder="Enter owner's full name"
                onBlur={() => setTouched((t) => ({ ...t, ownerName: true }))}
                autoComplete="off"
              />
              {touched.ownerName && errors.ownerName && (
                <div className="text-red-500 text-xs mt-1">{errors.ownerName}</div>
              )}
            </div>

            <div className="mb-6">
              <label className="block font-medium mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                className={`w-full px-4 py-2 border rounded-md ${
                  touched.ownerPhone && errors.ownerPhone
                    ? "border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                value={form.ownerDetails.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleOwnerDetailsChange("phone", value);
                }}
                placeholder="10-digit mobile number"
                onBlur={() => setTouched((t) => ({ ...t, ownerPhone: true }))}
                autoComplete="off"
                maxLength={10}
              />
              {touched.ownerPhone && errors.ownerPhone && (
                <div className="text-red-500 text-xs mt-1">{errors.ownerPhone}</div>
              )}
            </div>

            <div className="mb-6">
              <label className="block font-medium mb-2">
                Email ID
              </label>
              <input
                type="email"
                className={`w-full px-4 py-2 border rounded-md ${
                  touched.ownerEmail && errors.ownerEmail
                    ? "border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                value={form.ownerDetails.email}
                onChange={(e) => handleOwnerDetailsChange("email", e.target.value)}
                placeholder="owner@example.com"
                onBlur={() => setTouched((t) => ({ ...t, ownerEmail: true }))}
                autoComplete="off"
              />
              {touched.ownerEmail && errors.ownerEmail && (
                <div className="text-red-500 text-xs mt-1">{errors.ownerEmail}</div>
              )}
            </div>
          </div>

          <Collapsible
            label="Add Additional Details"
            score="4%"
            open={form.showAdditional}
            onToggle={() => handleChange("showAdditional", !form.showAdditional)}
          >
            <div className="mb-4">
              <label className="block font-medium mb-2">
                Cost <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`w-full px-4 py-2 border rounded-md ${
                  touched.cost && errors.cost
                    ? "border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                value={form.cost}
                onChange={(e) => handleChange("cost", e.target.value)}
                placeholder="e.g. 5000000"
                onBlur={() => setTouched((t) => ({ ...t, cost: true }))}
                min={1}
              />
              {touched.cost && errors.cost && (
                <div className="text-red-500 text-xs mt-1">{errors.cost}</div>
              )}
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-2">
                Maintenance Charges (per month)
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border rounded-md border-gray-300"
                value={form.maintenance}
                onChange={(e) => handleChange("maintenance", e.target.value)}
                placeholder="e.g. 2000"
                min={0}
              />
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-2">
                Carpet Area (Sq. ft.)
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border rounded-md border-gray-300"
                value={form.carpetArea}
                onChange={(e) => handleChange("carpetArea", e.target.value)}
                placeholder="e.g. 900"
                min={0}
              />
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-2">
                Floor No. <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`w-full px-4 py-2 border rounded-md ${
                  touched.floorNo && errors.floorNo
                    ? "border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                value={form.floorNo}
                onChange={(e) => handleChange("floorNo", e.target.value)}
                placeholder="e.g. 2"
                onBlur={() => setTouched((t) => ({ ...t, floorNo: true }))}
                min={0}
              />
              {touched.floorNo && errors.floorNo && (
                <div className="text-red-500 text-xs mt-1">{errors.floorNo}</div>
              )}
            </div>
            <div className="mb-4">
              <label className="block font-medium mb-2">
                Total Floors <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={`w-full px-4 py-2 border rounded-md ${
                  touched.totalFloors && errors.totalFloors
                    ? "border-red-500"
                    : "border-gray-300 focus:border-purple-500"
                }`}
                value={form.totalFloors}
                onChange={(e) => handleChange("totalFloors", e.target.value)}
                placeholder="e.g. 10"
                onBlur={() => setTouched((t) => ({ ...t, totalFloors: true }))}
                min={1}
              />
              {touched.totalFloors && errors.totalFloors && (
                <div className="text-red-500 text-xs mt-1">{errors.totalFloors}</div>
              )}
            </div>
          </Collapsible>
          <div className="h-20" />
          <div className="fixed bottom-0 left-0 w-full flex justify-center z-50">
            <div className="w-full max-w-2xl bg-white border-t p-4 flex">
              <button
                type="submit"
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-lg shadow disabled:opacity-60 transition"
                disabled={
                  Object.keys(validate()).length > 0
                }
              >
                Next, add address
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
