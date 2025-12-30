
import { GeoLocation } from '../types';

// Haversine formula to calculate distance between two points in feet
export const calculateDistanceFt = (p1: GeoLocation, p2: GeoLocation): number => {
  const R = 6371e3; // metres
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const dMeters = R * c;
  return dMeters * 3.28084; // Convert meters to feet
};

// Demo Mode State - Initialize from LocalStorage
let isDemo = typeof localStorage !== 'undefined' && localStorage.getItem('demo_mode') === 'true';

// Starting "Hotel" coordinates (Generic location)
const DEMO_START_LAT = 36.1699; 
const DEMO_START_LNG = -115.1398;

// Mutable state for "Random Walk" simulation
let currentSimLat = DEMO_START_LAT;
let currentSimLng = DEMO_START_LNG;

export const toggleDemoMode = (enabled: boolean) => {
  isDemo = enabled;
  // Reset simulation to start when toggled
  currentSimLat = DEMO_START_LAT;
  currentSimLng = DEMO_START_LNG;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('demo_mode', String(enabled));
  }
};

export const isDemoMode = () => isDemo;

// Standardized Accuracy Levels
export const getAccuracyLevel = (acc: number) => {
  if (acc <= 6) return { label: 'Excellent', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' };
  if (acc <= 15) return { label: 'Good', color: 'text-amber-700 border-amber-200 bg-amber-50' };
  if (acc <= 20) return { label: 'Fair', color: 'text-blue-700 border-blue-200 bg-blue-50' };
  return { label: 'Poor', color: 'text-red-700 border-red-200 bg-red-50' };
};

/**
 * Robust wrapper for navigator.geolocation with a Fail-Safe Watchdog Timer.
 * Prevents the app from freezing if the browser's native callback hangs.
 */
const getPosition = (options?: PositionOptions): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    // 1. Setup Watchdog Timer (Force fail after timeout + buffer)
    // Some browsers ignore the `timeout` option in the API, so we enforce it in JS.
    // Default to 10s if not specified, plus 1s buffer for the JS timer.
    const timeoutMs = (options?.timeout || 10000) + 1000;
    
    let timerId: any;
    
    const cleanup = () => {
        if (timerId) clearTimeout(timerId);
    };

    timerId = setTimeout(() => {
        cleanup();
        reject(new Error("GPS Request Timed Out (Watchdog Enforced)"));
    }, timeoutMs);

    // 2. call Native API
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            cleanup();
            resolve(pos);
        },
        (err) => {
            cleanup();
            reject(err);
        },
        options
    );
  });
};

export const getCurrentPosition = async (): Promise<GeoLocation> => {
  // 1. Check Demo Mode
  if (isDemo) {
    console.log("📍 Acquiring Demo GPS Position (Random Walk)...");
    
    const moveLat = (Math.random() - 0.5) * 0.0003; 
    const moveLng = (Math.random() - 0.5) * 0.0003; 
    
    currentSimLat += moveLat;
    currentSimLng += moveLng;
    
    const randomAccuracy = 3 + Math.random() * 4; 
    
    const mockLocation: GeoLocation = {
      lat: currentSimLat,
      lng: currentSimLng,
      accuracy: randomAccuracy,
      timestamp: Date.now(),
    };
    
    return new Promise(resolve => setTimeout(() => resolve(mockLocation), 300));
  }

  // 2. Check Browser Support
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser');
  }

  try {
    // 3. Attempt High Accuracy (GPS) - 5s Timeout for snappier feel
    const position = await getPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };
  } catch (error: any) {
    console.warn("High accuracy GPS failed, trying fallback...", error);

    try {
      // 4. Fallback to Lower Accuracy (Cell/Wifi) if GPS fails - 10s Timeout
      const fallbackPosition = await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
      return {
        lat: fallbackPosition.coords.latitude,
        lng: fallbackPosition.coords.longitude,
        accuracy: fallbackPosition.coords.accuracy,
        timestamp: fallbackPosition.timestamp,
      };
    } catch (fallbackError: any) {
      let msg = "Could not get location.";
      if (fallbackError.code === 1) msg = "Permission denied. Allow GPS.";
      else if (fallbackError.code === 2) msg = "Position unavailable.";
      else if (fallbackError.code === 3) msg = "GPS timeout.";
      
      throw new Error(msg);
    }
  }
};

/**
 * Smart GPS: Collects multiple samples over time to compute a weighted average.
 * Prevents "Freezing" by enforcing a strict resolution timeout.
 */
export const getSmartPosition = async (): Promise<GeoLocation> => {
  if (isDemoMode()) {
    await new Promise(r => setTimeout(r, 1500));
    return getCurrentPosition();
  }

  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported');
  }

  return new Promise((resolve, reject) => {
    const samples: GeolocationPosition[] = [];
    const maxSamples = 5;
    const collectionTime = 3000; // 3 seconds max sampling

    let finished = false;
    let watcherId: number | null = null;
    let timerId: any = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      
      if (watcherId !== null) navigator.geolocation.clearWatch(watcherId);
      if (timerId) clearTimeout(timerId);

      if (samples.length === 0) {
         // Fallback to single shot if stream failed, but ensure it doesn't hang
         console.log("Smart GPS: No samples, fallback to single.");
         // Important: Pass timeout to fallback to prevent freeze
         getPosition({ timeout: 5000, maximumAge: 0 })
            .then((pos) => resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp
            }))
            .catch((err) => reject(new Error("GPS Signal Lost: " + err.message)));
         return;
      }

      // 1. Sort by accuracy
      samples.sort((a, b) => a.coords.accuracy - b.coords.accuracy);

      // 2. Filter outliers (keep top 60%)
      const cutoff = Math.ceil(samples.length * 0.6);
      const bestSamples = samples.slice(0, cutoff);

      // 3. Weighted Average
      let sumLat = 0;
      let sumLng = 0;
      let totalWeight = 0;

      bestSamples.forEach(p => {
         const w = 1 / Math.max(p.coords.accuracy, 1);
         sumLat += p.coords.latitude * w;
         sumLng += p.coords.longitude * w;
         totalWeight += w;
      });

      resolve({
        lat: sumLat / totalWeight,
        lng: sumLng / totalWeight,
        accuracy: bestSamples[0].coords.accuracy,
        timestamp: Date.now()
      });
    };

    // Watch for positions
    watcherId = navigator.geolocation.watchPosition(
      (pos) => {
        if (Date.now() - pos.timestamp < 5000) {
            samples.push(pos);
        }
        // Early exit if we have great data
        if (samples.length >= maxSamples && pos.coords.accuracy <= 6) {
            finish();
        }
      },
      (err) => {
         console.warn("Smart GPS Stream Error:", err);
         // Don't reject yet, wait for timer to finish with what we have
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 4000 }
    );

    // Hard Stop Timer - Prevents freezing
    timerId = setTimeout(finish, collectionTime);
  });
};


export const formatCoords = (geo?: GeoLocation) => {
  if (!geo) return 'Not set';
  return `${geo.lat.toFixed(7)}, ${geo.lng.toFixed(7)}`;
};
