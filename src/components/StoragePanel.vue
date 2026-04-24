<template>
  <div class="h-full flex flex-col">
    <!-- Controls -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <button @click="listFiles" class="btn btn-primary">List Files</button>
      <button @click="confirmFormat" class="btn btn-danger">Format Storage</button>
      <div class="flex-1"></div>
      <span v-if="storageInfo" class="text-xs text-zinc-500 font-mono">
        {{ storageInfo }}
      </span>
    </div>

    <!-- Wardriving.lat integration (Now handled via Header) -->
    <div v-if="!isAuthenticated" class="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded text-center">
      <p class="text-xs text-zinc-500">
        Sign in via the <b>Platform</b> button in the header to enable cloud sync.
      </p>
    </div>

    <!-- Format Confirmation -->
    <div v-if="showFormatConfirm"
      class="bg-rose-950/40 border border-rose-800/50 rounded px-3 py-2 mb-4 flex items-center justify-between">
      <span class="text-sm text-rose-400">Delete all files except settings? This cannot be undone.</span>
      <div class="flex gap-2">
        <button @click="formatStorage" class="btn btn-danger text-xs py-1 px-2">Confirm</button>
        <button @click="showFormatConfirm = false" class="btn text-xs py-1 px-2">Cancel</button>
      </div>
    </div>

    <!-- File Table -->
    <div class="flex-1 min-h-0 overflow-auto border border-zinc-800 rounded bg-zinc-950/50">
      <table class="w-full text-sm">
        <thead class="bg-zinc-900 sticky top-0 z-10">
          <tr>
            <th class="px-3 py-2 text-left border-b border-zinc-800 font-bold text-zinc-400">File</th>
            <th class="px-3 py-2 text-left border-b border-zinc-800 font-bold w-24 text-zinc-400">Size</th>
            <th class="px-3 py-2 text-right border-b border-zinc-800 font-bold w-48 text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="files.length === 0">
            <td colspan="3" class="px-4 py-8 text-center text-zinc-600">
              No files listed. Press "List Files" to scan SPIFFS.
            </td>
          </tr>
          <tr v-for="f in files" :key="f.name"
            class="hover:bg-zinc-800/50 border-b border-zinc-900">
            <td class="px-3 py-1.5 font-mono text-zinc-200">{{ f.name }}</td>
            <td class="px-3 py-1.5 font-mono text-zinc-400">{{ formatSize(f.size) }}</td>
            <td class="px-3 py-1.5 text-right">
              <div class="flex justify-end gap-2">
                <button 
                  v-if="isLoggedIn && f.name.endsWith('.csv')"
                  @click="uploadToCloud(f.name)" 
                  class="btn bg-indigo-900 text-indigo-200 text-xs py-1 px-2 hover:bg-indigo-800"
                  title="Upload to Cloud"
                >
                  ☁️
                </button>
                <button @click="downloadFile(f.name)" class="btn btn-accent text-xs py-1 px-2">Download</button>
                <button @click="deleteFile(f.name)" class="btn btn-danger text-xs py-1 px-2"
                  :disabled="f.name === '/settings.json'">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Download capture state -->
    <div v-if="capturing"
      class="mt-2 bg-emerald-950/40 border border-emerald-800/50 rounded px-3 py-1.5 text-sm text-emerald-400 font-mono">
      <span class="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
      {{ uploadingToCloud ? 'Syncing to cloud...' : 'Downloading ' + capturingFile + '...' }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'
import { useAuth } from '../composables/useAuth'
import { uploadWardriveFiles } from '../utils/platformUpload'

const { sendCommand, terminalOutput } = useSerialConnection()
const { isAuthenticated, getToken } = useAuth()

const files = ref([])
const storageInfo = ref('')
const showFormatConfirm = ref(false)
const capturing = ref(false)
const capturingFile = ref('')
const captureBuffer = ref([])
const lastProcessedIndex = ref(0)

const uploadingToCloud = ref(false)
const uploadAfterCapture = ref(false)

const isLoggedIn = computed(() => isAuthenticated.value)

// Parse modes
const PARSE_NONE = 0
const PARSE_LS = 1
const PARSE_READ = 2
const PARSE_ACTION = 3
let parseMode = PARSE_NONE
let pendingFiles = []

// No longer needed: authState.isLoggedIn handles this reactivity globally

// Handled by PlatformAuthBar globally

const listFiles = async () => {
  pendingFiles = []
  storageInfo.value = ''
  parseMode = PARSE_LS
  await sendCommand('spiffs ls')
}

const downloadFile = async (name) => {
  uploadAfterCapture.value = false
  uploadingToCloud.value = false
  triggerCapture(name)
}

const uploadToCloud = async (name) => {
  uploadAfterCapture.value = true
  uploadingToCloud.value = true
  triggerCapture(name)
}

const triggerCapture = async (name) => {
  capturing.value = true
  capturingFile.value = name
  captureBuffer.value = []
  parseMode = PARSE_READ
  
  if (name.toLowerCase().endsWith('.pcap')) {
    await sendCommand(`spiffs dump ${name}`)
  } else {
    await sendCommand(`spiffs read ${name}`)
  }
}

const deleteFile = async (name) => {
  parseMode = PARSE_ACTION
  await sendCommand(`spiffs rm ${name}`)
  setTimeout(() => listFiles(), 500)
}

const confirmFormat = () => {
  showFormatConfirm.value = true
}

const formatStorage = async () => {
  showFormatConfirm.value = false
  parseMode = PARSE_ACTION
  await sendCommand('spiffs format')
  setTimeout(() => listFiles(), 500)
}

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const finishDownload = async () => {
  if (captureBuffer.value.length === 0) {
    capturing.value = false
    return
  }

  let blob;
  const isHexDump = capturingFile.value.toLowerCase().endsWith('.pcap');

  if (isHexDump) {
    const hex = captureBuffer.value.join('').replace(/\s+/g, '');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    blob = new Blob([bytes], { type: 'application/vnd.tcpdump.pcap' });
  } else {
    const content = captureBuffer.value.join('\n');
    blob = new Blob([content], { type: 'text/plain' });
  }

  if (uploadAfterCapture.value) {
    try {
        const file = new File([blob], capturingFile.value.replace(/^\//, ''), { type: blob.type });
        const token = getToken();
        await uploadWardriveFiles([file], token);
        alert('Success! File synced to Wardriving.lat');
    } catch (e) {
        alert('Cloud Upload Error: ' + (e?.message || 'Upload failed'));
    }
    uploadingToCloud.value = false
    uploadAfterCapture.value = false
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = capturingFile.value.replace(/^\//, '')
    a.click()
    URL.revokeObjectURL(url)
  }

  capturing.value = false
  capturingFile.value = ''
  captureBuffer.value = []
  parseMode = PARSE_NONE
}

watch(() => terminalOutput.value, (newLines) => {
  if (newLines.length <= lastProcessedIndex.value) {
    if (newLines.length < lastProcessedIndex.value) lastProcessedIndex.value = 0
    return
  }

  const linesToProcess = newLines.slice(lastProcessedIndex.value)
  lastProcessedIndex.value = newLines.length

  linesToProcess.forEach(line => {
    const plain = line.replace(/\x1B\[[0-9;]*[mK]/g, '').replace(/<[^>]+>/g, '').trim()
    if (!plain || plain.startsWith('>')) return

    // Filter out obvious system/status messages
    if (plain.toLowerCase().includes('starting scan mode') || 
        plain.includes('Fix:') || 
        plain.includes('ANTENNA')) return;

    if (plain.startsWith('[') && !plain.startsWith('[SPIFFS/')) return;

    if (parseMode === PARSE_LS) {
      // Filenames in Marauder SPIFFS don't contain colons, 
      // but system messages like "Starting Scan Mode: 31" do.
      const fileMatch = plain.match(/^([^\[\]:]+?)\s+(\d+)$/)
      if (fileMatch) {
        pendingFiles.push({ name: fileMatch[1].trim(), size: parseInt(fileMatch[2]) })
        return
      }
      if (plain.toLowerCase().includes('total used')) {
        const totalMatch = plain.match(/([\d\.]+)\s*\/\s*([\d\.]+)/)
        if (totalMatch) {
          storageInfo.value = plain.split(':').pop().trim()
        }
        files.value = [...pendingFiles]
        parseMode = PARSE_NONE
        return
      }
    }

    if (parseMode === PARSE_READ) {
      if (plain.startsWith('[SPIFFS/BEGIN]') || plain.startsWith('[SPIFFS/DUMP/BEGIN]')) {
        captureBuffer.value = []
        return
      }
      if (plain.includes('[SPIFFS/END]') || plain.includes('[SPIFFS/DUMP/END]')) {
        finishDownload()
        return
      }
      if (plain.startsWith('[') && !plain.startsWith('[SPIFFS/')) return
      captureBuffer.value.push(plain)
    }
  })
}, { deep: true })
</script>
