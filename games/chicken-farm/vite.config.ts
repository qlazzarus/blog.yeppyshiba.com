import { defineConfig } from 'vite';

export default defineConfig({
    base: '/game-assets/chicken-farm/',
    build: {
        emptyOutDir: true,
        outDir: 'dist',
    },
    publicDir: 'assets',
});
