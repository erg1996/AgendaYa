import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

function fixLeafletIcons(L) {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

export default function LocationMap({ lat, lng, brand }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    import('leaflet').then((mod) => {
      const L = mod.default
      fixLeafletIcons(L)

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
      }).setView([lat, lng], 15)

      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (brand) {
        const color = brand.replace('#', '')
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 34" width="24" height="34">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 22 12 22s12-13 12-22C24 5.37 18.63 0 12 0z" fill="#${color}"/>
            <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
          </svg>`
        const icon = L.divIcon({
          html: svg,
          className: '',
          iconSize: [24, 34],
          iconAnchor: [12, 34],
          popupAnchor: [0, -34],
        })
        L.marker([lat, lng], { icon }).addTo(map)
      } else {
        L.marker([lat, lng]).addTo(map)
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      style={{ height: 200, borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', zIndex: 0 }}
    />
  )
}
