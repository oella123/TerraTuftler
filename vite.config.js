import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Helper function to recursively copy directories
function copyDirectoryRecursive(src, dest) {
  if (!existsSync(src)) {
    console.warn(`⚠️ Source directory does not exist: ${src}`);
    return;
  }

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const items = readdirSync(src);
  let copiedCount = 0;

  items.forEach(item => {
    const srcPath = join(src, item);
    const destPath = join(dest, item);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else if (stat.isFile()) {
      // Copy image files and other assets
      const ext = item.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
        copyFileSync(srcPath, destPath);
        copiedCount++;
      }
    }
  });

  if (copiedCount > 0) {
    console.log(`✅ Copied ${copiedCount} image files from ${src} to ${dest}`);
  }
}

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
          name: 'copy-assets-and-data',
          writeBundle() {
            console.log('🔄 Starting asset and data file copying...');

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
              } else {
                console.warn(`⚠️ Data file not found: ${srcPath}`)
              }
            })

            // Copy image assets
            const srcAssetsDir = join(process.cwd(), 'src', 'assets')
            const distAssetsDir = join(process.cwd(), 'dist', 'assets')

            if (existsSync(srcAssetsDir)) {
              console.log('📁 Copying image assets...');
              copyDirectoryRecursive(srcAssetsDir, distAssetsDir);
              console.log('✅ Image assets copied successfully');
            } else {
              console.warn('⚠️ Source assets directory not found:', srcAssetsDir);
            }

            console.log('🎉 Asset and data copying completed!');
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