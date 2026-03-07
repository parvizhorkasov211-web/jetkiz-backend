import L from 'leaflet';

export function getCourierIcon(status: 'online' | 'busy') {
  const color = status === 'busy' ? '#f59e0b' : '#22c55e';

  return L.divIcon({
    className: 'courier-marker-wrapper',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: ${color};
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 2px rgba(0,0,0,0.18);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}