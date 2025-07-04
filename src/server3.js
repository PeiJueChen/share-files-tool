const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getRandomPort, getIpAddress } = require('./utils/network');
const { log, redlog } = require('./utils/log');
const { setupRoutes, setIpUrl } = require('./routes');
const { setupSocket } = require('./socket');
const { promisify } = require('util');
const chmod = promisify(fs.chmod);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(cors());

var PORT = 3000;
var _url;
var newwindow = false;

const uploadsDir = path.join(__dirname, 'uploads');
const clipboardPath = path.join(__dirname, 'clipboard.txt');

// 确保 uploads 目录存在
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }
} catch (error) {

    chmod(__dirname, 0o777).then(r => {
        try {
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir);
            }
        } catch (error) {
            console.log(error);
            redlog(`If catch a permission error, try to run with sudo: sudo chmod -R 777 ${__dirname}`);
        }
    }).catch(error => {
        console.log(error);
        redlog(`If catch a permission error, try to run with sudo: sudo chmod -R 777 ${__dirname}`);
    });

}

// 设置路由
setupRoutes(app, uploadsDir, clipboardPath, __dirname);

// 设置 Socket.IO
setupSocket(io, uploadsDir, clipboardPath);


function openBrowser() {
    const { exec } = require('child_process');
    const os = require('os');

    if (os.platform() === 'win32') {
        exec(`start http://localhost:${PORT}`);
    } else if (os.platform() === 'darwin') {
        if (newwindow) {
            log(`\nServer running2 at: http://localhost:${PORT}`);
            exec(`open -a "Google Chrome" --args --new-tab http://localhost:${PORT}`);
        } else {
            exec(`open http://localhost:${PORT}`);
        }
    } else {
        redlog('The function of automatically opening the browser is not implemented, for non-Windows and macOS systems');
    }
}


// 启动服务器
(async () => {
    if (process.argv.includes('once')) {
        newwindow = true;
        PORT = 3009;
    }else {
        PORT = await getRandomPort();
    }
    const ipAddress = await getIpAddress();
    _url = `http://${ipAddress}:${PORT}`;
    setIpUrl(_url);

    server.listen(PORT, () => {
        log(`\nServer running at: ${_url}`);
        redlog(`\nIf catch a permission error, try to run with sudo: sudo chmod -R 777 ${__dirname} \n`);
        openBrowser();
    });
})();


