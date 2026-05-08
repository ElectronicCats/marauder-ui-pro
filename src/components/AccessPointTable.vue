<template>
  <div class="h-full flex flex-col">
    <!-- Header with filters -->
    <div class="flex flex-col gap-4 mb-4">
      <!-- Title and actions -->
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <h2 class="text-lg md:text-xl font-bold text-zinc-100">Access Points</h2>
          <span class="text-[10px] md:text-sm text-zinc-500">({{ accessPoints.size }} devices)</span>
        </div>
        <div class="flex items-center space-x-2">
          <button @click="refreshList"
            class="btn btn-primary"
            :disabled="!isConnected">
            Refresh
          </button>
          <button @click="clearTable"
            class="btn btn-accent">
            Clear
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row gap-2">
        <div class="flex-1">
          <input type="text" v-model="search" placeholder="Search..."
            class="input-field w-full text-xs">
        </div>
        <div class="flex justify-between md:justify-start gap-2">
          <div class="flex space-x-1">
            <button v-for="view in viewOptions" :key="view.id" @click="currentView = view.id"
              class="btn text-[10px] md:text-xs px-2"
              :class="currentView === view.id ? 'btn-primary' : ''">
              {{ view.label }}
            </button>
          </div>
          <select v-model="sortBy"
            class="input-field text-[10px] md:text-xs py-0 h-7 md:h-auto">
            <option value="rssi">Signal</option>
            <option value="stations">Stations</option>
            <option value="essid">Name</option>
            <option value="channel">Channel</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="flex-1 min-h-0 overflow-auto border border-zinc-800 rounded bg-zinc-950/50">
      <!-- Compact View -->
      <table v-if="currentView === 'compact'" class="w-full text-sm">
        <thead class="bg-zinc-900 sticky top-0 z-10">
          <tr>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold w-12 text-zinc-400">#</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">ESSID</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 w-16 font-bold text-zinc-400">CH</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 w-16 font-bold text-zinc-400">RSSI</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 w-16 font-bold text-zinc-400">STA</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="ap in sortedAPs" :key="ap.bssid">
            <tr class="hover:bg-zinc-800/50 border-b border-zinc-900 cursor-pointer" :class="getSignalClass(ap.rssi)"
              @click="ap.showStations = !ap.showStations">
              <td class="px-2 py-1 font-mono text-zinc-500 text-xs">{{ ap.index }}</td>
              <td class="px-2 py-1">
                <div class="flex items-center">
                  <span class="font-medium text-zinc-200">{{ ap.essid }}</span>
                  <span v-if="ap.isSelected" class="ml-1 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-1 rounded uppercase font-bold">
                    selected
                  </span>
                  <span v-if="ap.isHidden" class="ml-1 text-[10px] bg-zinc-800 text-zinc-500 px-1 rounded uppercase font-bold">
                    hidden
                  </span>
                </div>
              </td>
              <td class="px-2 py-1 text-zinc-400 text-xs">{{ ap.channel }}</td>
              <td class="px-2 py-1">
                <div class="flex items-center text-xs font-mono">
                  <div class="w-1.5 h-1.5 rounded-full mr-1.5" :class="getSignalDotClass(ap.rssi)"></div>
                  <span :class="rssiColor(ap.rssi)">{{ ap.rssi || 'N/A' }}</span>
                </div>
              </td>
              <td class="px-2 py-1">
                <span class="text-[10px] px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                  {{ ap.stations?.length || 0 }}
                </span>
              </td>
            </tr>
            <!-- Stations subrow -->
            <tr v-if="ap.showStations && ap.stations?.length" class="bg-black/30 text-xs border-b border-zinc-900">
              <td colspan="5" class="px-2 py-2">
                <div class="pl-4 space-y-1">
                  <div v-for="station in ap.stations" :key="station.mac" class="flex items-center space-x-2">
                    <span class="w-8 text-zinc-600 font-mono">#{{ station.id }}</span>
                    <span class="font-mono text-emerald-500/80">{{ station.mac }}</span>
                    <span v-if="station.vendor" class="text-zinc-500 italic">({{ station.vendor }})</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <!-- Detailed View -->
      <table v-else class="w-full text-sm">
        <thead class="bg-zinc-900 sticky top-0 z-10">
          <tr>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold w-10 md:w-12 text-zinc-400">#</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">ESSID</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 w-12 md:w-16 font-bold text-zinc-400">CH</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 w-12 md:w-16 font-bold text-zinc-400">RSSI</th>
            <th class="hidden sm:table-cell px-2 py-2 text-left border-b border-zinc-800 w-24 md:w-32 font-bold text-zinc-400">BSSID</th>
            <th class="px-2 py-2 text-left border-b border-zinc-800 w-12 md:w-16 font-bold text-zinc-400">STA</th>
            <th class="hidden md:table-cell px-2 py-2 text-left border-b border-zinc-800 w-24 font-bold text-zinc-400">Last Seen</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="ap in sortedAPs" :key="ap.bssid">
            <tr class="hover:bg-zinc-800/50 border-b border-zinc-900 cursor-pointer" :class="getSignalClass(ap.rssi)"
              @click="ap.showStations = !ap.showStations">
              <td class="px-2 py-1 font-mono text-zinc-500 text-[10px] md:text-xs">{{ ap.index }}</td>
              <td class="px-2 py-1">
                <div class="flex items-center">
                  <span class="font-medium text-zinc-200 text-xs md:text-sm">{{ ap.essid }}</span>
                  <span v-if="ap.isSelected" class="ml-1 text-[8px] md:text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-1 rounded uppercase font-bold">
                    selected
                  </span>
                </div>
              </td>
              <td class="px-2 py-1 text-zinc-400 text-[10px] md:text-xs">{{ ap.channel }}</td>
              <td class="px-2 py-1">
                <div class="flex items-center text-[10px] md:text-xs font-mono">
                  <div class="w-1.5 h-1.5 rounded-full mr-1" :class="getSignalDotClass(ap.rssi)"></div>
                  <span :class="rssiColor(ap.rssi)">{{ ap.rssi || 'N/A' }}</span>
                </div>
              </td>
              <td class="hidden sm:table-cell px-2 py-1 font-mono text-zinc-400 text-[10px] md:text-xs">{{ ap.bssid }}</td>
              <td class="px-2 py-1">
                <span class="text-[10px] px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                  {{ ap.stations?.length || 0 }}
                </span>
              </td>
              <td class="hidden md:table-cell px-2 py-1 text-zinc-500 text-[10px] md:text-xs text-right">{{ formatLastSeen(ap.lastSeen) }}</td>
            </tr>
            <!-- Stations subrow -->
            <tr v-if="ap.showStations && ap.stations?.length" class="bg-black/30 text-xs border-b border-zinc-900">
              <td colspan="7" class="px-2 py-2">
                <div class="pl-4 space-y-1">
                  <div v-for="station in ap.stations" :key="station.mac" class="flex items-center space-x-2">
                    <span class="w-8 text-zinc-600 font-mono">#{{ station.id }}</span>
                    <span class="font-mono text-emerald-500/80">{{ station.mac }}</span>
                    <span v-if="station.vendor" class="text-zinc-500 italic">({{ station.vendor }})</span>
                    <span class="text-zinc-600 ml-auto">Last seen: {{ formatLastSeen(station.lastSeen) }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'

const { sendCommand, isConnected, terminalOutput } = useSerialConnection()
const accessPoints = ref(new Map())
const search = ref('')
const currentView = ref('compact')
const sortBy = ref('rssi')
const lastProcessedIndex = ref(0)

const viewOptions = [
  { id: 'compact', label: 'Compact' },
  { id: 'detailed', label: 'Detailed' }
]

const sortedAPs = computed(() => {
  // Convert Map to array and ensure unique entries
  let aps = Array.from(accessPoints.value.values()).reduce((unique, ap) => {
    // Use channel-essid as unique identifier
    const key = `${ap.channel}-${ap.essid}`
    if (!unique.has(key)) {
      unique.set(key, ap)
    } else {
      // If AP already exists, merge properties preferring the newer data
      const existing = unique.get(key)
      unique.set(key, {
        ...existing,
        ...ap,
        stations: [...(ap.stations || [])],
        lastSeen: ap.lastSeen > existing.lastSeen ? ap.lastSeen : existing.lastSeen
      })
    }
    return unique
  }, new Map())

  // Convert back to array
  aps = Array.from(aps.values())

  // Apply search filter
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    aps = aps.filter(ap =>
      ap.essid.toLowerCase().includes(searchLower) ||
      ap.bssid.toLowerCase().includes(searchLower) ||
      ap.stations?.some(station => station.mac.toLowerCase().includes(searchLower))
    )
  }

  // Apply sorting
  return aps.sort((a, b) => {
    switch (sortBy.value) {
      case 'rssi':
        // Handle cases where RSSI might be undefined
        const rssiA = a.rssi ?? -999
        const rssiB = b.rssi ?? -999
        return rssiB - rssiA || a.essid.localeCompare(b.essid)
      case 'stations':
        const stationsA = a.stations?.length || 0
        const stationsB = b.stations?.length || 0
        return stationsB - stationsA || a.essid.localeCompare(b.essid)
      case 'essid':
        return a.essid.localeCompare(b.essid)
      case 'channel':
        return (a.channel - b.channel) || a.essid.localeCompare(b.essid)
      default:
        return 0
    }
  })
})

const getSignalClass = (rssi) => {
  return ''
}

const rssiColor = (rssi) => {
  if (!rssi) return 'text-zinc-500'
  if (rssi > -70) return 'text-emerald-400'
  if (rssi > -85) return 'text-amber-400'
  return 'text-rose-400'
}

const getSignalDotClass = (rssi) => {
  if (!rssi) return 'bg-zinc-700'
  if (rssi > -70) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
  if (rssi > -85) return 'bg-amber-500'
  return 'bg-rose-500'
}

const formatLastSeen = (date) => {
  if (!date) return 'N/A'
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h`
}

const clearTable = () => {
  accessPoints.value.clear()
  accessPoints.value = new Map(accessPoints.value)
}


const refreshList = async () => {
  if (isConnected.value) {
    await sendCommand('list -a')
  }
}

const filteredAPs = computed(() => {
  let aps = Array.from(accessPoints.value.values())

  // Apply search filter
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    aps = aps.filter(ap =>
      ap.essid.toLowerCase().includes(searchLower) ||
      ap.bssid.toLowerCase().includes(searchLower)
    )
  }

  // Sort by signal strength and then by ESSID
  return aps.sort((a, b) => {
    if (a.rssi && b.rssi) {
      return b.rssi - a.rssi
    }
    return a.essid.localeCompare(b.essid)
  })
})

const updateAccessPoint = (ap) => {
  const key = `${ap.channel}-${ap.essid}`
  const existing = accessPoints.value.get(key)

  // Create a new Map to ensure reactivity
  const newAccessPoints = new Map(accessPoints.value)
  newAccessPoints.set(key, {
    ...existing,
    ...ap,
    stations: [...(ap.stations || [])].sort((a, b) => a.id - b.id),
    lastSeen: new Date(),
    // Ensure these properties are always present
    rssi: ap.rssi ?? existing?.rssi,
    bssid: ap.bssid || existing?.bssid || 'Unknown',
    isSelected: ap.isSelected ?? existing?.isSelected ?? false,
    isHidden: ap.isHidden ?? existing?.isHidden ?? false
  })

  accessPoints.value = newAccessPoints
}

const cleanEssid = (essid) => {
  // Remove special characters and clean up the string
  return essid
    .replace(/[�]/g, '') // Remove the weird symbol
    .replace(/\s*\(selected\)\s*$/, '') // Remove (selected) from the end
    .trim()
}

watch(() => terminalOutput.value, (newLines) => {
  if (newLines.length <= lastProcessedIndex.value) return

  const linesToProcess = newLines.slice(lastProcessedIndex.value)
  lastProcessedIndex.value = newLines.length

  linesToProcess.forEach(line => {
    const plainLine = line.replace(/<[^>]+>/g, '')

    // Parse list -a output first (to get indices)
    if (plainLine.match(/^\[\d+\]\[CH:/)) {
      const match = plainLine.match(/\[(\d+)\]\[CH:(\d+)\]\s(.+?)(?:\s*[�]?\s*(?:\(selected\))?\s*)?$/)
      if (match) {
        const [_, index, channel, essid] = match
        const trimmedEssid = cleanEssid(essid)

        // Create a key that matches the one used in scanap
        const key = `${channel}-${trimmedEssid}`
        const existingAP = accessPoints.value.get(key)

        if (existingAP) {
          // Update existing AP with new index and selected status
          updateAccessPoint({
            ...existingAP,
            index: parseInt(index),
            channel: parseInt(channel),
            essid: trimmedEssid,
            isSelected: plainLine.includes('(selected)'),
            lastSeen: new Date()
          })
        } else {
          // Create new AP entry
          updateAccessPoint({
            index: parseInt(index),
            channel: parseInt(channel),
            essid: trimmedEssid,
            bssid: 'Unknown',
            isHidden: false,
            isSelected: plainLine.includes('(selected)'),
            lastSeen: new Date(),
            stations: []
          })
        }
      }
    }

    // Parse scanap output
    else if (plainLine.includes('RSSI:')) {
      const match = plainLine.match(/RSSI:\s(-?\d+)\sCh:\s(\d+)\sBSSID:\s([a-fA-F0-9:]+)\sESSID:\s(.+)/)
      if (match) {
        const [_, rssi, channel, bssid, essid] = match
        const trimmedEssid = cleanEssid(essid)
        const key = `${channel}-${trimmedEssid}`

        // Try to find existing AP to preserve index and other data
        const existingAP = accessPoints.value.get(key)

        updateAccessPoint({
          ...(existingAP || {}), // Preserve existing data, especially index and selected status
          rssi: parseInt(rssi),
          channel: parseInt(channel),
          bssid,
          essid: trimmedEssid,
          isHidden: trimmedEssid === bssid,
          isSelected: existingAP?.isSelected || false,
          lastSeen: new Date(),
          stations: existingAP?.stations || []
        })
      }
    }

    // Parse station scan output
    else if (plainLine.match(/^\d+:\s(ap|sta):/)) {
      const match = plainLine.match(/(\d+):\s(ap|sta):\s([a-fA-F0-9:]+)\s->\s(sta|ap):\s([a-fA-F0-9:]+)/)
      if (match) {
        const [_, index, firstType, firstMac, secondType, secondMac] = match
        const apMac = firstType === 'ap' ? firstMac : secondMac
        const staMac = firstType === 'sta' ? firstMac : secondMac
        const stationId = parseInt(index)

        // Find AP by BSSID
        let foundAP = null
        accessPoints.value.forEach((ap) => {
          if (ap.bssid === apMac) {
            foundAP = ap
          }
        })

        if (foundAP) {
          // Create a new object with the updated stations
          const updatedAP = {
            ...foundAP,
            stations: [...(foundAP.stations || [])]
          }

          // Update or add the station
          const existingStationIndex = updatedAP.stations.findIndex(s => s.mac === staMac)
          if (existingStationIndex >= 0) {
            updatedAP.stations[existingStationIndex] = {
              ...updatedAP.stations[existingStationIndex],
              id: stationId,
              lastSeen: new Date()
            }
          } else {
            updatedAP.stations.push({
              id: stationId,
              mac: staMac,
              lastSeen: new Date()
            })
          }

          // Sort stations by ID
          updatedAP.stations.sort((a, b) => a.id - b.id)

          // Update the AP in the map
          const key = `${updatedAP.channel}-${updatedAP.essid}`
          updateAccessPoint(updatedAP)
        }
      }
    }
  })
}, { deep: true })

// Cleanup old entries periodically
const cleanup = () => {
  const now = new Date()
  for (const [key, ap] of accessPoints.value.entries()) {
    if ((now - ap.lastSeen) > 5 * 60 * 1000) { // Remove after 5 minutes
      accessPoints.value.delete(key)
    }
  }
}

// Start cleanup interval
onMounted(() => {
  const interval = setInterval(cleanup, 30000)
  onUnmounted(() => clearInterval(interval))
})
</script>