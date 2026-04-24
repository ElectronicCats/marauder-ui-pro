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
            <th class="px-3 py-2 text-right border-b border-zinc-800 font-bold w-40 text-zinc-400">Actions</th>
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
      Downloading {{ capturingFile }}...
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'

const { sendCommand, terminalOutput } = useSerialConnection()

const files = ref([])
const storageInfo = ref('')
const showFormatConfirm = ref(false)
const capturing = ref(false)
const capturingFile = ref('')
const captureBuffer = ref([])
const lastProcessedIndex = ref(0)

// Parse modes
const PARSE_NONE = 0
const PARSE_LS = 1
const PARSE_READ = 2
const PARSE_ACTION = 3
let parseMode = PARSE_NONE
let pendingFiles = []

const listFiles = async () => {
  pendingFiles = []
  storageInfo.value = ''
  parseMode = PARSE_LS
  await sendCommand('spiffs ls')
}

const downloadFile = async (name) => {
  capturing.value = true
  capturingFile.value = name
  captureBuffer.value = []
  parseMode = PARSE_READ
  await sendCommand(`spiffs read ${name}`)
}

const deleteFile = async (name) => {
  parseMode = PARSE_ACTION
  await sendCommand(`spiffs rm ${name}`)
  // Refresh after short delay
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

const finishDownload = () => {
  if (captureBuffer.value.length === 0) return

  const content = captureBuffer.value.join('\n')
  const blob = new Blob([content], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = capturingFile.value.replace(/^\//, '')
  a.click()
  URL.revokeObjectURL(url)

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
    const plain = line.replace(/<[^>]+>/g, '').trim()
    if (!plain || plain.startsWith('>')) return

    if (parseMode === PARSE_LS) {
      // Parse "filename\tsize" format
      const tabMatch = plain.match(/^(.+)\t(\d+)$/)
      if (tabMatch) {
        pendingFiles.push({ name: tabMatch[1], size: parseInt(tabMatch[2]) })
        return
      }
      // Parse "Total used: X / Y bytes"
      const totalMatch = plain.match(/^Total used:\s*([\d]+)\s*\/\s*([\d]+)\s*bytes/)
      if (totalMatch) {
        storageInfo.value = `${formatSize(parseInt(totalMatch[1]))} / ${formatSize(parseInt(totalMatch[2]))}`
        files.value = [...pendingFiles]
        parseMode = PARSE_NONE
        return
      }
    }

    if (parseMode === PARSE_READ) {
      if (plain === '[SPIFFS/BEGIN]') {
        captureBuffer.value = []
        return
      }
      if (plain === '[SPIFFS/END]') {
        finishDownload()
        return
      }
      captureBuffer.value.push(plain)
    }
  })
}, { deep: true })
</script>
