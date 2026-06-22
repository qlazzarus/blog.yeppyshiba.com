import { defineConfig } from 'vite';

export default defineConfig({
    base: '/game-assets/apex-seoul/',
    build: {
        emptyOutDir: true,
        outDir: 'dist',
    },
});
