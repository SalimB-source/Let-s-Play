import React, { lazy, Suspense, useEffect, useState } from 'react';
import DrivingSchoolPage from './DrivingSchoolPage';
import { CITY_RUSH_CARS } from './cityRushRules.js';

const ViceCityFreeRoam = lazy(() => import('./ViceCityFreeRoam'));

// Two entry points only: road-code learning and the shared free-drive city.
// Race, story and tournament controllers are no longer imported by this route.
export default function ViceCityRushPage() {
  const [freeDrive, setFreeDrive] = useState(false);
  useEffect(() => {
    if (!freeDrive) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [freeDrive]);
  return <>
    <div hidden={freeDrive}><DrivingSchoolPage onFreeDrive={() => setFreeDrive(true)} /></div>
    {freeDrive && <main className="school-interface school-free-mode" aria-label="Conduite libre dans Vice City">
      <Suspense fallback={<div className="school-city-loading" role="status">Préparation de la ville…</div>}>
        <ViceCityFreeRoam carId={CITY_RUSH_CARS[0].id} onExit={() => setFreeDrive(false)} />
      </Suspense>
    </main>}
  </>;
}
