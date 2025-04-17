import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token') || null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token
  },

  actions: {
    async login(email, password) {
      try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
          email,
          password
        })

        this.user = response.data.user
        this.token = response.data.token
        localStorage.setItem('token', response.data.token)
        
        return true
      } catch (error) {
        console.error('Login error:', error)
        return false
      }
    },

    async register(email, password) {
      try {
        const response = await axios.post('http://localhost:3000/api/auth/register', {
          email,
          password
        })

        this.user = response.data.user
        this.token = response.data.token
        localStorage.setItem('token', response.data.token)
        
        return true
      } catch (error) {
        console.error('Registration error:', error)
        return false
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
    }
  }
}) 