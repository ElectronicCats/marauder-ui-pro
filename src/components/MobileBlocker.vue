<template>
    <div v-if="isMobileDevice && !dismissed"
        class="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
        <div
            class="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-8 max-w-md w-full border-t-amber-500 border-t-4">
            <div class="text-5xl mb-6 animate-bounce">📱</div>
            <h1 class="text-2xl font-bold mb-4 text-zinc-100">Mobile Compatibility</h1>
            <p class="text-zinc-400 mb-6 leading-relaxed">
                This interface uses the <span class="text-amber-400 font-mono">Web Serial API</span>, which is primarily
                designed for desktop browsers (Chrome, Edge).
            </p>

            <div class="space-y-3">
                <button @click="dismissed = true"
                    class="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-all transform active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    Explore Demo Mode
                </button>
                <button @click="dismissed = true"
                    class="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-all">
                    Dismiss Warning
                </button>
            </div>

            <p class="mt-6 text-xs text-zinc-500 italic">
                Note: Connecting a real device may not work on this browser.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isMobileDevice = ref(false)
const dismissed = ref(false)

onMounted(() => {
    const checkMobile = () => {
        isMobileDevice.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 1024 // Increased threshold for tablet/small screens
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    onUnmounted(() => {
        window.removeEventListener('resize', checkMobile)
    })
})
</script>