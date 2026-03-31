<template>
  <div class="h-full flex flex-col">
    <!-- Status Bar -->
    <div class="grid grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
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

    <!-- Controls -->
    <div class="flex flex-wrap gap-2 mb-4">
      <!-- Data Stream -->
      <button @click="sendCommand('gpsdata')" class="btn btn-primary">GPS Data</button>
      <button @click="sendCommand('nmea')" class="btn btn-primary">NMEA Stream</button>
      <button @click="sendCommand('gps -t')" class="btn btn-accent">Tracker</button>
      <button @click="sendCommand('stopscan')" class="btn btn-danger">Stop</button>

      <!-- Single Queries -->
      <div class="w-px bg-zinc-700 mx-1 self-stretch"></div>
      <button @click="sendCommand('gps -g fix')" class="btn">Fix</button>
      <button @click="sendCommand('gps -g sat')" class="btn">Sats</button>
      <button @click="sendCommand('gps -g lat')" class="btn">Lat</button>
      <button @click="sendCommand('gps -g lon')" class="btn">Lon</button>
      <button @click="sendCommand('gps -g alt')" class="btn">Alt</button>
      <button @click="sendCommand('gps -g date')" class="btn">Date</button>
      <button @click="sendCommand('gps -g nmea')" class="btn">NMEA</button>

      <!-- POI -->
      <div class="w-px bg-zinc-700 mx-1 self-stretch"></div>
      <button @click="sendCommand('gpspoi -s')" class="btn btn-accent">POI Start</button>
      <button @click="sendCommand('gpspoi -m')" class="btn btn-accent">POI Mark</button>
      <button @click="sendCommand('gpspoi -e')" class="btn">POI End</button>
    </div>

    <!-- Constellation Selector -->
    <div class="flex flex-wrap gap-2 mb-4">
      <span class="text-xs text-zinc-500 self-center mr-1">Constellation:</span>
      <button v-for="c in constellations" :key="c.value"
        @click="sendCommand(`gps -n ${c.value}`)"
        class="btn text-xs px-2 py-1">
        {{ c.label }}
      </button>
    </div>

    <!-- NMEA / Data Log -->
    <div class="flex-1 min-h-0 overflow-auto bg-black border border-zinc-800 rounded p-3 font-mono text-xs text-emerald-500 space-y-0.5">
      <div v-if="gpsLines.length === 0" class="text-zinc-600">
        No GPS data yet. Press "GPS Data" or "NMEA Stream" to start.
      </div>
      <div v-for="(line, i) in gpsLines" :key="i">{{ line }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'

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

const parseGpsLine = (plain) => {
  // Status fields
  const fixMatch = plain.match(/(?:Good )?Fix:\s*(Yes|No)/i)
  if (fixMatch) gps.value.fix = fixMatch[1].toLowerCase() === 'yes'

  const satsMatch = plain.match(/(?:Satellites|Sats):\s*(\d+)/i)
  if (satsMatch) gps.value.sats = parseInt(satsMatch[1])

  const latMatch = plain.match(/Lat(?:itude)?:\s*(-?[\d.]+)/i)
  if (latMatch) gps.value.lat = latMatch[1]

  const lonMatch = plain.match(/Lon(?:gitude)?:\s*(-?[\d.]+)/i)
  if (lonMatch) gps.value.lon = lonMatch[1]

  const altMatch = plain.match(/Alt(?:itude)?:\s*(-?[\d.]+)/i)
  if (altMatch) gps.value.alt = altMatch[1]

  const accMatch = plain.match(/Accuracy:\s*(-?[\d.]+)/i)
  if (accMatch) gps.value.accuracy = accMatch[1]

  const dtMatch = plain.match(/Date(?:\/Time|time):\s*(.+)/i)
  if (dtMatch) gps.value.datetime = dtMatch[1].trim()
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

    // Collect GPS-relevant lines for the log pane
    const isGps = /^(Fix:|Sats:|Lat:|Lon:|Alt:|Accuracy:|Date|Good Fix|Satellites|Latitude|Longitude|Altitude|Datetime|====|\$G[NPLAQIB]|NMEA|Text:)/i.test(plain)
    if (isGps) {
      gpsLines.value = [...gpsLines.value, plain]
      // Keep last 500 lines
      if (gpsLines.value.length > 500) {
        gpsLines.value = gpsLines.value.slice(-500)
      }
    }
  })
}, { deep: true })
</script>
