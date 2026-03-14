import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { propertyAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';

function PropertyDetailsPage() {
  const { id } = useParams();
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await propertyAPI.getById(id);
        setProperty(res.data);
      } catch (err) {
        console.error('Failed to fetch property:', err);
        setError(err.response?.data?.message || 'Failed to load property details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProperty();
  }, [id]);

  const getStatusColor = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'AVAILABLE': return 'bg-green-100 text-green-700';
      case 'BOOKED': return 'bg-blue-100 text-blue-700';
      case 'HOLD': return 'bg-yellow-100 text-yellow-700';
      case 'SOLD': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    if (price >= 10000000) return `${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `${(price / 100000).toFixed(2)} Lac`;
    return price.toLocaleString('en-IN');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {/* Back button */}
            <button
              onClick={() => window.history.back()}
              className="mb-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600 font-semibold">{error}</p>
              </div>
            )}

            {!loading && !error && property && (
              <>
                {/* Header Card */}
                <div className="bg-white/90 rounded-2xl shadow-xl border border-indigo-100 p-6 sm:p-8 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight">
                        {property.project?.name || property.building_name || 'Property Details'}
                      </h1>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {property.tower?.name && (
                          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{property.tower.name}</span>
                        )}
                        {property.unitNumber && (
                          <span className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-medium">Unit {property.unitNumber}</span>
                        )}
                        {property.bhk && (
                          <span className="text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full font-medium">{property.bhk} BHK</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${getStatusColor(property.status)}`}>
                        {property.status || 'N/A'}
                      </span>
                      {property.listing_type && (
                        <span className="px-4 py-2 rounded-full text-sm font-bold uppercase bg-blue-100 text-blue-700">
                          For {property.listing_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Pricing Card */}
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Pricing
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-gray-500">Base Price</span><span className="font-semibold text-gray-900">{formatPrice(property.base_price)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Final Price</span><span className="font-bold text-indigo-700 text-lg">{formatPrice(property.final_price)}</span></div>
                      {property.price_per_sqft > 0 && <div className="flex justify-between"><span className="text-gray-500">Price/Sq.ft</span><span className="font-semibold text-gray-900">{property.price_per_sqft?.toLocaleString('en-IN')}</span></div>}
                    </div>
                  </div>

                  {/* Area & Floor Card */}
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      Area & Floor
                    </h2>
                    <div className="space-y-3">
                      {property.super_area > 0 && <div className="flex justify-between"><span className="text-gray-500">Super Area</span><span className="font-semibold">{property.super_area} sq.ft</span></div>}
                      {property.built_up_area > 0 && <div className="flex justify-between"><span className="text-gray-500">Built-up Area</span><span className="font-semibold">{property.built_up_area} sq.ft</span></div>}
                      {property.carpet_area > 0 && <div className="flex justify-between"><span className="text-gray-500">Carpet Area</span><span className="font-semibold">{property.carpet_area} sq.ft</span></div>}
                      {property.floor_number != null && <div className="flex justify-between"><span className="text-gray-500">Floor</span><span className="font-semibold">{property.floor_number}{property.total_floors ? ` / ${property.total_floors}` : ''}</span></div>}
                    </div>
                  </div>

                  {/* Features Card */}
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Features
                    </h2>
                    <div className="space-y-3">
                      {property.facing && <div className="flex justify-between"><span className="text-gray-500">Facing</span><span className="font-semibold capitalize">{property.facing}</span></div>}
                      {property.furnished_status && <div className="flex justify-between"><span className="text-gray-500">Furnished</span><span className="font-semibold capitalize">{property.furnished_status}</span></div>}
                      {property.parking_slots > 0 && <div className="flex justify-between"><span className="text-gray-500">Parking</span><span className="font-semibold">{property.parking_slots} slots</span></div>}
                      {property.bathrooms > 0 && <div className="flex justify-between"><span className="text-gray-500">Bathrooms</span><span className="font-semibold">{property.bathrooms}</span></div>}
                      {property.balconies > 0 && <div className="flex justify-between"><span className="text-gray-500">Balconies</span><span className="font-semibold">{property.balconies}</span></div>}
                    </div>
                  </div>

                  {/* Location Card */}
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Location
                    </h2>
                    <div className="space-y-3">
                      {property.location && <div className="flex justify-between"><span className="text-gray-500">Location</span><span className="font-semibold">{property.location}</span></div>}
                      {property.city && <div className="flex justify-between"><span className="text-gray-500">City</span><span className="font-semibold">{property.city}</span></div>}
                      {property.project?.location && <div className="flex justify-between"><span className="text-gray-500">Project Location</span><span className="font-semibold">{property.project.location}</span></div>}
                      {property.keys_location && <div className="flex justify-between"><span className="text-gray-500">Keys Location</span><span className="font-semibold">{property.keys_location}</span></div>}
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Amenities</h2>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">{amenity}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Gallery */}
                {property.mediaFiles && property.mediaFiles.length > 0 && (
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Media</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {property.mediaFiles.filter(m => m.type === 'image').map((media, idx) => (
                        <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                          <img
                            src={`https://${process.env.REACT_APP_SPACES_ENDPOINT || 'sgp1.digitaloceanspaces.com'}/${process.env.REACT_APP_SPACES_NAME || 'properties-media'}/${media.key}`}
                            alt={media.name || `Property image ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Description */}
                {property.project?.description && (
                  <div className="bg-white/90 rounded-2xl shadow-lg border border-indigo-100 p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Project Description</h2>
                    <p className="text-gray-700 leading-relaxed">{property.project.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PropertyDetailsPage;
