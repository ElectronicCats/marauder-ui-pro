<template>
  <div class="card p-4 space-y-4">
    <h2 class="text-xl font-bold text-zinc-100">System Utilities</h2>

    <div class="grid grid-cols-2 gap-2">
      <button
        @click="runCommand('reboot', true)"
        class="btn btn-danger text-xs py-2"
      >
        Reboot
      </button>
      <button
        @click="runCommand('info')"
        class="btn btn-primary text-xs py-2"
      >
        Sys Info
      </button>
      <button
        @click="switchToView('storage')"
        class="btn btn-accent text-xs py-2 col-span-2"
      >
        Storage
      </button>
      <button
        @click="runCommand('clearlist -a', true)"
        class="btn bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2"
      >
        Clear APs
      </button>
      <button
        @click="runCommand('clearlist -c', true)"
        class="btn bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2"
      >
        Clear Stations
      </button>
    </div>

    <div class="space-y-2 pt-2 border-t border-zinc-800">
      <h3 class="text-sm font-semibold text-zinc-200">Channel</h3>
      <div class="flex gap-2">
        <input
          v-model.number="channel"
          type="number"
          min="1"
          max="14"
          class="input-field flex-1"
          placeholder="1-14"
        >
        <button @click="setChannel" class="btn btn-accent text-xs px-3">
          Set
        </button>
      </div>
    </div>

    <div class="space-y-2 pt-2 border-t border-zinc-800">
      <h3 class="text-sm font-semibold text-zinc-200">LED</h3>
      <div class="flex gap-2">
        <input
          v-model="ledColor"
          type="text"
          class="input-field flex-1"
          placeholder="#RRGGBB"
        >
        <button @click="setLedColor" class="btn btn-accent text-xs px-3">
          Set
        </button>
      </div>
      <button @click="runCommand('led -p rainbow')" class="w-full btn btn-primary text-xs">
        Rainbow
      </button>
    </div>

    <div class="space-y-2 pt-2 border-t border-zinc-800">
      <h3 class="text-sm font-semibold text-zinc-200">Autostart</h3>
      <div class="grid grid-cols-3 gap-2">
        <button @click="runCommand('autostart on')" class="btn btn-accent text-xs py-2">
          On
        </button>
        <button @click="runCommand('autostart off')" class="btn btn-danger text-xs py-2">
          Off
        </button>
        <button @click="runCommand('autostart status')" class="btn text-xs py-2">
          Status
        </button>
      </div>
    </div>

    <div class="space-y-2 pt-2 border-t border-zinc-800">
      <h3 class="text-sm font-semibold text-zinc-200">Settings</h3>
      <button @click="runCommand('settings')" class="w-full btn text-xs py-2">
        View Settings
      </button>
      <div class="flex gap-2">
        <input
          v-model.trim="settingName"
          type="text"
          class="input-field flex-1"
          placeholder="setting_name"
        >
        <button @click="toggleSetting('enable')" class="btn btn-accent text-xs px-3">
          Enable
        </button>
        <button @click="toggleSetting('disable')" class="btn btn-danger text-xs px-3">
          Disable
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useSerialConnection } from '../utils/serialConnection'

const { sendCommand } = useSerialConnection()
const switchToView = inject('switchToView')

const channel = ref(1)
const ledColor = ref('#00ff00')
const settingName = ref('')

const runCommand = async (cmd, needsConfirm = false) => {
  if (!needsConfirm || confirm(`Are you sure you want to execute: ${cmd}?`)) {
    await sendCommand(cmd)
  }
}

const setChannel = async () => {
  const value = Number(channel.value)
  if (!Number.isInteger(value) || value < 1 || value > 14) return
  await runCommand(`channel -s ${value}`)
}

const setLedColor = async () => {
  const normalized = ledColor.value.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return
  await runCommand(`led -s ${normalized}`)
}

const toggleSetting = async (mode) => {
  if (!settingName.value) return
  await runCommand(`settings -s ${settingName.value} ${mode}`)
}
</script>
