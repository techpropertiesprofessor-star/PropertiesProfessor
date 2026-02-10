import React, { useContext, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import defaultLogo from '../assets/companyLogo';
import defaultPhoto from '../assets/userPhoto';
import { FiCamera } from 'react-icons/fi';

const AVATAR_COLORS = [
  '#3b82f6', '#6366f1', '#10b981', '#f59e42', '#ef4444', '#a855f7', '#fbbf24', '#14b8a6'
];

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

export default function ProfilePage() {
  const { user, loading } = useContext(AuthContext);
  const cardRef = useRef();
  const fileInputRef = useRef();
  const [logo] = useState(defaultLogo);
  const [photo, setPhoto] = useState(defaultPhoto);
  const [isFlipped, setIsFlipped] = useState(false);

  // Determine theme colors based on role
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const themeColors = isManager 
    ? { primary: '#9333ea', light: '#a855f7', gradient1: '#a855f7', gradient2: '#c084fc', bgGradient: 'from-purple-50 via-white to-purple-100' }
    : { primary: '#2563eb', light: '#60a5fa', gradient1: '#2563eb', gradient2: '#60a5fa', bgGradient: 'from-blue-50 via-white to-blue-100' };

  // If user has a photo, use it
  React.useEffect(() => {
    if (user && user.photoUrl) setPhoto(user.photoUrl);
  }, [user]);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading profile...</div>;
  if (!user) return <div className="flex items-center justify-center min-h-screen">No user data found.</div>;

  // Generate QR code URL with full profile payload
  const profilePayload = {
    name: user.name,
    role: user.role || 'EMPLOYEE',
    email: user.email,
    phone: user.phone || '+91 99999 99999',
    id: (user._id || user.id || '').substring(0, 24)
  };
  const qrData = JSON.stringify(profilePayload);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  // Print handler - prints front side only
  const handlePrint = () => {
    const printContents = cardRef.current.querySelector('.card-front').innerHTML;
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>Employee ID Card</title>');
    win.document.write(`<style>
      body{margin:0;background:#fff;padding:40px;}
      .idcard-wrapper{
        width:320px;
        height:440px;
        margin:0 auto;
        border-radius:16px;
        background:white;
        border:1.5px solid ${themeColors.primary};
        position:relative;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:flex-start;
      }
      svg{position:absolute;top:0;left:0;z-index:0;}
      .header-row{position:relative;z-index:1;width:100%;display:flex;align-items:center;justify-content:flex-start;padding-left:0;padding-right:16px;}
      .logo{width:70px;height:70px;object-fit:contain;margin-right:12px;}
      .company-name{font-weight:700;font-size:16px;color:#fff;line-height:1.1;letter-spacing:0.5px;}
      .photo-section{position:relative;z-index:1;width:100%;display:flex;flex-direction:column;align-items:center;margin-top:8px;margin-bottom:2px;}
      .user-photo{width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid ${themeColors.primary};background:#fff;margin-bottom:2px;}
      .name-role{z-index:1;width:100%;text-align:center;margin-top:2px;}
      .user-name{font-weight:700;font-size:20px;color:#222;letter-spacing:0.5px;}
      .user-role{font-weight:500;font-size:13px;color:#444;margin-top:2px;margin-bottom:12px;letter-spacing:1px;text-transform:uppercase;}
      .info-section{z-index:1;width:85%;margin:0 auto;margin-top:4px;font-size:13px;color:#222;}
      .info-row{display:flex;margin-bottom:6px;}
      .info-label{width:70px;color:#222;font-weight:600;}
      .info-value{flex:1;color:#444;font-weight:400;}
    </style>`);
    win.document.write('</head><body>');
    win.document.write('<div class="idcard-wrapper">');
    win.document.write(printContents);
    win.document.write('</div>');
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  // Photo upload handler
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Avatar fallback if no photo
  const getAvatar = () => {
    const name = user?.name || user?.first_name || 'U';
    const color = stringToColor(name);
    return (
      <div style={{
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: 40,
        border: `4px solid ${themeColors.primary}`,
        boxShadow: `0 4px 16px ${themeColors.primary}30`
      }}>{name.charAt(0).toUpperCase()}</div>
    );
  };

  // Expiry date (1 year from join)
  let expiry = '-';
  if (user.createdAt) {
    const d = new Date(user.createdAt);
    d.setFullYear(d.getFullYear() + 1);
    expiry = d.toLocaleDateString();
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        
        {/* Flip Card Styles */}
        <style>{`
          .flip-card-container {
            perspective: 1000px;
            width: 320px;
            height: 440px;
            cursor: pointer;
          }
          
          .flip-card-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s;
            transform-style: preserve-3d;
          }
          
          .flip-card-container.flipped .flip-card-inner {
            transform: rotateY(180deg);
          }
          
          .card-front, .card-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 16px;
            background: white;
            box-shadow: 0 4px 24px rgba(30, 58, 138, 0.15);
            border: 1.5px solid;
          }
          
          .card-front {
            border-color: ${themeColors.primary};
          }
          
          .card-back {
            border-color: ${themeColors.primary};
            transform: rotateY(180deg);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, ${themeColors.gradient1}15 0%, ${themeColors.gradient2}15 100%);
            padding: 20px;
          }
          
          @media print {
            .flip-card-container {
              perspective: none !important;
              box-shadow: none !important;
            }
            
            .flip-card-inner {
              transform: none !important;
              box-shadow: none !important;
            }
            
            .card-back {
              display: none !important;
            }
            
            .card-front {
              position: relative !important;
              box-shadow: none !important;
              background: white !important;
            }
            
            .card-front * {
              box-shadow: none !important;
              text-shadow: none !important;
            }
            
            .print\\:hidden {
              display: none !important;
            }
          }
          
          @media (hover: hover) {
            .flip-card-container:hover {
              transform: scale(1.02);
              transition: transform 0.2s;
            }
          }
        `}</style>
        
        <main className={`flex-1 flex flex-col items-center justify-center py-8 px-2 overflow-y-auto bg-gradient-to-br ${themeColors.bgGradient}`}>
          <div className="w-full max-w-xs flex flex-col items-center mt-8">
            {/* Flip Card */}
            <div 
              ref={cardRef}
              className={`flip-card-container ${isFlipped ? 'flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flip-card-inner">
                {/* Front Side - ID Card */}
                <div className="card-front">
                  {/* Header Bar (matching back side) */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 70,
                    background: `linear-gradient(90deg, ${themeColors.gradient1} 0%, ${themeColors.gradient2} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingLeft: 20,
                    gap: 12,
                    zIndex: 1,
                    borderRadius: '16px 16px 0 0'
                  }}>
                    <img src={logo} alt="Company Logo" style={{width: 62, height: 62, objectFit: 'contain'}} />
                    <div style={{
                      fontWeight: 700,
                      fontSize: 17,
                      color: '#fff',
                      lineHeight: 1.2,
                      letterSpacing: 0.8
                    }}>
                      <span style={{color: '#fb8500'}}>Properties</span> Professor
                    </div>
                  </div>
                  
                  {/* Clean gradient background */}
                  <div style={{
                    position: 'absolute',
                    top: 70,
                    left: 0,
                    width: '100%',
                    height: 'calc(100% - 70px)',
                    background: `linear-gradient(135deg, ${themeColors.gradient1}15 0%, ${themeColors.gradient2}08 50%, ${themeColors.light}15 100%)`,
                    zIndex: 0,
                    borderRadius: '0 0 16px 16px'
                  }}></div>
                  
                  {/* Circular Avatar */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 90
                  }}>
                    {photo === defaultPhoto ? getAvatar() : (
                      <img 
                        src={photo} 
                        alt="User" 
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: `4px solid ${themeColors.primary}`,
                          background: '#fff',
                          boxShadow: `0 4px 16px ${themeColors.primary}30`
                        }} 
                      />
                    )}
                    <button
                      style={{
                        background: themeColors.primary,
                        border: 'none',
                        padding: 6,
                        cursor: 'pointer',
                        marginTop: -16,
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current && fileInputRef.current.click();
                      }}
                      title="Upload Photo"
                    >
                      <FiCamera size={14} style={{color: '#fff'}} />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      style={{display: 'none'}}
                    />
                  </div>
                  
                  {/* Employee Name */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    textAlign: 'center',
                    marginTop: 32
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 22,
                      color: '#1a1a1a',
                      letterSpacing: 0.3
                    }}>
                      {user.name}
                    </div>
                  </div>
                  
                  {/* Role */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    marginTop: 12
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '5px 18px',
                      background: `${themeColors.primary}15`,
                      borderRadius: 12,
                      fontWeight: 600,
                      fontSize: 11,
                      color: themeColors.primary,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase'
                    }}>
                      {user.role || 'EMPLOYEE'}
                    </div>
                  </div>
                  
                  {/* Employee ID */}
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    textAlign: 'center',
                    marginTop: 16,
                    fontSize: 10,
                    color: '#999',
                    fontWeight: 500,
                    letterSpacing: 0.5
                  }}>
                    ID: {(user._id || user.id || '-').substring(0, 24)}
                  </div>
                  
                  {/* Tap to flip hint */}
                  <div style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    zIndex: 10,
                    fontSize: 9,
                    color: themeColors.primary,
                    opacity: 0.6,
                    fontWeight: 600
                  }}>
                    Tap to flip →
                  </div>
                </div>
                
                {/* Back Side - QR Code */}
                <div className="card-back">
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 70,
                    background: `linear-gradient(90deg, ${themeColors.gradient1} 0%, ${themeColors.gradient2} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px 16px 0 0'
                  }}>
                    <span style={{color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: 1.2}}>EMPLOYEE PROFILE</span>
                  </div>
                  
                  {/* Clean gradient background */}
                  <div style={{
                    position: 'absolute',
                    top: 70,
                    left: 0,
                    width: '100%',
                    height: 'calc(100% - 70px)',
                    background: `linear-gradient(135deg, ${themeColors.gradient1}15 0%, ${themeColors.gradient2}08 50%, ${themeColors.light}15 100%)`,
                    zIndex: 0,
                    borderRadius: '0 0 16px 16px'
                  }}></div>
                  
                  <div style={{
                    position: 'relative',
                    zIndex: 1,
                    marginTop: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 20px'
                  }}>
                    {/* QR Code */}
                    <div style={{
                      width: 165,
                      height: 165,
                      background: 'white',
                      borderRadius: 16,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 6px 20px ${themeColors.primary}40`
                    }}>
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code" 
                        style={{width: '100%', height: '100%', objectFit: 'contain'}}
                      />
                    </div>
                    
                    {/* Contact Details */}
                    <div style={{
                      marginTop: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'center'
                    }}>
                      {/* Email */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: '#555',
                        fontWeight: 500
                      }}>
                        <span style={{fontSize: 14}}>✉️</span>
                        <span style={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {user.email || 'N/A'}
                        </span>
                      </div>
                      
                      {/* Phone */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        color: '#555',
                        fontWeight: 500
                      }}>
                        <span style={{fontSize: 14}}>📞</span>
                        <span>{user.phone || '+91 99999 99999'}</span>
                      </div>
                    </div>
                    
                    <div style={{fontSize: 11, color: '#666', textAlign: 'center', marginTop: 6, fontWeight: 500}}>
                      Scan for employee details
                    </div>
                  </div>
                  
                  {/* Tap to flip back hint */}
                  <div style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    fontSize: 9,
                    color: themeColors.primary,
                    opacity: 0.6,
                    fontWeight: 600
                  }}>
                    ← Tap to flip back
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePrint();
              }} 
              className="mt-6 px-6 py-2 text-white font-semibold rounded shadow print:hidden hover:opacity-90 transition-opacity"
              style={{background: `linear-gradient(90deg, ${themeColors.gradient1} 0%, ${themeColors.gradient2} 100%)`}}
            >
              Print ID Card
            </button>
            
            <div className="mt-4 text-center text-sm text-gray-600 print:hidden">
              <span className="text-xs">Click card to flip • QR code on back</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
