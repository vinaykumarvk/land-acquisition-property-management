/**
 * Map Utility Functions
 * Helper functions for map operations and coordinate calculations
 */

/**
 * Calculate distance between two coordinates (in meters)
 * Uses Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Validate coordinates
 */
export function isValidCoordinate(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number | null, lng: number | null, precision: number = 7): string {
  if (!isValidCoordinate(lat, lng)) {
    return 'Not set';
  }
  return `${Number(lat).toFixed(precision)}, ${Number(lng).toFixed(precision)}`;
}

/**
 * Get center point of multiple coordinates
 */
export function getCenterPoint(coordinates: Array<{ lat: number; lng: number }>): [number, number] | null {
  if (coordinates.length === 0) return null;
  
  const sumLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
  const sumLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);
  
  return [sumLat / coordinates.length, sumLng / coordinates.length];
}

/**
 * Get bounding box for multiple coordinates
 */
export function getBoundingBox(coordinates: Array<{ lat: number; lng: number }>): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (coordinates.length === 0) return null;
  
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Generate Google Maps link
 */
export function getGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Generate OpenStreetMap link
 */
export function getOpenStreetMapLink(lat: number, lng: number, zoom: number = 15): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`;
}

