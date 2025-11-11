/**
 * MapView Component
 * Simple map view for displaying a single location
 */

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface MapViewProps {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  height?: string;
  zoom?: number;
}

export function MapView({
  lat,
  lng,
  title,
  description,
  height = '300px',
  zoom = 15,
}: MapViewProps) {
  return (
    <div style={{ height, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[lat, lng]}>
          {(title || description) && (
            <Popup>
              {title && <h3 style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{title}</h3>}
              {description && <p style={{ margin: 0 }}>{description}</p>}
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}

