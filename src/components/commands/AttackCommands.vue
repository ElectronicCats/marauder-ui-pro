<template>
  <div class="command-group">
    <div class="space-y-3">
      <select v-model="attackType" class="input-field">
        <option value="">Select Attack Type</option>
        <option value="deauth">Deauth</option>
        <option value="beacon">Beacon</option>
        <option value="probe">Probe</option>
        <option value="rickroll">Rickroll</option>
        <option value="badmsg">BadMsg</option>
        <option value="sleep">Sleep</option>
        <option value="sae">SAE</option>
        <option value="csa">CSA</option>
        <option value="quiet">Quiet</option>
        <option value="funny">Funny</option>
      </select>

      <div v-if="attackType === 'deauth'" class="space-y-2">
        <input
          v-model="destinationMac"
          type="text"
          class="input-field"
          placeholder="Destination MAC (-d), e.g. ff:ff:ff:ff:ff:ff"
        >
      </div>

      <div v-if="attackType === 'beacon'" class="space-y-2">
        <select v-model="beaconMode" class="input-field">
          <option value="r">Random Beacon (-r)</option>
          <option value="l">List Beacon (-l)</option>
          <option value="a">AP Clone Beacon (-a)</option>
        </select>
      </div>

      <div v-if="attackType === 'badmsg' || attackType === 'sleep'" class="space-y-2">
        <label class="flex items-center gap-2">
          <input v-model="targetedMode" type="checkbox">
          Targeted mode (-c)
        </label>
      </div>

      <button
        @click="buildAttackCommand"
        class="command-btn w-full"
        :disabled="!attackType"
      >
        Launch Attack
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['command-built'])
const attackType = ref('')
const destinationMac = ref('')
const beaconMode = ref('r')
const targetedMode = ref(false)

const buildAttackCommand = () => {
  if (!attackType.value) return

  let cmd = `attack -t ${attackType.value}`

  if (attackType.value === 'deauth' && destinationMac.value) {
    cmd += ` -d ${destinationMac.value}`
  }

  if (attackType.value === 'beacon' && beaconMode.value) {
    cmd += ` -${beaconMode.value}`
  }

  if ((attackType.value === 'badmsg' || attackType.value === 'sleep') && targetedMode.value) {
    cmd += ' -c'
  }

  emit('command-built', cmd)
}
</script>
