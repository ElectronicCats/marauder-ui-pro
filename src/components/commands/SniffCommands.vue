<template>
  <div class="command-group">
    <div class="grid gap-3">
      <div class="grid grid-cols-2 gap-3">
        <button @click="runCommand('sniffraw')" class="command-btn">
          Raw Sniff
        </button>
        <button @click="runCommand('sniffbeacon')" class="command-btn">
          Beacon Sniff
        </button>
        <button @click="runCommand('sniffprobe')" class="command-btn">
          Probe Sniff
        </button>
        <button @click="runCommand('sniffpwn')" class="command-btn">
          PWN Sniff
        </button>
        <button @click="runCommand('sniffdeauth')" class="command-btn">
          Deauth Sniff
        </button>
        <button @click="runCommand('sniffmultissid')" class="command-btn">
          MultiSSID Sniff
        </button>
        <button @click="runCommand('sniffpinescan')" class="command-btn">
          Pine Scan Sniff
        </button>
        <button @click="runCommand('sniffsae')" class="command-btn">
          SAE Sniff
        </button>
        <button @click="runCommand('mactrack')" class="command-btn">
          MAC Track
        </button>
        <button @click="runCommand('packetcount')" class="command-btn">
          Packet Count
        </button>
      </div>

      <div class="bg-white p-4 rounded-lg border-2 border-black mt-3">
        <h3 class="font-bold mb-2">PMKID Sniff Options</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm mb-1">Channel:</label>
            <input v-model="channel" type="number" class="input-field" placeholder="Channel number">
          </div>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input v-model="deauth" type="checkbox" class="mr-2">
              Deauth
            </label>
            <label class="flex items-center">
              <input v-model="loop" type="checkbox" class="mr-2">
              Loop
            </label>
          </div>
          <button @click="buildPmkidCommand" class="command-btn w-full">
            Start PMKID Sniff
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useSerialConnection } from '../../utils/serialConnection'

const channel = ref('')
const deauth = ref(false)
const loop = ref(false)
const { sendCommand } = useSerialConnection()

const runCommand = async (command) => {
  await sendCommand(command)
}

const buildPmkidCommand = async () => {
  let cmd = 'sniffpmkid'
  if (channel.value) cmd += ` -c ${channel.value}`
  if (deauth.value) cmd += ' -d'
  if (loop.value) cmd += ' -l'
  await sendCommand(cmd)
}
</script>
