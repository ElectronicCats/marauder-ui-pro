<template>
  <div class="h-full flex flex-col gap-4">
    <!-- Status Bar -->
    <div class="grid grid-cols-3 lg:grid-cols-7 gap-2">
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center">
        <div class="text-xs text-zinc-500">Fix</div>
        <div class="text-sm font-mono" :class="gps.fix ? 'text-emerald-400' : 'text-rose-400'">
          {{ gps.fix ? 'Yes' : 'No' }}
        </div>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center">
        <div class="text-xs text-zinc-500">Sats</div>
        <div class="text-sm font-mono text-zinc-100">{{ gps.sats ?? '--' }}</div>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center">
        <div class="text-xs text-zinc-500">Lat</div>
        <div class="text-sm font-mono text-zinc-100">{{ gps.lat ?? '--' }}</div>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center">
        <div class="text-xs text-zinc-500">Lon</div>
        <div class="text-sm font-mono text-zinc-100">{{ gps.lon ?? '--' }}</div>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center">
        <div class="text-xs text-zinc-500">Alt</div>
        <div class="text-sm font-mono text-zinc-100">{{ gps.alt != null ? gps.alt + 'm' : '--' }}</div>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center">
        <div class="text-xs text-zinc-500">Accuracy</div>
        <div class="text-sm font-mono text-zinc-100">{{ gps.accuracy ?? '--' }}</div>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800 rounded p-2 text-center col-span-3 lg:col-span-1">
        <div class="text-xs text-zinc-500">Date/Time</div>
        <div class="text-sm font-mono text-zinc-100 truncate">{{ gps.datetime ?? '--' }}</div>
      </div>
    </div>

    <div class="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
      <!-- Left: Controls & Log -->
      <div class="flex flex-col gap-4 w-full lg:w-1/3">
        <!-- Main Controls -->
        <div class="flex flex-wrap gap-2">
          <button @click="sendCommand('gpsdata')" class="btn btn-primary flex-1">Data</button>
          <button @click="sendCommand('nmea')" class="btn btn-primary flex-1">NMEA</button>
          <button @click="sendCommand('stopscan')" class="btn btn-danger">Stop</button>
        </div>

        <!-- Lost Mode (Anti-Theft) -->
        <div class="card p-3 border-rose-900/30 bg-rose-950/5">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-bold text-rose-400 flex items-center gap-2">
              <span class="text-lg">󰒃</span> Lost Mode
            </h3>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-zinc-500 font-mono">{{ lostModeRadius }}m</span>
              <button @click="toggleLostMode" 
                class="btn py-1 px-3 text-xs transition-all duration-300"
                :class="lostModeArmed ? 'btn-danger animate-pulse' : 'btn-accent'">
                {{ lostModeArmed ? 'DISARM' : 'ARM' }}
              </button>
            </div>
          </div>
          
          <div class="space-y-2">
            <input v-model="lostModeMessage" placeholder="NFC Tag Message..." 
              class="w-full bg-[#0a0a0a] border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:border-rose-500 outline-none" />
            
            <div v-if="lostModeArmed && distanceToAnchor !== null" class="text-[10px] font-mono text-center">
               Distance: <span :class="distanceToAnchor > lostModeRadius ? 'text-rose-500 font-bold underline' : 'text-emerald-500'">{{ distanceToAnchor.toFixed(1) }}m</span>
            </div>
          </div>
        </div>

        <!-- POI & Constellations -->
        <div class="space-y-4">
          <div class="flex gap-2">
            <button @click="sendCommand('gpspoi -s')" class="btn btn-accent flex-1 py-1 text-xs">POI Start</button>
            <button @click="sendCommand('gpspoi -m')" class="btn btn-accent flex-1 py-1 text-xs">Mark</button>
            <button @click="sendCommand('gpspoi -e')" class="btn flex-1 py-1 text-xs">End</button>
          </div>
          
          <div class="grid grid-cols-4 gap-1">
            <button v-for="c in constellations" :key="c.value"
              @click="sendCommand(`gps -n ${c.value}`)"
              class="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] py-1 rounded transition-colors"
              :class="activeConstellation === c.value ? 'border-cyan-500 text-cyan-400' : 'text-zinc-500'">
              {{ c.label }}
            </button>
          </div>
        </div>

        <!-- Mini Log -->
        <div class="flex-1 min-h-[100px] overflow-auto bg-black border border-zinc-800 rounded p-2 font-mono text-[10px] text-emerald-500/80">
          <div v-for="(line, i) in gpsLines.slice(-10)" :key="i" class="truncate">{{ line }}</div>
        </div>
      </div>

      <!-- Right: Map -->
      <div class="flex-1 min-h-[300px]">
        <GpsMap 
          :coords="{ lat: parseFloat(gps.lat), lon: parseFloat(gps.lon) }"
          :geofence="lostModeArmed ? { lat: parseFloat(lostModeAnchor.lat), lon: parseFloat(lostModeAnchor.lon), radius: lostModeRadius } : null"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'
import GpsMap from './GpsMap.vue'

const { sendCommand, terminalOutput } = useSerialConnection()

const gps = ref({
  fix: null,
  sats: null,
  lat: null,
  lon: null,
  alt: null,
  accuracy: null,
  datetime: null
})

const gpsLines = ref([])
const lastProcessedIndex = ref(0)
const activeConstellation = ref('native')

// Lost Mode State
const lostModeArmed = ref(false)
const lostModeAnchor = ref({ lat: null, lon: null })
const lostModeRadius = ref(20) // meters
const lostModeMessage = ref('DEVICE STOLEN! Tracker Active.')
const lastNfcWrite = ref(0)

const toggleLostMode = () => {
  if (!lostModeArmed.value) {
    if (!gps.value.lat || !gps.value.lon) {
      alert('Cannot arm Lost Mode without GPS fix!')
      return
    }
    lostModeAnchor.value = { lat: gps.value.lat, lon: gps.value.lon }
    lostModeArmed.value = true
  } else {
    lostModeArmed.value = false
  }
}

const distanceToAnchor = computed(() => {
  if (!lostModeArmed.value || !gps.value.lat || !lostModeAnchor.value.lat) return null
  
  // Haversine formula
  const R = 6371e3 // Earth radius in meters
  const φ1 = parseFloat(gps.value.lat) * Math.PI/180
  const φ2 = parseFloat(lostModeAnchor.value.lat) * Math.PI/180
  const Δφ = (parseFloat(gps.value.lat) - parseFloat(lostModeAnchor.value.lat)) * Math.PI/180
  const Δλ = (parseFloat(gps.value.lon) - parseFloat(lostModeAnchor.value.lon)) * Math.PI/180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
})

// Trigger NFC response if geofence exceeded
watch(distanceToAnchor, (dist) => {
  if (lostModeArmed.value && dist > lostModeRadius.value) {
    // Throttling NFC writes to once every 30 seconds
    const now = Date.now()
    if (now - lastNfcWrite.value > 30000) {
      sendCommand(`TEXT:${lostModeMessage.value}`)
      lastNfcWrite.value = now
    }
  }
})

const constellations = [
  { label: 'Native', value: 'native' },
  { label: 'All', value: 'all' },
  { label: 'GPS', value: 'gps' },
  { label: 'GLONASS', value: 'glonass' },
  { label: 'Galileo', value: 'galileo' },
  { label: 'BeiDou', value: 'beidou' },
  { label: 'NavIC', value: 'navic' },
  { label: 'QZSS', value: 'qzss' }
]

const nmeaToDecimal = (coord, direction) => {
  if (!coord || !direction) return null;
  const dotIndex = coord.indexOf('.');
  if (dotIndex === -1) return null;
  
  const minutesStr = coord.substring(dotIndex - 2);
  const degreesStr = coord.substring(0, dotIndex - 2);
  
  const degrees = parseFloat(degreesStr || '0');
  const minutes = parseFloat(minutesStr || '0');
  
  let decimal = degrees + (minutes / 60.0);
  if (direction === 'S' || direction === 'W') decimal = -decimal;
  return decimal.toFixed(7);
}

const parseGpsLine = (plain) => {
  if (plain.startsWith('$')) {
    const parts = plain.split(',');
    const type = parts[0].substring(3);

    if (type === 'GGA') {
      const status = parts[6];
      const satCount = parts[7] ? parseInt(parts[7]) : null;
      if (status !== undefined) gps.value.fix = status !== '0';
      if (satCount !== null && (satCount > 0 || !gps.value.fix)) gps.value.sats = satCount;
      if (parts[9]) gps.value.alt = parts[9];
      if (parts[8]) gps.value.accuracy = parts[8];
      const lat = nmeaToDecimal(parts[2], parts[3]);
      const lon = nmeaToDecimal(parts[4], parts[5]);
      if (lat) gps.value.lat = lat;
      if (lon) gps.value.lon = lon;
    } 
    else if (type === 'RMC') {
      if (parts[2] === 'A') gps.value.fix = true;
      else if (parts[2] === 'V') gps.value.fix = false;
      const lat = nmeaToDecimal(parts[3], parts[4]);
      const lon = nmeaToDecimal(parts[5], parts[6]);
      if (lat) gps.value.lat = lat;
      if (lon) gps.value.lon = lon;
      if (parts[9] && parts[1]) {
        const d = parts[9];
        const t = parts[1];
        gps.value.datetime = `20${d.slice(4,6)}-${d.slice(2,4)}-${d.slice(0,2)} ${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}`;
      }
    } 
    else if (type === 'ZDA') {
      if (parts[1] && parts[2] && parts[3] && parts[4]) {
        const t = parts[1];
        const d = parts[2].padStart(2, '0');
        const m = parts[3].padStart(2, '0');
        const y = parts[4];
        gps.value.datetime = `${y}-${m}-${d} ${t.slice(0,2)}:${t.slice(2,4)}:${t.slice(4,6)}`;
      }
    }
    else if (type === 'GSV') {
      if (parts[3]) {
        const view_sats = parseInt(parts[3]);
        if (view_sats > 0) gps.value.sats = view_sats;
      }
    }
    return;
  }

  const fixMatch = plain.match(/(?:Good )?Fix:\s*(Yes|No)/i);
  if (fixMatch) gps.value.fix = fixMatch[1].toLowerCase() === 'yes';
  const satsMatch = plain.match(/(?:Satellites|Sats):\s*(\d+)/i);
  if (satsMatch) {
    const s = parseInt(satsMatch[1]);
    if (s > 0 || !gps.value.fix) gps.value.sats = s;
  }
  const latMatch = plain.match(/Lat(?:itude)?:\s*(-?[\d.]+)/i);
  if (latMatch && latMatch[1] !== '0.0000000') gps.value.lat = latMatch[1];
  const lonMatch = plain.match(/Lon(?:gitude)?:\s*(-?[\d.]+)/i);
  if (lonMatch && lonMatch[1] !== '0.0000000') gps.value.lon = lonMatch[1];
  const altMatch = plain.match(/Alt(?:itude)?:\s*(-?[\d.]+)/i);
  if (altMatch) gps.value.alt = altMatch[1];
  const accMatch = plain.match(/Accuracy:\s*(-?[\d.]+)/i);
  if (accMatch) gps.value.accuracy = accMatch[1];
  const dtMatch = plain.match(/(?:Date|Time|Datetime):\s*(.+)/i);
  if (dtMatch) gps.value.datetime = dtMatch[1].trim();
}

watch(() => terminalOutput.value, (newLines) => {
  if (newLines.length <= lastProcessedIndex.value) {
    if (newLines.length < lastProcessedIndex.value) lastProcessedIndex.value = 0
    return
  }
  const linesToProcess = newLines.slice(lastProcessedIndex.value)
  lastProcessedIndex.value = newLines.length
  linesToProcess.forEach(line => {
    const plain = line.replace(/<[^>]+>/g, '').trim()
    if (!plain) return
    parseGpsLine(plain)
    const isGps = /^(Fix:|Sats:|Lat:|Lon:|Alt:|Accuracy:|Date|Good Fix|Satellites|Latitude|Longitude|Altitude|Datetime|====|\$G[NPLAQIB]|NMEA|Text:)/i.test(plain)
    if (isGps) {
      gpsLines.value = [...gpsLines.value, plain]
      if (gpsLines.value.length > 500) gpsLines.value = gpsLines.value.slice(-500)
    }
  })
}, { deep: true })
</script>
