import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

export default function PermissionsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            {/* Modern Info Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-8 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">Permissions Management</h2>
                    <p className="text-blue-100 mt-1">Control access and privileges</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Info Section */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Management Location</h3>
                      <p className="text-gray-600 leading-relaxed">
                        Permissions are now managed directly within each employee's detail view for better context and easier administration.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Available Features</h4>
                  {[
                    { icon: '👥', title: 'Employee-Specific Control', desc: 'Manage permissions per employee' },
                    { icon: '🔐', title: 'Granular Access', desc: 'Control access to individual pages' },
                    { icon: '⚡', title: 'Real-Time Updates', desc: 'Changes apply immediately' },
                    { icon: '🎯', title: 'Role-Based Defaults', desc: 'Smart defaults based on employee role' }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-2xl">{feature.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{feature.title}</div>
                        <div className="text-xs text-gray-500">{feature.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate('/employees')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Go to Employees
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Navigate to Employees → Select an employee → View permissions section
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
