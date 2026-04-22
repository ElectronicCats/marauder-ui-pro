<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-2xl font-bold text-zinc-100 flex items-center gap-2">
        <span class="text-accent">󱠔</span> NFC Control Panel
      </h2>
      <div class="flex gap-2">
        <button @click="handleScan" class="btn btn-primary flex items-center gap-2" :disabled="isWorking">
          <span v-if="isWorking" class="animate-spin text-lg">󱑊</span>
          <span>Scan Chip</span>
        </button>
        <button @click="handleRead" class="btn btn-accent flex items-center gap-2" :disabled="isWorking">
          <span>Read Tag</span>
        </button>
      </div>
    </div>

    <!-- Status Card -->
    <div class="card p-4 bg-zinc-900/50 border-zinc-800">
      <div class="flex items-center gap-4 text-sm">
        <span class="text-zinc-400 font-mono">Chip Status:</span>
        <span :class="chipStatusClass" class="font-bold flex items-center gap-2">
          <span class="w-2 h-2 rounded-full" :class="chipStatusDotClass"></span>
          {{ chipStatus }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Write Card -->
      <div class="card p-6 flex flex-col gap-4">
        <h3 class="text-lg font-bold text-zinc-100 mb-2">Write NDEF Record</h3>
        
        <div class="flex flex-col gap-3">
          <label class="text-sm text-zinc-400">Record Type</label>
          <div class="grid grid-cols-3 gap-2">
            <button 
              v-for="type in writeTypes" 
              :key="type.id"
              @click="writeType = type.id"
              class="btn text-xs py-2"
              :class="writeType === type.id ? 'btn-accent' : 'bg-zinc-800'"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- URL Input -->
        <div v-if="writeType === 'url'" class="flex flex-col gap-2 mt-2">
          <label class="text-sm text-zinc-400 font-mono">URL Address</label>
          <input 
            v-model="writeContent.url" 
            type="text" 
            placeholder="google.com" 
            class="input-field"
          />
        </div>

        <!-- Text Input -->
        <div v-if="writeType === 'text'" class="flex flex-col gap-2 mt-2">
          <label class="text-sm text-zinc-400 font-mono">Text Message</label>
          <input 
            v-model="writeContent.text" 
            type="text" 
            placeholder="Hello from Marauder" 
            class="input-field"
          />
        </div>

        <!-- vCard Input -->
        <div v-if="writeType === 'vcard'" class="flex flex-col gap-3 mt-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-zinc-500 uppercase">Full Name</label>
            <input v-model="writeContent.vcard.name" type="text" placeholder="Omar" class="input-field text-sm" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-zinc-500 uppercase">Phone Number</label>
            <input v-model="writeContent.vcard.phone" type="text" placeholder="12345678" class="input-field text-sm" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-zinc-500 uppercase">Email Address</label>
            <input v-model="writeContent.vcard.email" type="text" placeholder="omar@mail.com" class="input-field text-sm" />
          </div>
        </div>

        <button @click="handleWrite" class="btn btn-primary mt-4 py-3 font-bold" :disabled="isWorking || !canWrite">
          Execute Write Operation
        </button>
      </div>

      <!-- Result Card -->
      <div class="card p-4 bg-black flex flex-col font-mono text-sm overflow-hidden border-zinc-800">
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/50">
          <span class="text-zinc-500 text-xs uppercase tracking-widest">Tag Memory Dump</span>
          <span class="text-[10px] text-zinc-600">NT3H2111 Block View</span>
        </div>
        <div class="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar text-xs leading-relaxed pr-2">
          <pre v-if="tagReadData" class="text-zinc-300">Block | Hex Data | ASCII
--------------------------------
{{ tagReadData }}</pre>
          <div v-else class="h-full flex flex-col items-center justify-center text-zinc-600 py-12 italic">
            <span class="text-2xl mb-2">󱠓</span>
            No tag data read yet
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'

const serialConnection = inject('serialConnection')
const isWorking = ref(false)
const chipStatus = ref('NOT_SCANNED')
const tagReadData = ref('')
const writeType = ref('url')

const writeContent = ref({
  url: '',
  text: '',
  vcard: {
    name: '',
    phone: '',
    email: ''
  }
})

const writeTypes = [
  { id: 'url', label: 'URL Link' },
  { id: 'text', label: 'Plain Text' },
  { id: 'vcard', label: 'Contact' }
]

const chipStatusClass = computed(() => {
  if (chipStatus.value === 'READY') return 'text-emerald-400'
  if (chipStatus.value.includes('ERROR')) return 'text-red-400'
  return 'text-zinc-500'
})

const chipStatusDotClass = computed(() => {
  if (chipStatus.value === 'READY') return 'bg-emerald-400 animate-pulse'
  if (chipStatus.value.includes('ERROR')) return 'bg-red-400'
  return 'bg-zinc-700'
})

const canWrite = computed(() => {
  if (writeType.value === 'url') return writeContent.value.url.length > 0
  if (writeType.value === 'text') return writeContent.value.text.length > 0
  if (writeType.value === 'vcard') return writeContent.value.vcard.name.length > 0
  return false
})

const handleScan = async () => {
  isWorking.value = true
  tagReadData.value = ''
  try {
    await serialConnection.sendCommand('nfc scan')
    // We expect the terminal output to update, and we could also parse it
    // For now we set it to ready if we sent the command (optimistic)
    chipStatus.value = 'READY' 
  } catch (e) {
    chipStatus.value = 'ERROR'
  } finally {
    isWorking.value = false
  }
}

const handleRead = async () => {
  isWorking.value = true
  try {
    await serialConnection.sendCommand('nfc read')
  } finally {
    isWorking.value = false
  }
}

const handleWrite = async () => {
  isWorking.value = true
  let cmd = ''
  if (writeType.value === 'url') {
    // Use DragonJar direct command format
    cmd = `URI:${writeContent.value.url}`
  } else if (writeType.value === 'text') {
    // Use DragonJar direct command format
    cmd = `TEXT:${writeContent.value.text}`
  } else if (writeType.value === 'vcard') {
    // Use DragonJar direct command format with pipe | separator
    const vc = writeContent.value.vcard
    cmd = `VCARD:${vc.name}|${vc.phone}|${vc.email}`
  }

  try {
    await serialConnection.sendCommand(cmd)
  } finally {
    isWorking.value = false
  }
}

// Intercept terminal output to populate tagReadData
let removeListener = null

onMounted(() => {
  removeListener = serialConnection.onLine((line) => {
    // Check for block data: e.g., "01    | 03 1D..."
    if (/^\d{1,2}\s+\|/.test(line)) {
      tagReadData.value += line + '\n'
    }
    
    // Update chip status based on detection messages
    if (line.includes('FOUND!') || line.includes('[NFC] Device found') || line.includes('Chip Status: READY')) {
      chipStatus.value = 'READY'
    }
    if (line.includes('NT3H2111 not found') || line.includes('NFC_WRITE_ERROR')) {
      chipStatus.value = 'ERROR'
    }
    if (line.includes('NFC_WRITE_SUCCESS')) {
      // Auto-read after success to verify
      handleRead()
    }
  })
})

onUnmounted(() => {
  if (removeListener) removeListener()
})
</script>

<style scoped>
.btn-accent {
  @apply bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500 active:bg-indigo-700 shadow-[2px_2px_0px_rgba(79,70,229,0.3)];
}

.input-field {
  @apply w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-zinc-800 rounded;
}
</style>
