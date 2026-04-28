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
          @click="sendCommand('list -a')"
          class="btn btn-primary flex-1"
        >
          List APs
        </button>
      </div>
  
      <!-- Scan Commands -->
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="cmd in scanCommands"
          :key="cmd.command || cmd.action"
          @click="cmd.action ? switchToView(cmd.action) : sendCommand(cmd.command)"
          class="btn"
        >
          {{ cmd.label }}
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
  import { ref, computed, inject, defineProps } from 'vue'
  import { useSerialConnection } from '../utils/serialConnection'

  const props = defineProps({
    rightContentView: {
      type: String,
      default: 'ap'
    }
  })

  const { sendCommand: serialSendCommand } = useSerialConnection()
  const switchToView = inject('switchToView')
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
    { label: 'Wardrive', action: 'wardrive' }
  ]

  const scanCommands = computed(() => {
    return wifiCommands
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
