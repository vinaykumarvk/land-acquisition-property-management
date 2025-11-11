/**
 * CoordinatePicker Component
 * Allows users to pick coordinates by clicking on a map
 */

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CoordinatePickerProps {
  lat?: number | null;
  lng?: number | null;
  onCoordinateChange: (lat: number, lng: number) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
  disabled?: boolean;
}

// Component to handle map clicks
function MapClickHandler({
  onCoordinateChange,
  disabled,
}: {
  onCoordinateChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        const { lat, lng } = e.latlng;
        onCoordinateChange(lat, lng);
      }
    },
  });
  return null;
}

export function CoordinatePicker({
  lat,
  lng,
  onCoordinateChange,
  height = '400px',
  center = [20.5937, 78.9629], // Default: Center of India
  zoom = 10,
  disabled = false,
}: CoordinatePickerProps) {
  const [currentLat, setCurrentLat] = useState<number | null>(lat || null);
  const [currentLng, setCurrentLng] = useState<number | null>(lng || null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setCurrentLat(lat);
      setCurrentLng(lng);
      if (lat !== null && lng !== null) {
        setMapCenter([lat, lng]);
      }
    }
  }, [lat, lng]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setCurrentLat(newLat);
    setCurrentLng(newLng);
    onCoordinateChange(newLat, newLng);
  };

  const handleManualInput = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      if (field === 'lat') {
        setCurrentLat(numValue);
        if (currentLng !== null) {
          onCoordinateChange(numValue, currentLng);
          setMapCenter([numValue, currentLng]);
        }
      } else {
        setCurrentLng(numValue);
        if (currentLat !== null) {
          onCoordinateChange(currentLat, numValue);
          setMapCenter([currentLat, numValue]);
        }
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          onCoordinateChange(latitude, longitude);
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please select on the map or enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="0.0000001"
            value={currentLat?.toFixed(7) || ''}
            onChange={(e) => handleManualInput('lat', e.target.value)}
            placeholder="e.g., 20.5937"
            disabled={disabled}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="0.0000001"
            value={currentLng?.toFixed(7) || ''}
            onChange={(e) => handleManualInput('lng', e.target.value)}
            placeholder="e.g., 78.9629"
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGetCurrentLocation}
          disabled={disabled}
          title="Get current location"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          key={`${mapCenter[0]}-${mapCenter[1]}`} // Force re-render when center changes
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onCoordinateChange={handleMapClick} disabled={disabled} />

          {currentLat !== null && currentLng !== null && (
            <Marker position={[currentLat, currentLng]}>
              <Popup>
                <div className="text-center">
                  <MapPin className="h-4 w-4 mx-auto mb-1" />
                  <p className="text-sm font-medium">Selected Location</p>
                  <p className="text-xs text-muted-foreground">
                    {currentLat.toFixed(7)}, {currentLng.toFixed(7)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {!disabled && (
        <p className="text-sm text-muted-foreground">
          Click on the map to select coordinates, or enter them manually above.
        </p>
      )}
    </div>
  );
}
