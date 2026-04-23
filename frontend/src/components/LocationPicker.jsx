import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icons broken by Vite bundling
function fixLeafletIcons(L) {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

// Nominatim reverse geocode
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'AgendaYa/1.0' } }
    )
    const data = await res.json()
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// Nominatim forward search
async function searchAddress(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      { headers: { 'Accept-Language': 'es', 'User-Agent': 'AgendaYa/1.0' } }
    )
    return await res.json()
  } catch {
    return []
  }
}

export default function LocationPicker({ initialLat, initialLng, initialAddress, onChange }) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const leafletRef = useRef(null)
  const containerRef = useRef(null)

  const [address, setAddress] = useState(initialAddress ?? '')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)

  useEffect(() => {
    if (mapRef.current) return
    let L
    import('leaflet').then((mod) => {
      L = mod.default
      leafletRef.current = L
      fixLeafletIcons(L)

      const defaultLat = initialLat ?? 19.4326
      const defaultLng = initialLng ?? -99.1332
      const zoom = initialLat ? 15 : 5

      const map = L.map(containerRef.current, { zoomControl: true }).setView([defaultLat, defaultLng], zoom)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      if (initialLat && initialLng) {
        const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map)
        markerRef.current = marker
        marker.on('dragend', async () => {
          const { lat, lng } = marker.getLatLng()
          const addr = await reverseGeocode(lat, lng)
          setAddress(addr)
          onChange(lat, lng, addr)
        })
      }

      map.on('click', async (e) => {
        const { lat, lng } = e.latlng
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr)
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
          markerRef.current = marker
          marker.on('dragend', async () => {
            const { lat: la, lng: lo } = marker.getLatLng()
            const a = await reverseGeocode(la, lo)
            setAddress(a)
            onChange(la, lo, a)
          })
        }
        onChange(lat, lng, addr)
      })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [])

  const handleSearchInput = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(searchTimer.current)
    if (q.trim().length < 3) { setSuggestions([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const results = await searchAddress(q)
      setSuggestions(results)
      setSearching(false)
    }, 500)
  }

  const selectSuggestion = async (item) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    const addr = item.display_name
    setSuggestions([])
    setSearchQuery('')
    setAddress(addr)

    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return

    map.setView([lat, lng], 16)
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerRef.current = marker
      marker.on('dragend', async () => {
        const { lat: la, lng: lo } = marker.getLatLng()
        const a = await reverseGeocode(la, lo)
        setAddress(a)
        onChange(la, lo, a)
      })
    }
    onChange(lat, lng, addr)
  }

  return (
    <div className="space-y-3">
      {/* Search box */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchInput}
          placeholder="Buscar dirección..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        {searching && (
          <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
        )}
        {suggestions.length > 0 && (
          <ul className="absolute z-[9999] w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto text-sm">
            {suggestions.map((s) => (
              <li
                key={s.place_id}
                onClick={() => selectSuggestion(s)}
                className="px-3 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0 text-gray-700"
              >
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        style={{ height: 300, borderRadius: 12, border: '1px solid #e5e7eb', zIndex: 0 }}
      />

      {/* Selected address display */}
      {address && (
        <p className="text-xs text-gray-500 flex items-start gap-1">
          <span>📍</span>
          <span>{address}</span>
        </p>
      )}

      <p className="text-xs text-gray-400">
        Haz clic en el mapa o busca la dirección para marcar la ubicación. Puedes arrastrar el pin para ajustar.
      </p>
    </div>
  )
}
