#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 获取命令行参数
const args = process.argv.slice(2);

//  -v or --version 
if (args.includes('-v') || args.includes('--version')) {

    const packageJsonPath = path.join(__dirname, '../package.json');

    fs.readFile(packageJsonPath, 'utf8', (err, data) => {
        if (err) {
            console.error('read package.json error:', err);
            process.exit(1);
        }
        try {
            const packageJson = JSON.parse(data);
            console.log(packageJson.version); 
        } catch (parseErr) {
            console.error('parse package.json error:', parseErr);
            process.exit(1);
        }
    });
} else {
    const serverPath = path.join(__dirname, 'server.js');

    const subprocess = spawn('node', [serverPath], { stdio: 'inherit' });

    subprocess.on('error', (error) => {
        console.error(`Error starting the server: ${error.message}`);
    });

    subprocess.on('exit', (code) => {
        console.log(`Server exited with code: ${code}`);
    });
}
