/**
 * ParcelMap Component
 * Displays parcels on an interactive map with markers
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
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

interface Parcel {
  id: number;
  parcelNo: string;
  village: string;
  taluka: string;
  district: string;
  lat: number | null;
  lng: number | null;
  areaSqM: number;
  status: string;
}

interface ParcelMapProps {
  parcels: Parcel[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  height?: string;
  onParcelClick?: (parcel: Parcel) => void;
  showPopup?: boolean;
}

// Component to handle map bounds when parcels change
function MapBoundsUpdater({ parcels }: { parcels: Parcel[] }) {
  const map = useMap();

  useEffect(() => {
    const validParcels = parcels.filter(p => p.lat !== null && p.lng !== null);
    
    if (validParcels.length === 0) return;
    
    if (validParcels.length === 1) {
      // Single parcel - center on it
      const parcel = validParcels[0];
      map.setView([Number(parcel.lat), Number(parcel.lng)], 15);
    } else {
      // Multiple parcels - fit bounds
      const bounds = L.latLngBounds(
        validParcels.map(p => [Number(p.lat), Number(p.lng)] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [parcels, map]);

  return null;
}

export function ParcelMap({
  parcels,
  center = [20.5937, 78.9629], // Default: Center of India
  zoom = 6,
  height = '400px',
  onParcelClick,
  showPopup = true,
}: ParcelMapProps) {
  const validParcels = parcels.filter(p => p.lat !== null && p.lng !== null);

  // Status-based marker colors
  const getMarkerColor = (status: string): string => {
    switch (status) {
      case 'unaffected':
        return '#94a3b8'; // Gray
      case 'under_acq':
        return '#f59e0b'; // Amber
      case 'awarded':
        return '#3b82f6'; // Blue
      case 'possessed':
        return '#10b981'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };

  const createCustomIcon = (status: string) => {
    const color = getMarkerColor(status);
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsUpdater parcels={parcels} />

        {validParcels.map((parcel) => (
          <Marker
            key={parcel.id}
            position={[Number(parcel.lat), Number(parcel.lng)]}
            icon={createCustomIcon(parcel.status)}
            eventHandlers={{
              click: () => {
                if (onParcelClick) {
                  onParcelClick(parcel);
                }
              },
            }}
          >
            {showPopup && (
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                    {parcel.parcelNo}
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    <strong>Village:</strong> {parcel.village}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    <strong>Taluka:</strong> {parcel.taluka}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    <strong>District:</strong> {parcel.district}
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    <strong>Area:</strong> {Number(parcel.areaSqM).toLocaleString()} sq m
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    <strong>Status:</strong> {parcel.status.replace('_', ' ')}
                  </p>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

