import React, { useState, useEffect, useRef } from 'react';

function CountdownTimer({ expiresAt, onExpire, className = '' }) {
  const [remaining, setRemaining] = useState(() => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });
  const expiredRef = useRef(false);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const ms = target - Date.now();
      const secs = Math.max(0, Math.floor(ms / 1000));
      setRemaining(secs);

      if (secs <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        if (onExpire) onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (remaining <= 0) {
    return (
      <span className={`text-red-500 font-semibold text-xs ${className}`}>
        Expired
      </span>
    );
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const timeStr = hours > 0
    ? `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
    : minutes > 0
      ? `${minutes}m ${String(seconds).padStart(2, '0')}s`
      : `${seconds}s`;

  // Color tiers
  let colorClass = 'text-green-600';
  let pulseClass = '';
  if (remaining <= 300) {
    colorClass = 'text-red-600';
    pulseClass = 'animate-pulse';
  } else if (remaining <= 1800) {
    colorClass = 'text-amber-600';
  }

  const totalDuration = new Date(expiresAt).getTime() - (Date.now() - remaining * 1000 + remaining * 1000);

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2">
        <span className={`font-mono font-semibold text-sm ${colorClass} ${pulseClass}`}>
          {timeStr}
        </span>
        <span className="text-xs text-gray-500">remaining</span>
      </div>
    </div>
  );
}

export default CountdownTimer;
