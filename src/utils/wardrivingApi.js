import { reactive } from 'vue';

const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL;
const LOGIN_URL = import.meta.env.VITE_LOGIN_URL;
const DEVICE_SOURCE = import.meta.env.VITE_DEVICE_SOURCE;

export const authState = reactive({
  isLoggedIn: !!localStorage.getItem('wardriving_token')
});

export const wardrivingApi = {
  getToken() {
    return localStorage.getItem('wardriving_token');
  },

  setToken(token) {
    localStorage.setItem('wardriving_token', token);
    authState.isLoggedIn = true;
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  logout() {
    localStorage.removeItem('wardriving_token');
    authState.isLoggedIn = false;
  },

  async login(email, password) {
    try {
      // Use the exact same username format as we used in the register method
      const username = email.split('@')[0];
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok && data.access) {
        this.setToken(data.access);
        return { success: true };
      }

      // Detailed error for login
      let errorMessage = 'Login failed';
      if (data.detail) {
        errorMessage = data.detail;
      } else if (typeof data === 'object') {
        errorMessage = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
      }
      
      return { success: false, error: errorMessage };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async register(email, password, passwordConfirm) {
    try {
      // Some Django backends require 'username' even if they use email for login.
      // We'll use the email part as username.
      const username = email.split('@')[0];
      
      const response = await fetch(import.meta.env.VITE_REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          username,
          password_confirm: passwordConfirm 
        })
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true };
      }
      
      // Convert error object to a readable string if it's not a single detail
      let errorMessage = 'Registration failed';
      if (data.detail) {
        errorMessage = data.detail;
      } else if (typeof data === 'object') {
        errorMessage = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
      }
      
      return { success: false, error: errorMessage };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async uploadFile(fileBlob, fileName) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('device_source', DEVICE_SOURCE);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true, data };
      }

      // Convert error object to a readable string
      let errorMessage = 'Upload failed';
      if (data.detail) {
        errorMessage = data.detail;
      } else if (typeof data === 'object') {
        errorMessage = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
      }
      return { success: false, error: errorMessage };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
