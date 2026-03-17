const mongoose = require('mongoose');

const InventoryUnitSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  tower: { type: mongoose.Schema.Types.ObjectId, ref: 'Tower', required: true },
  unitNumber: { type: String, required: true },
  floor_number: { type: String },
  total_floors: { type: Number },
  area: { type: Number },
  carpet_area: { type: Number },
  built_up_area: { type: Number },
  super_area: { type: Number },
  base_price: { type: Number },
  final_price: { type: Number },
  price_per_sqft: { type: Number },
  bhk: { type: String },
  budget: { type: Number },
  location: { type: String },
  status: { type: String, enum: ['AVAILABLE', 'available', 'HOLD', 'hold', 'BOOKED', 'booked', 'SOLD', 'sold'], default: 'AVAILABLE' },
  keysLocation: { type: String },
  keys_location: { type: String },
  keys_remarks: { type: String },
  facing: { type: String },
  furnished_status: { type: String },
  parking_slots: { type: Number },
  owner_name: { type: String },
  owner_phone: { type: String },
  owner_email: { type: String },
  // Tenant information
  tenant_name: { type: String },
  tenant_contact: { type: String },
  tenant_start_date: { type: Date },
  tenant_end_date: { type: Date },
  listing_type: { type: String },
  availability_date: { type: Date },
  priceHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPriceHistory' }],
  // Additional fields for property form
  property_type: { type: String },
  looking_to: { type: String },
  city: { type: String },
  building_name: { type: String },
  config_type: { type: String },
  age: { type: Number },
  bathrooms: { type: Number },
  balconies: { type: Number },
  amenities: [{ type: String }],
  address_line1: { type: String },
  address_line2: { type: String },
  pincode: { type: String },
  landmark: { type: String },
  state: { type: String },
  // Commercial-specific fields
  locality: { type: String },
  possession_status: { type: String },
  zone_type: { type: String },
  location_hub: { type: String },
  property_condition: { type: String },
  ownership: { type: String },
  negotiable: { type: String },
  tax_govt_included: { type: String },
  dg_ups_included: { type: String },
  your_floor: { type: String },
  number_of_staircase: { type: Number },
  passenger_lifts: { type: Number },
  service_lifts: { type: Number },
  private_parking: { type: Number },
  public_parking: { type: Number },
  is_pre_leased: { type: String },
  commercial_amenities: [{ type: String }],
  maintenance_charges: { type: String },
  // Track which employee created this unit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
  // DigitalOcean Spaces media references
  mediaFiles: [{
    key: { type: String, required: true },   // full object key in Spaces
    name: { type: String },                  // original filename
    type: { type: String, enum: ['image', 'video', 'file'], default: 'file' },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

InventoryUnitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('InventoryUnit', InventoryUnitSchema);
