import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
// Replace with your actual logo file
import logo from "../assets/companyLogo.js";
import { AuthContext } from "../context/AuthContext";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, error, setError } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel - Enhanced */}
      <div className="hidden md:flex w-2/5 flex-col justify-between bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 relative p-8 overflow-hidden">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-600/20 animate-pulse" style={{ animationDuration: '3s' }}></div>
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite'
          }}></div>
        </div>
        
        <div className="relative z-10">
          <img src={logo} alt="Company Logo" className="h-64 w-64 mb-8 mx-auto drop-shadow-2xl transform hover:scale-105 transition-transform duration-300" />
          <h1 className="text-4xl font-extrabold text-center tracking-wide mb-3" style={{ letterSpacing: '0.05em' }}>
            <span className="drop-shadow-lg" style={{ color: '#fb8500' }}>PROPERTIES</span>
            <br />
            <span className="text-white drop-shadow-lg">PROFESSOR</span>
          </h1>
          <p className="text-white text-center text-lg opacity-90 font-light">
            Real Estate Solutions
          </p>
        </div>
        
        {/* Enhanced city/building pattern */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <svg
            className="w-full h-48 opacity-20"
            fill="none"
            viewBox="0 0 400 200"
          >
            <g fill="#fff">
              <rect x="20" y="120" width="40" height="80" />
              <rect x="80" y="100" width="30" height="100" />
              <rect x="130" y="140" width="25" height="60" />
              <rect x="170" y="110" width="35" height="90" />
              <rect x="220" y="130" width="30" height="70" />
              <rect x="270" y="150" width="20" height="50" />
              <rect x="310" y="120" width="40" height="80" />
            </g>
          </svg>
        </div>
      </div>

      {/* Right Login Card - With Background Image */}
      <div
        className="flex-1 flex items-center justify-center bg-gray-50 relative p-6"
        style={{
          backgroundImage: "url('/realestate-bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Enhanced overlay for glassmorphism effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-indigo-500/20 backdrop-blur-[2px]"></div>
        
        {/* Login Card with glassmorphism effect */}
        <div 
          className="w-full max-w-md rounded-2xl p-8 relative z-10 login-card-enter backdrop-blur-md border border-white/20"
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 1px rgba(255,255,255,0.3)',
            animation: 'cardEnter 0.4s ease-out'
          }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg" style={{ letterSpacing: '-0.02em' }}>
              <span style={{ color: '#FB8500' }}>Properties</span> Professor
            </h2>
            <p className="text-sm font-medium drop-shadow-md" style={{ color: '#006466' }}>
              Employee Management System
            </p>
          </div>
          
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (typeof setError === 'function') setError("");
              setLoading(true);
              try {
                await login(email, password);
                navigate("/dashboard");
              } catch (err) {
                // error is set in context
              } finally {
                setLoading(false);
              }
            }}
          >
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-100 px-4 py-3 rounded-xl mb-6 text-center text-sm font-medium animate-shake">
                {error}
              </div>
            )}
            
            {/* Email Input with Icon */}
            <div className="mb-5">
              <label className="block font-semibold mb-2 text-sm drop-shadow-md" style={{ color: '#000000' }}>
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 backdrop-blur-sm"
                  placeholder="Enter your email"
                  required
                  style={{ height: '48px', background: 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            </div>
            
            {/* Password Input with Icon */}
            <div className="mb-6 relative">
              <label className="block font-semibold mb-2 text-sm drop-shadow-md" style={{ color: '#000000' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent transition-all duration-200 text-white placeholder-white/60 backdrop-blur-sm"
                  placeholder="Enter your password"
                  required
                  style={{ height: '48px', background: 'rgba(255, 255, 255, 0.1)' }}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-blue-300 transition-colors duration-200"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            {/* Modern Gradient Button */}
            <button
              type="submit"
              className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 relative overflow-hidden group"
              disabled={loading}
              style={{
                height: '48px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                boxShadow: loading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }
              }}
              onMouseDown={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(1px)';
                }
              }}
              onMouseUp={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
            >
              <span className="relative z-10">
                {loading ? "Signing In..." : "Sign In"}
              </span>
              {!loading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style>{`
        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes gridMove {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(50px);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .login-card-enter {
            margin: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
