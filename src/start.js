#!/usr/bin/env node 

const path = require('path');
const { spawn } = require('child_process'); 

const serverPath = path.join(__dirname, 'server.js');

const subprocess = spawn('node', [serverPath], { stdio: 'inherit' });

subprocess.on('error', (error) => {
    console.error(`Error starting the server: ${error.message}`);
});

subprocess.on('exit', (code) => {
    console.log(`Server exited with code: ${code}`);
});
