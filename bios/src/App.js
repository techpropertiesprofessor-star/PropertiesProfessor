import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthenticated(true);
      loadSystemStatus();
      const interval = setInterval(loadSystemStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  const loadSystemStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/api/bios/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemStatus(response.data.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setAuthenticated(false);
        localStorage.removeItem('token');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try to login
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        if (user.role?.toLowerCase() !== 'super_admin' && user.role?.toLowerCase() !== 'superadmin') {
          setError('SUPER ADMIN ACCESS REQUIRED');
          setLoading(false);
          return;
        }

        localStorage.setItem('token', token);
        setAuthenticated(true);
      }
    } catch (err) {
      setError('AUTHENTICATION FAILED');
    } finally {
      setLoading(false);
    }
  };

  const getStatusSymbol = (status) => {
    switch (status) {
      case 'GREEN': return '[OK]';
      case 'YELLOW': return '[WARN]';
      case 'RED': return '[FAIL]';
      default: return '[????]';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'GREEN': return 'status-green';
      case 'YELLOW': return 'status-yellow';
      case 'RED': return 'status-red';
      default: return 'status-unknown';
    }
  };

  if (!authenticated) {
    return (
      <div className="bios-container">
        <pre style={{ marginBottom: '20px' }}>
{`╔═══════════════════════════════════════════════════════════╗
║                    BIOS SYSTEM PANEL                      ║
║                  SUPER ADMIN ACCESS ONLY                  ║
╚═══════════════════════════════════════════════════════════╝`}
        </pre>

        {error && (
          <pre style={{ color: '#f00', marginBottom: '10px' }}>
ERROR: {error}
          </pre>
        )}

        <form onSubmit={handleLogin}>
          <pre>
EMAIL:    <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                background: '#000',
                color: '#0f0',
                border: '1px solid #0f0',
                padding: '5px',
                fontFamily: 'inherit',
                width: '300px'
              }}
              autoFocus
            />
          </pre>
          <pre>
PASSWORD: <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: '#000',
                color: '#0f0',
                border: '1px solid #0f0',
                padding: '5px',
                fontFamily: 'inherit',
                width: '300px'
              }}
            />
          </pre>
          <pre style={{ marginTop: '10px' }}>
Press ENTER to authenticate...
          </pre>
        </form>

        {loading && (
          <pre className="blink" style={{ marginTop: '20px' }}>
AUTHENTICATING...
          </pre>
        )}
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div className="bios-container">
        <pre className="blink">LOADING SYSTEM DIAGNOSTICS...</pre>
      </div>
    );
  }

  const uptime = systemStatus.uptime || 0;
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);

  return (
    <div className="bios-container">
      <pre style={{ marginBottom: '20px' }}>
{`╔═══════════════════════════════════════════════════════════╗
║                    BIOS SYSTEM PANEL                      ║
║                   System Health Monitor                   ║
╚═══════════════════════════════════════════════════════════╝

OVERALL STATUS: `}<span className={getStatusClass(systemStatus.overallStatus)}>{systemStatus.overallStatus}</span>{`

UPTIME: ${String(uptimeHours).padStart(2, '0')}:${String(uptimeMinutes).padStart(2, '0')}:${String(uptimeSeconds).padStart(2, '0')}

╔═══════════════════════════════════════════════════════════╗
║                  COMPONENT STATUS                         ║
╚═══════════════════════════════════════════════════════════╝
`}
      </pre>

      {systemStatus.components && systemStatus.components.map((component) => (
        <pre key={component.component} style={{ marginBottom: '10px' }}>
<span className={getStatusClass(component.status)}>
{`${getStatusSymbol(component.status)} ${component.component.padEnd(15)} `}
</span>
{component.responseTime && `${component.responseTime}ms`}
{component.message && `\n    ${component.message}`}
        </pre>
      ))}

      <pre style={{ marginTop: '20px' }}>
{`╔═══════════════════════════════════════════════════════════╗
║                  SYSTEM RESOURCES                         ║
╚═══════════════════════════════════════════════════════════╝`}
      </pre>

      {systemStatus.systemInfo && (
        <pre style={{ marginTop: '10px' }}>
{`HOSTNAME:  ${systemStatus.systemInfo.hostname}
PLATFORM:  ${systemStatus.systemInfo.platform} (${systemStatus.systemInfo.arch})
NODE:      ${systemStatus.systemInfo.nodeVersion}
CPUs:      ${systemStatus.systemInfo.cpus}
MEMORY:    ${(systemStatus.systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(systemStatus.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`}
        </pre>
      )}

      <pre style={{ marginTop: '20px', opacity: 0.5 }}>
{`───────────────────────────────────────────────────────────
Auto-refresh: 5s | Press F5 to manual refresh
───────────────────────────────────────────────────────────`}
      </pre>
    </div>
  );
}

export default App;
