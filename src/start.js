#!/usr/bin/env node

const path = require('path');
const { exec } = require('child_process');

const serverPath = path.join(__dirname, 'server.js'); 

// run server.js
exec(`node ${serverPath}`, { stdio: 'inherit' }, (error) => {
    if (error) {
        console.error(`Error starting the server: ${error.message}`);
    }
});
