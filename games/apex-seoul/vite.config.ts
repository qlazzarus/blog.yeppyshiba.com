import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    base: '/game-assets/apex-seoul/',
    build: {
        emptyOutDir: true,
        outDir: 'dist',
        rollupOptions: {
            input: {
                game: resolve(__dirname, 'index.html'),
                vehiclePreview: resolve(__dirname, 'vehicle-preview.html'),
            },
        },
    },
});
