import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      // Ensure data files are copied to dist
      external: [],
      plugins: [
        {
          name: 'copy-data-files',
          writeBundle() {
            // Create data directory in dist
            const distDataDir = join(process.cwd(), 'dist', 'data')
            if (!existsSync(distDataDir)) {
              mkdirSync(distDataDir, { recursive: true })
            }

            // Copy JSON data files
            const dataFiles = ['quizData.json', 'learningData.json', 'leaderboardData.json']
            const srcDataDir = join(process.cwd(), 'src', 'data')

            dataFiles.forEach(file => {
              const srcPath = join(srcDataDir, file)
              const destPath = join(distDataDir, file)
              if (existsSync(srcPath)) {
                copyFileSync(srcPath, destPath)
                console.log(`✅ Copied ${file} to dist/data/`)
              }
            })
          }
        }
      ]
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})