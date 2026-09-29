import React from 'react';
import { miragePowerIcon } from './miragePowerIcons';

/** Small, accessible image treatment shared by the HUD and power buttons. */
export default function MiragePowerIcon({ type, className = '', decorative = true }) {
  const icon = miragePowerIcon(type);
  return (
    <img
      className={`mirage-power-image${className ? ` ${className}` : ''}`}
      src={icon.src}
      alt={decorative ? '' : icon.alt}
      aria-hidden={decorative ? 'true' : undefined}
      width="48"
      height="48"
      loading="eager"
      decoding="async"
    />
  );
}
