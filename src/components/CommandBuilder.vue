<template>
    <div class="space-y-4">
      <!-- Quick Actions -->
      <div class="flex space-x-2">
        <button 
          @click="sendCommand('stopscan')"
          class="btn btn-danger flex-1"
        >
          Stop
        </button>
        <button 
          @click="sendCommand(props.rightContentView === 'bt' ? 'list -t' : 'list -a')"
          class="btn btn-primary flex-1"
        >
          {{ props.rightContentView === 'bt' ? 'List Airtags' : 'List APs' }}
        </button>
      </div>
  
      <!-- Scan Commands -->
      <div class="grid grid-cols-2 gap-2">
        <button 
          v-for="cmd in scanCommands" 
          :key="cmd.command"
          @click="sendCommand(cmd.command)"
          class="btn"
        >
          {{ cmd.label }}
        </button>
      </div>

      <!-- BLE Spam Buttons (only in Bluetooth view) -->
      <div v-if="props.rightContentView === 'bt'" class="grid grid-cols-2 gap-2 mt-2">
        <button @click="sendCommand('blespam -t apple')"
          class="btn btn-accent">
          Spam Apple
        </button>
        <button @click="sendCommand('blespam -t windows')"
          class="btn btn-accent">
          Spam Swift
        </button>
        <button @click="sendCommand('blespam -t samsung')"
          class="btn btn-accent">
          Spam Samsung
        </button>
        <button @click="sendCommand('blespam -t google')"
          class="btn btn-accent">
          Spam Google
        </button>
        <button @click="sendCommand('blespam -t flipper')"
          class="btn btn-accent">
          Spam Flipper
        </button>
        <button @click="sendCommand('blespam -t all')"
          class="btn btn-accent col-span-2">
          Spam All
        </button>
        <button @click="sendCommand('spoofat -t airtag')"
          class="btn btn-danger col-span-2 mt-2">
          BLE Spoof (AirTag)
        </button>
      </div>
  
      <!-- Custom Command -->
      <div class="flex space-x-2">
        <input 
          v-model="customCommand"
          @keyup.enter="sendCustomCommand"
          type="text"
          class="input-field flex-1"
          placeholder="Enter command..."
        >
        <button 
          @click="sendCustomCommand"
          class="btn btn-primary"
        >
          Send
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, defineProps } from 'vue'
  import { useSerialConnection } from '../utils/serialConnection'

  const props = defineProps({
    rightContentView: {
      type: String,
      default: 'ap'
    }
  })

  const { sendCommand: serialSendCommand } = useSerialConnection()
  const customCommand = ref('')

  const wifiCommands = [
    { label: 'Scan AP', command: 'scanap' },
    { label: 'Scan All', command: 'scanall' },
    { label: 'Sniff Beacon', command: 'sniffbeacon' },
    { label: 'Sniff Deauth', command: 'sniffdeauth' },
    { label: 'Sniff PMKID', command: 'sniffpmkid' },
    { label: 'Sniff Pwn', command: 'sniffpwn' },
    { label: 'Sniff Raw', command: 'sniffraw' },
    { label: 'Sniff Skim', command: 'sniffskim' },
    { label: 'Wardrive', command: 'wardrive -serial' }
  ]

  const btCommands = [
    { label: 'Scan Bluetooth', command: 'sniffbt' },
    { label: 'Scan Flipper', command: 'sniffbt -t flipper' },
    { label: 'Scan Airtag', command: 'sniffbt -t airtag' },
    { label: 'BT Spoof', command: 'spoofat -t apple' },
    { label: 'Wardrive', command: 'btwardrive' }
  ]

  const scanCommands = computed(() => {
    return props.rightContentView === 'bt' ? btCommands : wifiCommands
  })

  const sendCommand = async (cmd) => {
    await serialSendCommand(cmd)
  }

  const sendCustomCommand = async () => {
    if (customCommand.value.trim()) {
      await sendCommand(customCommand.value)
      customCommand.value = ''
    }
  }
  </script>
