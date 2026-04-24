<template>
  <div class="relative w-full h-full min-h-[300px] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
    <div ref="mapContainer" class="w-full h-full z-0"></div>
    
    <!-- Overlay Controls -->
    <div class="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
      <button @click="recenterMap" class="p-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-md text-cyan-400 hover:text-cyan-300 transition-colors shadow-lg" title="Recenter">
        <span>󰚙</span>
      </button>
      <button @click="clearPath" class="p-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-md text-rose-400 hover:text-rose-300 transition-colors shadow-lg" title="Clear Path">
        <span>󰃢</span>
      </button>
    </div>

    <!-- Map Info Overlay -->
    <div class="absolute bottom-2 left-2 z-[1000] px-3 py-1 bg-black/60 backdrop-blur-sm border border-zinc-800 rounded text-[10px] font-mono text-zinc-500">
      {{ coords.lat ? `${coords.lat}, ${coords.lon}` : 'WAITING FOR FIX...' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  coords: {
    type: Object,
    default: () => ({ lat: null, lon: null })
  },
  geofence: {
    type: Object,
    default: () => null // { lat, lon, radius }
  },
  points: {
    type: Array,
    default: () => [] // Array of { lat, lon, label, type }
  },
  showPath: {
    type: Boolean,
    default: true
  }
})

const mapContainer = ref(null)
let map = null
let marker = null
let geofenceCircle = null
let pathLine = null
let pathCoords = []
let pointMarkers = []

const initMap = () => {
  if (!mapContainer.value) return

  // Initialize map
  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: false
  }).setView([0, 0], 2)

  // Dark theme tiles (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map)

  // Custom User Marker (Cyan dot)
  const customIcon = L.divIcon({
    className: 'custom-gps-marker',
    html: '<div class="w-3 h-3 bg-cyan-400 rounded-full border-2 border-white shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  })

  marker = L.marker([0, 0], { icon: customIcon }).addTo(map)

  // Path line
  pathLine = L.polyline([], {
    color: '#22d3ee', // Cyan-400
    weight: 2,
    opacity: 0.5,
    dashArray: '5, 5'
  }).addTo(map)
}

const updateMarker = (lat, lon) => {
  if (!map || !marker || lat == null || lon == null) return

  const pos = [parseFloat(lat), parseFloat(lon)]
  marker.setLatLng(pos)
  
  if (props.showPath) {
    pathCoords.push(pos)
    if (pathCoords.length > 1000) pathCoords.shift()
    pathLine.setLatLngs(pathCoords)
  }

  // Auto-center if it's the first fix
  if (pathCoords.length === 1) {
    map.setView(pos, 15)
  }
}

const updateGeofence = () => {
  if (!map) return
  
  if (geofenceCircle) {
    map.removeLayer(geofenceCircle)
    geofenceCircle = null
  }

  if (props.geofence && props.geofence.lat) {
    geofenceCircle = L.circle([props.geofence.lat, props.geofence.lon], {
      radius: props.geofence.radius || 20,
      color: '#f43f5e', // Rose-500
      fillColor: '#f43f5e',
      fillOpacity: 0.1,
      weight: 1
    }).addTo(map)
  }
}

const updatePoints = () => {
  if (!map) return

  // Clear existing point markers
  pointMarkers.forEach(m => map.removeLayer(m))
  pointMarkers = []

  props.points.forEach(p => {
    if (!p.lat || !p.lon) return
    
    const icon = L.divIcon({
      className: 'point-marker',
      html: `<div class="w-2 h-2 rounded-full border border-white ${p.type === 'WIFI' ? 'bg-cyan-500' : 'bg-violet-500'}"></div>`,
      iconSize: [8, 8]
    })

    const m = L.marker([p.lat, p.lon], { icon }).addTo(map)
    if (p.label) m.bindTooltip(p.label, { className: 'map-tooltip' })
    pointMarkers.push(m)
  })
}

const recenterMap = () => {
  if (map && props.coords.lat) {
    map.flyTo([props.coords.lat, props.coords.lon], 16)
  }
}

const clearPath = () => {
  pathCoords = []
  if (pathLine) pathLine.setLatLngs([])
}

watch(() => props.coords, (newVal) => {
  if (newVal.lat && newVal.lon) {
    updateMarker(newVal.lat, newVal.lon)
  }
}, { deep: true })

watch(() => props.geofence, updateGeofence, { deep: true })
watch(() => props.points, updatePoints, { deep: true })

onMounted(() => {
  nextTick(() => {
    initMap()
    if (props.coords.lat) updateMarker(props.coords.lat, props.coords.lon)
    updateGeofence()
    updatePoints()
  })
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<style>
.custom-gps-marker {
  background: transparent;
  border: none;
}
.map-tooltip {
  background: #18181b !important; /* Zinc-900 */
  border: 1px solid #3f3f46 !important; /* Zinc-700 */
  color: #e4e4e7 !important; /* Zinc-200 */
  font-family: monospace;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}
.leaflet-container {
  background: #09090b !important; /* Zinc-950 */
}
</style>
