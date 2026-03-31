<template>
  <div class="min-h-screen flex flex-col bg-zinc-950 p-4 gap-4 text-zinc-300 overflow-y-auto">
    <MobileBlocker />

    <!-- Header -->
    <div
      class="bg-black rounded-lg border border-zinc-800 shadow-lg p-2 px-4 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
      <img :src="pwnterreyLogo" alt="Pwnterrey" class="h-12 object-contain" />
      <div class="flex items-center space-x-4">
        <!-- Demo Mode Button -->
        <button v-if="!serialConnection.isConnected.value" @click="toggleDemoMode"
          class="btn"
          :class="isDemoMode ? 'btn-primary' : ''">
          {{ isDemoMode ? 'Exit Demo' : 'Try Demo' }}
        </button>

        <span class="text-sm text-zinc-400">Status:</span>
        <button @click="handleConnect" v-if="!serialConnection.isConnected.value"
          class="btn btn-primary">
          Connect
        </button>
        <button @click="handleDisconnect" v-if="serialConnection.isConnected.value"
          class="btn btn-danger">
          Disconnect
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex gap-4">
      <!-- Left Sidebar -->
      <div class="w-1/4 flex flex-col gap-4">
        <!-- Command Builder -->
        <div class="card p-4">
          <CommandBuilder :rightContentView="rightContentView" />
        </div>

        <!-- System Utilities -->
        <SystemUtilities />

        <!-- Workflows -->
        <div
          class="card p-4">
          <h2 class="text-xl font-bold mb-4 text-zinc-100">Workflows</h2>
          <div class="space-y-2">
            <button v-for="workflow in workflows" :key="workflow.id" @click="openWorkflow(workflow)"
              class="w-full btn text-left mb-2">
              {{ workflow.name }}
            </button>
          </div>
        </div>
      </div>


      <!-- Right Content -->
      <div class="flex-1 flex flex-col gap-4">
        <!-- View Toggle -->
        <div class="mb-2 flex justify-end gap-2">
          <button v-for="v in viewOptions" :key="v.key"
            @click="rightContentView = v.key"
            class="btn"
            :class="rightContentView === v.key ? 'btn-accent' : ''">
            {{ v.label }}
          </button>
        </div>
        <!-- Active Command Indicator -->
        <div v-if="serialConnection.activeCommand.value"
          class="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/50 rounded px-3 py-1.5 text-sm">
          <span class="font-mono text-emerald-400">
            <span class="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
            {{ serialConnection.activeCommand.value }}
          </span>
          <button @click="serialConnection.sendCommand('stopscan')" class="text-xs btn btn-danger py-1 px-2">
            Stop
          </button>
        </div>

        <!-- Terminal Output -->
        <div class="min-h-[12rem] h-48 terminal-container p-4 bg-zinc-950/50 backdrop-blur-sm mb-4">
          <TerminalOutput />
        </div>
        <!-- Content Panel -->
        <div class="flex-1 card p-4 min-h-0">
          <AccessPointTable v-if="rightContentView === 'ap'" />
          <BluetoothDeviceTable v-else-if="rightContentView === 'bt'" />
          <GpsPanel v-else-if="rightContentView === 'gps'" />
        </div>
      </div>
    </div>

  </div>

  <Teleport to="body">
    <WorkflowDialog v-if="selectedWorkflow" :workflow="selectedWorkflow" @close="selectedWorkflow = null"
      @execute="executeWorkflow" />
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import MobileBlocker from './components/MobileBlocker.vue'
import CommandBuilder from './components/CommandBuilder.vue'
import TerminalOutput from './components/TerminalOutput.vue'
import AccessPointTable from './components/AccessPointTable.vue'
import BluetoothDeviceTable from './components/BluetoothDeviceTable.vue'
import GpsPanel from './components/GpsPanel.vue'
import WorkflowDialog from './components/WorkflowDialog.vue'
import SystemUtilities from './components/SystemUtilities.vue'
import pwnterreyLogo from './assets/Pwnterrey-1024x379.png'
import { useSerialConnection } from './utils/serialConnection'
import { generateDemoData, generateDemoTerminalOutput } from './utils/demoData'
const isDemoMode = ref(false)
const demoUpdateInterval = ref(null)

// State for right content view alternation
const rightContentView = ref('ap')
const viewOptions = [
  { key: 'ap', label: 'WiFi APs' },
  { key: 'bt', label: 'Bluetooth' },
  { key: 'gps', label: 'GPS' }
]

// Add mobile detection
const isMobileDevice = ref(false)

onMounted(() => {
  const checkMobile = () => {
    isMobileDevice.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth <= 768
  }

  // Check on mount
  checkMobile()

  // Check on resize
  window.addEventListener('resize', checkMobile)

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
  })
})

const serialConnection = useSerialConnection()
const selectedWorkflow = ref(null)
const workflows = [
  {
    id: 'random-beacon-spam-list',
    name: 'Random Beacon Spam (List)',
    description: 'Generates a list of random SSIDs and broadcasts beacon frames using this list.',
    steps: [
      { command: 'ssid -a -g 50', description: 'Generate 50 random SSIDs' },
      { command: 'list -s', description: 'Display generated SSIDs' },
      { command: 'attack -t beacon -l', description: 'Execute beacon list attack' }
    ]
  },
  {
    id: 'random-beacon-spam-auto',
    name: 'Random Beacon Spam (Auto)',
    description: 'Broadcasts beacon frames with automatically generated random SSIDs.',
    steps: [
      { command: 'attack -t beacon -r', description: 'Execute random beacon spam attack' }
    ]
  },
  {
    id: 'targeted-pmkid-sniff',
    name: 'Targeted Active PMKID Sniff',
    description: 'Performs targeted PMKID sniffing on selected access points.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'select -a {targets}',
        description: 'Select target access points',
        requiresInput: true,
        inputLabel: 'Target AP indices (comma-separated)',
        placeholder: '0,1,2'
      },
      { command: 'list -a', description: 'Verify selected access points' },
      { command: 'sniffpmkid -d -l', description: 'Execute targeted PMKID sniff' }
    ]
  },
  {
    id: 'clone-ap-mac',
    name: 'Clone AP MAC',
    description: 'Scan APs, select a target AP, and clone its MAC.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'select -a {index}',
        description: 'Select AP index',
        requiresInput: true,
        inputLabel: 'AP index',
        placeholder: '0'
      },
      {
        command: 'cloneapmac -a {index}',
        description: 'Clone selected AP MAC',
        requiresInput: true,
        inputLabel: 'AP index',
        placeholder: '0'
      }
    ]
  },
  {
    id: 'clone-station-mac',
    name: 'Clone Station MAC',
    description: 'Scan clients, select a station, and clone its MAC.',
    steps: [
      { command: 'scanall', description: 'Scan all channels' },
      { command: 'list -c', description: 'List clients/stations' },
      {
        command: 'select -c {index}',
        description: 'Select station index',
        requiresInput: true,
        inputLabel: 'Station index',
        placeholder: '0'
      },
      {
        command: 'clonestamac -s {index}',
        description: 'Clone selected station MAC',
        requiresInput: true,
        inputLabel: 'Station index',
        placeholder: '0'
      }
    ]
  },
  {
    id: 'join-network',
    name: 'Join Network',
    description: 'Scan APs and join a network using AP index and password.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'join -a {index} -p {password}',
        description: 'Join selected AP',
        requiresInput: true,
        inputLabel: 'AP index',
        placeholder: '0',
        requiresSecondInput: true,
        secondInputLabel: 'Password',
        secondPlaceholder: 'network-password'
      }
    ]
  },
  {
    id: 'evil-portal-serial',
    name: 'Evil Portal (Serial)',
    description: 'Set portal HTML through serial payload and then start Evil Portal.',
    steps: [
      {
        command: 'evilportal -c sethtmlstr',
        description: 'Prepare Marauder to receive portal HTML payload',
        requiresSerialPayload: true,
        serialPayloadLabel: 'Portal HTML',
        serialPayloadPlaceholder: '<!doctype html>\n<html>\n  <body>Portal content</body>\n</html>',
        payloadDelayMs: 150
      },
      { command: 'evilportal -c start', description: 'Start Evil Portal with loaded HTML' }
    ]
  },
  {
    id: 'list-beacon-spam',
    name: 'List Beacon Spam',
    description: 'Creates a custom list of SSIDs and broadcasts beacon frames using this list.',
    steps: [
      {
        command: 'ssid -a -{type} {value}',
        description: 'Add SSIDs to the list',
        requiresInput: true,
        inputLabel: 'SSID Generation',
        placeholder: 'g 3 or n MySSID',
        help: 'Use "g NUMBER" for random or "n NAME" for specific SSID'
      },
      { command: 'list -s', description: 'Display generated SSIDs' },
      { command: 'attack -t beacon -l', description: 'Execute beacon list attack' }
    ]
  },
  {
    id: 'ap-clone-spam',
    name: 'AP Clone Spam',
    description: 'Clones nearby APs and broadcasts them with slightly modified names.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'select -a {targets}',
        description: 'Select target access points',
        requiresInput: true,
        inputLabel: 'Target AP indices (comma-separated)',
        placeholder: '0,1,2'
      },
      { command: 'list -a', description: 'Verify selected access points' },
      { command: 'attack -t beacon -a', description: 'Execute AP clone spam attack' }
    ]
  },
  {
    id: 'deauth-flood',
    name: 'Deauthentication Flood',
    description: 'Broadcasts deauthentication frames to all clients of selected APs.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'select -a {targets}',
        description: 'Select target access points',
        requiresInput: true,
        inputLabel: 'Target AP indices (comma-separated)',
        placeholder: '0,1'
      },
      { command: 'list -a', description: 'Verify selected access points' },
      { command: 'attack -t deauth', description: 'Execute deauthentication flood' }
    ]
  },
  {
    id: 'targeted-deauth',
    name: 'Targeted Deauthentication',
    description: 'Targets specific stations connected to selected APs.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'select -a {apTargets}',
        description: 'Select target access points',
        requiresInput: true,
        inputLabel: 'Target AP indices (comma-separated)',
        placeholder: '0,1'
      },
      { command: 'list -a', description: 'Verify selected access points' },
      { command: 'scanall', description: 'Scan for stations' },
      { command: 'list -c', description: 'List available stations' },
      {
        command: 'select -c {staTargets}',
        description: 'Select target stations',
        requiresInput: true,
        inputLabel: 'Target station indices (comma-separated)',
        placeholder: '0,12'
      },
      { command: 'list -c', description: 'Verify selected stations' },
      { command: 'attack -t deauth -c', description: 'Execute targeted deauthentication' }
    ]
  },
  {
    id: 'manual-deauth',
    name: 'Manual Deauthentication',
    description: 'Manually specified source and destination for deauth frames.',
    steps: [
      {
        command: 'attack -t deauth -s {source} -d {dest}',
        description: 'Execute manual deauthentication attack',
        requiresInput: true,
        inputLabel: 'Source MAC',
        placeholder: '00:00:00:00:00:00',
        requiresSecondInput: true,
        secondInputLabel: 'Destination MAC',
        secondPlaceholder: 'ff:ff:ff:ff:ff:ff'
      }
    ]
  },
  {
    id: 'signal-monitor',
    name: 'Signal Monitor',
    description: 'Monitor signal strength of selected access points.',
    steps: [
      { command: 'scanap', description: 'Scan for access points' },
      { command: 'list -a', description: 'List available access points' },
      {
        command: 'select -a {targets}',
        description: 'Select target access points',
        requiresInput: true,
        inputLabel: 'Target AP indices (comma-separated)',
        placeholder: '0,1'
      },
      { command: 'list -a', description: 'Verify selected access points' },
      { command: 'sigmon', description: 'Start signal monitoring' }
    ]
  },
  {
    id: 'network-recon',
    name: 'Network Recon (Full)',
    description: 'Scans for hosts and maps open ports on the local network.',
    steps: [
      { command: 'pingscan', description: 'Ping scan for active hosts' },
      { command: 'portscan', description: 'Port scan for open services' }
    ]
  },
  {
    id: 'mac-randomize',
    name: 'Stealth Mode (MAC Randomize)',
    description: 'Randomizes both AP and Station MAC addresses for stealth.',
    steps: [
      { command: 'randapmac', description: 'Randomize AP MAC' },
      { command: 'randstamac', description: 'Randomize Station MAC' },
      { command: 'info', description: 'Verify new identifiers' }
    ]
  },
  {
    id: 'karma-attack',
    name: 'Karma Attack',
    description: 'Automated setup of a Karma attack to attract searching clients.',
    steps: [
      { command: 'karma -p', description: 'Enable Karma mode' },
      { command: 'scanap', description: 'Start background scan' }
    ]
  }
]

const openWorkflow = (workflow) => {
  console.log('Opening workflow:', workflow) // Debug log
  selectedWorkflow.value = workflow
}

const executeWorkflow = async (steps) => {
  console.log('Executing workflow steps:', steps) // Debug log
  for (const step of steps) {
    const command = typeof step === 'string' ? step : step.command
    if (command) {
      await serialConnection.sendCommand(command)
    }

    if (typeof step !== 'string' && step.serialPayload) {
      await new Promise(resolve => setTimeout(resolve, step.payloadDelayMs ?? 200))
      await serialConnection.sendRaw(step.serialPayload)
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }
  selectedWorkflow.value = null
}

const handleConnect = async () => {
  console.log('Attempting to connect...')
  try {
    await serialConnection.connect()
  } catch (error) {
    console.error('Connection error:', error)
  }
}

const handleDisconnect = async () => {
  console.log('Attempting to disconnect...')
  try {
    await serialConnection.disconnect()
  } catch (error) {
    console.error('Disconnection error:', error)
  }
}

const sendCommand = async (cmd) => {
  try {
    await serialConnection.sendCommand(cmd)
  } catch (error) {
    console.error('Command error:', error)
  }
}

const toggleDemoMode = () => {
  isDemoMode.value = !isDemoMode.value

  serialConnection.isDemoMode = isDemoMode.value
  if (isDemoMode.value) {
    // Initialize demo data
    serialConnection.terminalOutput.value = generateDemoTerminalOutput()
  } else {
    // Clear demo data
    clearInterval(demoUpdateInterval.value)
    serialConnection.terminalOutput.value = []
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  if (demoUpdateInterval.value) {
    clearInterval(demoUpdateInterval.value)
  }
})
</script>

<style>
.workflow-dialog {
  z-index: 9999;
}
</style>
