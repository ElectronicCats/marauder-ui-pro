<template>
  <div class="flex items-center gap-2 border-l border-zinc-700 pl-4 ml-2">
    <span class="text-xs text-zinc-500 uppercase tracking-wide hidden sm:inline">Platform</span>
    <template v-if="isAuthenticated">
      <span class="text-xs text-emerald-500 font-mono">Signed in</span>
      <button type="button" class="btn btn-danger py-1 px-2 text-xs" @click="onLogout">
        Sign out
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        class="btn py-1 px-2 text-xs"
        :class="authConfigured ? 'btn-accent' : 'opacity-50'"
        :disabled="!authConfigured"
        :title="!authConfigured ? 'Set VITE_LOGIN_URL and/or VITE_REGISTER_URL in .env' : ''"
        @click="openModal"
      >
        Sign in
      </button>
    </template>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
        @click.self="closeModal"
      >
        <div
          class="bg-zinc-900 rounded-lg border border-zinc-800 shadow-2xl p-6 w-full max-w-md text-zinc-300"
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-zinc-100">Platform account</h2>
            <button type="button" class="p-2 hover:bg-zinc-800 rounded text-zinc-500" @click="closeModal">
              ✕
            </button>
          </div>

          <div class="flex gap-1 mb-4 p-1 bg-zinc-950 rounded border border-zinc-800">
            <button
              type="button"
              class="flex-1 py-2 text-sm font-bold rounded transition-colors"
              :class="mode === 'login' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
              :disabled="!loginUrlConfigured"
              @click="mode = 'login'"
            >
              Login
            </button>
            <button
              type="button"
              class="flex-1 py-2 text-sm font-bold rounded transition-colors"
              :class="mode === 'register' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
              :disabled="!registerUrlConfigured"
              @click="mode = 'register'"
            >
              Register
            </button>
          </div>

          <form v-if="mode === 'login'" class="space-y-3" @submit.prevent="submitLogin">
            <div>
              <label class="block text-sm text-zinc-400 mb-1">Username</label>
              <input
                v-model="loginUsername"
                type="text"
                autocomplete="username"
                required
                class="input-field w-full"
                placeholder="Username"
              />
            </div>
            <div>
              <label class="block text-sm text-zinc-400 mb-1">Password</label>
              <input
                v-model="loginPassword"
                type="password"
                autocomplete="current-password"
                required
                class="input-field w-full"
                placeholder="••••••••"
              />
            </div>
            <p v-if="errorMsg" class="text-sm text-red-400 break-words">{{ errorMsg }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn flex-1" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary flex-1" :disabled="submitting || !loginUrlConfigured">
                {{ submitting ? 'Signing in…' : 'Sign in' }}
              </button>
            </div>
          </form>

          <form v-else class="space-y-3" @submit.prevent="submitRegister">
            <div>
              <label class="block text-sm text-zinc-400 mb-1">Username</label>
              <input
                v-model="regUsername"
                type="text"
                autocomplete="username"
                required
                class="input-field w-full font-mono text-xs"
                placeholder="Username"
              />
            </div>
            <div>
              <label class="block text-sm text-zinc-400 mb-1">Email</label>
              <input
                v-model="regEmail"
                type="email"
                autocomplete="email"
                required
                class="input-field w-full"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label class="block text-sm text-zinc-400 mb-1">Password</label>
              <input
                v-model="regPassword"
                type="password"
                autocomplete="new-password"
                required
                class="input-field w-full"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label class="block text-sm text-zinc-400 mb-1">Confirm password</label>
              <input
                v-model="regPasswordConfirm"
                type="password"
                autocomplete="new-password"
                required
                class="input-field w-full"
                placeholder="••••••••"
              />
            </div>
            <p v-if="errorMsg" class="text-sm text-red-400 break-words">{{ errorMsg }}</p>
            <p v-if="registerSuccessMsg" class="text-sm text-emerald-400">{{ registerSuccessMsg }}</p>
            <div class="flex gap-2 pt-2">
              <button type="button" class="btn flex-1" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary flex-1" :disabled="submitting || !registerUrlConfigured">
                {{ submitting ? 'Creating account…' : 'Register' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuth } from '../composables/useAuth'

const { isAuthenticated, login, register, logout } = useAuth()

const showModal = ref(false)
const mode = ref('login')

const loginUsername = ref('')
const loginPassword = ref('')

const regUsername = ref('')
const regEmail = ref('')
const regPassword = ref('')
const regPasswordConfirm = ref('')

const errorMsg = ref('')
const registerSuccessMsg = ref('')
const submitting = ref(false)

const loginUrlConfigured = computed(() => Boolean(import.meta.env.VITE_LOGIN_URL))
const registerUrlConfigured = computed(() => Boolean(import.meta.env.VITE_REGISTER_URL))
const authConfigured = computed(() => loginUrlConfigured.value || registerUrlConfigured.value)

watch(showModal, (open) => {
  if (open) {
    if (!loginUrlConfigured.value && registerUrlConfigured.value) {
      mode.value = 'register'
    } else {
      mode.value = 'login'
    }
    registerSuccessMsg.value = ''
    errorMsg.value = ''
  }
})

function openModal () {
  if (!authConfigured.value) return
  errorMsg.value = ''
  registerSuccessMsg.value = ''
  showModal.value = true
}

function closeModal () {
  showModal.value = false
  errorMsg.value = ''
  registerSuccessMsg.value = ''
  loginPassword.value = ''
  regPassword.value = ''
  regPasswordConfirm.value = ''
}

async function submitLogin () {
  errorMsg.value = ''
  registerSuccessMsg.value = ''
  submitting.value = true
  try {
    await login(loginUsername.value, loginPassword.value)
    closeModal()
  } catch (e) {
    errorMsg.value = e?.message || 'Login failed'
  } finally {
    submitting.value = false
  }
}

async function submitRegister () {
  errorMsg.value = ''
  registerSuccessMsg.value = ''

  if (regPassword.value !== regPasswordConfirm.value) {
    errorMsg.value = 'Passwords do not match'
    return
  }

  submitting.value = true
  try {
    const { token } = await register({
      username: regUsername.value,
      email: regEmail.value,
      password: regPassword.value,
      password_confirm: regPasswordConfirm.value
    })
    if (token) {
      closeModal()
    } else {
      registerSuccessMsg.value = 'Account created. Sign in with your username and password.'
      mode.value = 'login'
      loginUsername.value = regUsername.value.trim()
      regPassword.value = ''
      regPasswordConfirm.value = ''
    }
  } catch (e) {
    errorMsg.value = e?.message || 'Registration failed'
  } finally {
    submitting.value = false
  }
}

function onLogout () {
  logout()
}
</script>
