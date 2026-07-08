const major = Number.parseInt(process.versions.node.split('.')[0], 10);

if (major < 18) {
    console.error([
        `retro-asset-studio requires Node.js 18 or newer. Current version: ${process.version}`,
        '',
        'The ComfyUI bridge uses native ESM, fetch, Blob, and FormData.',
        'Install or select a newer Node in WSL, then retry:',
        '  nvm install 22',
        '  nvm use 22',
        '  npm run ping',
    ].join('\n'));
    process.exit(1);
}
