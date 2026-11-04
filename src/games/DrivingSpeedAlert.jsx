import React from 'react';

export default function DrivingSpeedAlert({ status }) {
  if (!status?.showWarning) return null;
  return <div className="driving-speed-alert" role="alert" aria-live="assertive" aria-atomic="true">
    <strong>⚠ EXCÈS DE VITESSE — RALENTISSEZ</strong>
    <span>Vitesse {status.speed.toFixed(1)} km/h · maximum autorisé {status.limit} km/h</span>
  </div>;
}
