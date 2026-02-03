import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const THEME_KEY = 'redis-web-theme'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(
    (typeof localStorage !== 'undefined' && localStorage.getItem(THEME_KEY)) || 'dark'
  )

  const isDark = computed(() => theme.value === 'dark')

  const setTheme = (value) => {
    if (value !== 'light' && value !== 'dark') return
    theme.value = value
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, value)
    }
    applyTheme(value)
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  const applyTheme = (value) => {
    const html = document.documentElement
    html.setAttribute('data-theme', value)
    if (value === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    applyTheme
  }
})
