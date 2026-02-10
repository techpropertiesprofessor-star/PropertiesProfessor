import React, { useState } from "react";

function StepperSidebar({ progress }) {
  const steps = [
    { label: "Basic Details", status: "in-progress" },
    { label: "Property Details", status: "pending" },
    { label: "Amenities", status: "pending" },
    { label: "Photos", status: "pending", score: "+15%" },
    { label: "Review", status: "pending" },
  ];
  return (
    <aside className="w-full md:w-72 bg-white border-r flex flex-col min-h-screen">
      <div className="p-6 border-b">
        <a href="/dashboard" className="text-xs text-blue-600 underline mb-2 block">
          ← Return to dashboard
        </a>
        <h2 className="text-xl font-bold mb-1">Post your property</h2>
        <p className="text-gray-500 text-sm mb-4">Sell or rent your property</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${
                  i === 0
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-gray-300 bg-white text-gray-400"
                } font-bold text-xs`}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <span
                  className={`font-medium ${
                    i === 0 ? "text-purple-700" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
                {step.score && (
                  <span className="ml-2 text-green-600 text-xs font-semibold">
                    {step.score}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto p-6 border-t text-xs text-gray-500">
        Need Help? <span className="font-semibold text-gray-700">Call 08048811281</span>
      </div>
    </aside>
  );
}

function ToggleGroup({ label, options, value, onChange, required, error, color = "purple" }) {
  return (
    <div className="mb-6">
      <label className="block font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-3 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
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

export default function PostPropertyBasicDetails() {
  const [form, setForm] = useState({
    propertyCategory: "",
    intent: "",
    city: "",
    commercialType: "",
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  function validate(f = form) {
    const e = {};
    if (!f.propertyCategory) e.propertyCategory = "Property type is required.";
    if (!f.intent) e.intent = "Please select an option.";
    if (!f.city) e.city = "City is required.";
    if (f.propertyCategory === "commercial" && !f.commercialType)
      e.commercialType = "Select commercial property type.";
    return e;
  }

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const eObj = validate();
    setErrors(eObj);
    setTouched({
      propertyCategory: true,
      intent: true,
      city: true,
      commercialType: true,
    });
    if (Object.keys(eObj).length === 0) {
      // Submit logic here
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StepperSidebar progress={12} />
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-2">
        <form
          className="w-full max-w-2xl bg-white rounded-xl shadow p-8 relative"
          onSubmit={handleSubmit}
        >
          <h1 className="text-2xl font-bold mb-8">Add Basic Details</h1>
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
              { label: "Sell", value: "sell" },
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
          {form.propertyCategory === "commercial" && (
            <ToggleGroup
              label="Property Type"
              required
              value={form.commercialType}
              onChange={(v) => handleChange("commercialType", v)}
              error={touched.commercialType && errors.commercialType}
              color="purple"
              options={[
                { label: "Office", value: "office", icon: <span>🏢</span> },
                { label: "Retail Shop", value: "retail", icon: <span>🏬</span> },
                { label: "Showroom", value: "showroom", icon: <span>🏪</span> },
                { label: "Warehouse", value: "warehouse", icon: <span>🏭</span> },
                { label: "Plot", value: "plot", icon: <span>🗺️</span> },
                { label: "Others", value: "others", icon: <span>➕</span> },
              ]}
            />
          )}
          <div className="h-20" />
          <div className="fixed bottom-0 left-0 w-full flex justify-center z-50">
            <div className="w-full max-w-2xl bg-white border-t p-4 flex">
              <button
                type="submit"
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-lg shadow disabled:opacity-60 transition"
                disabled={
                  !form.propertyCategory ||
                  !form.intent ||
                  !form.city ||
                  (form.propertyCategory === "commercial" && !form.commercialType)
                }
              >
                Next, add property details
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
