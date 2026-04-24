import { ref, computed } from 'vue'

// Create singleton instance
const port = ref(null)
const reader = ref(null)
const isConnected = ref(false)
const terminalOutput = ref([])
const isDemoMode = ref(false)
const activeCommand = ref(null)
let buffer = ''
let keepReading = false

// Commands that run continuously until stopscan
const continuousCommands = new Set([
  'scanap', 'scanall',
  'sniffbeacon', 'sniffdeauth', 'sniffpmkid', 'sniffpwn', 'sniffraw',
  'sniffbt', 'sniffskim', 'sniffmultissid', 'sniffpinescan', 'sniffsae',
  'mactrack', 'packetcount',
  'attack', 'sigmon', 'pingscan', 'portscan',
  'gpsdata', 'nmea', 'wardrive', 'btwardrive', 'gpspoi',
  'karma'
])

const isContinuous = (command) => {
  const base = command.split(/\s+/)[0]
  // gps -t (tracker) is also continuous
  if (base === 'gps' && command.includes('-t')) return true
  return continuousCommands.has(base)
}

export const useSerialConnection = () => {
  const connect = async () => {
    console.log('Connect function called')
    try {
      if (!navigator.serial) {
        console.error('Web Serial API not supported')
        throw new Error('Web Serial API not supported in this browser')
      }

      console.log('Requesting port...')
      port.value = await navigator.serial.requestPort()
      console.log('Port selected:', port.value)

      console.log('Opening port...')
      await port.value.open({ baudRate: 115200 })
      console.log('Port opened successfully')

      isConnected.value = true
      keepReading = true
      addToTerminal('✓ Connected to serial port', 'success')
      startReading()
    } catch (error) {
      console.error('Connection error:', error)
      isConnected.value = false
      addToTerminal(`✗ Failed to connect: ${error.message}`, 'error')
      throw error
    }
  }

  const disconnect = async () => {
    if (port.value) {
      try {
        keepReading = false
        if (reader.value) {
          await reader.value.cancel()
          reader.value = null
        }
        await port.value.close()
        port.value = null
        isConnected.value = false
        buffer = ''
        addToTerminal('✗ Disconnected from serial port', 'error')
      } catch (error) {
        console.error('Disconnection error:', error)
        port.value = null
        reader.value = null
        isConnected.value = false
        addToTerminal(`✗ Error disconnecting: ${error.message}`, 'error')
      }
    }
  }

  const startReading = async () => {
    const decoder = new TextDecoder()
    while (port.value && port.value.readable && keepReading) {
      try {
        reader.value = port.value.readable.getReader()
        while (true) {
          const { value, done } = await reader.value.read()
          if (done) break

          if (value) {
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop()

            lines.forEach(line => {
              if (line.trim()) {
                addToTerminal(line.trim())
              }
            })
          }
        }
      } catch (error) {
        // Expected when disconnect cancels the reader
      } finally {
        if (reader.value) {
          try { reader.value.releaseLock() } catch (e) {}
          reader.value = null
        }
      }
    }
  }

  const writeToSerial = async (text) => {
    const writer = port.value.writable.getWriter()
    const encoder = new TextEncoder()
    await writer.write(encoder.encode(text))
    writer.releaseLock()
  }

  const stopIfRunning = async () => {
    if (!activeCommand.value) return
    try {
      await writeToSerial('stopscan\n')
      addToTerminal('> stopscan (auto)', 'command')
      activeCommand.value = null
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Auto-stop error:', error)
    }
  }

  const sendCommand = async (command) => {
    console.log(isDemoMode.value)
    if (isDemoMode.value) {
      // Handle demo commands
      addToTerminal(`> ${command}`, 'command')

      // Simulate responses based on command
      switch (command) {
        case 'scanap':
          addToTerminal('Starting AP scan. Stop with stopscan')
          setTimeout(() => {
            generateDemoData().forEach(ap => {
              addToTerminal(`RSSI: ${ap.rssi} Ch: ${ap.channel} BSSID: ${ap.bssid} ESSID: ${ap.essid}`)
            })
          }, 500)
          break
        case 'list -a':
          generateDemoData().forEach(ap => {
            addToTerminal(`[${ap.index}][CH:${ap.channel}] ${ap.essid}${ap.isSelected ? ' (selected)' : ''}`)
          })
          break
        case 'stopscan':
          addToTerminal('Stopping all scans...')
          activeCommand.value = null
          break
        default:
          addToTerminal(`Executing: ${command}`)
      }
      if (isContinuous(command)) activeCommand.value = command
      return
    }

    if (!command || !port.value) {
      addToTerminal('✗ No command or not connected', 'error')
      return
    }

    // Auto-stop running scan before starting a new continuous command
    if (isContinuous(command) && activeCommand.value) {
      await stopIfRunning()
    }

    // stopscan clears active state
    if (command === 'stopscan') {
      activeCommand.value = null
    }

    try {
      await writeToSerial(command + '\n')
      addToTerminal(`> ${command}`, 'command')

      if (isContinuous(command)) {
        activeCommand.value = command
      }
    } catch (error) {
      console.error('Send error:', error)
      addToTerminal(`✗ Failed to send command: ${error.message}`, 'error')
    }
  }

  const sendRaw = async (rawText) => {
    if (isDemoMode.value) {
      addToTerminal(`> [raw] ${rawText}`, 'command')
      addToTerminal('Raw payload sent (demo mode)')
      return
    }

    if (!rawText || !port.value) {
      addToTerminal('✗ No raw payload or not connected', 'error')
      return
    }

    try {
      await writeToSerial(rawText)
      addToTerminal(`> [raw] ${rawText}`, 'command')
    } catch (error) {
      console.error('Raw send error:', error)
      addToTerminal(`✗ Failed to send raw payload: ${error.message}`, 'error')
    }
  }

  // Firmware messages that indicate a command failed to start
  const failurePatterns = [
    'GPS Module not detected',
    'GPS not supported',
    'GPS Not Found',
    'Could not detect GPS baudrate',
    'Bluetooth not supported',
    'SD card is not connected',
    'SD card support disabled',
    'You did not provide a valid argument',
    'You did not provide a valid flag'
  ]

  const addToTerminal = (text, type = 'normal') => {
    console.log('Adding to terminal:', text, type) // Debug log
    if (text.trim()) {
      // Clear active command if firmware reports failure
      if (activeCommand.value && type === 'normal') {
        const lower = text.toLowerCase()
        if (failurePatterns.some(p => lower.includes(p.toLowerCase()))) {
          activeCommand.value = null
        }
      }

      const lineClass = getTypeClass(type)
      terminalOutput.value = [...terminalOutput.value, `<span class="${lineClass}">${text}</span>`]

      // Keep only last 1000 lines
      if (terminalOutput.value.length > 1000) {
        terminalOutput.value = terminalOutput.value.slice(-1000)
      }
    }
  }

  const getTypeClass = (type) => {
    const classes = {
      normal: 'text-green-400',
      success: 'text-blue-400',
      error: 'text-red-500',
      command: 'text-yellow-400'
    }
    return classes[type] || classes.normal
  }

  return {
    isConnected: computed(() => isConnected.value), // Make it computed
    isDemoMode,
    terminalOutput,
    connect,
    disconnect,
    activeCommand: computed(() => activeCommand.value),
    sendCommand,
    sendRaw
  }
}
