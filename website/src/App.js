import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
      <div className="max-w-2xl text-center px-6 py-12 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-200 mb-2">Real Estate Company</p>
        <h1 className="text-4xl font-bold mb-4">Flagship Website Coming Soon</h1>
        <p className="text-lg text-blue-100 mb-6">
          Public landing site with services, properties, testimonials, and contact forms is in progress.
        </p>
        <div className="flex justify-center space-x-3 text-sm text-blue-100">
          <span>Branding</span>
          <span>•</span>
          <span>Lead Capture</span>
          <span>•</span>
          <span>Company Story</span>
        </div>
      </div>
    </div>
  );
}

export default App;
