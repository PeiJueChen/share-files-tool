const net = require('net');
const os = require('os');
const { exec } = require('child_process');

const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.unref();
        server.on('error', () => resolve(false));
        server.listen(port, () => {
            server.close(() => resolve(true));
        });
    });
};

const getRandomPort = async () => {
    let port = 3333;
    let isAvailable = false;

    if (await isPortAvailable(port)) return port;
    
    while (!isAvailable) {
        port = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        isAvailable = await isPortAvailable(port);
    }
    return port;
};

const getIpAddress = async () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168')) {
                return iface.address;
            }
        }
    }

    if (os.platform() === 'darwin') {
        try {
            const ip = await runCommand('ipconfig getifaddr en0');
            return ip.trim();
        } catch (error) {
            console.error(error);
        }
    }

    return '127.0.0.1';
};

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stdout + stderr);
            } else {
                resolve(stdout);
            }
        });
    });
};

module.exports = { getRandomPort, getIpAddress };
