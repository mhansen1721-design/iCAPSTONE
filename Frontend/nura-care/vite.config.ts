import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow access to the entire iCAPSTONE folder so Backend is accessible
      allow: [
        path.resolve(__dirname, '..'), // Allows the Frontend parent
        path.resolve(__dirname, '../../Backend') // Specifically allow the Backend folder
      ]
    }
  }
})