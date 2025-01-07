function setupSocket(io, uploadsDir, clipboardPath) {
    const fs = require('fs');

    function readClipboardContent() {
        return fs.readFileSync(clipboardPath, 'utf8');
    }

    // 监听 uploads 目录
    fs.watch(uploadsDir, (eventType, filename) => {
        io.emit('uploadsUpdated', true);
    });

    // 监听 clipboard 文件
    fs.watchFile(clipboardPath, (curr, prev) => {
        const content = readClipboardContent();
        io.emit('clipboardUpdated', content);
    });

    io.on('connection', (socket) => {
        socket.emit('clipboardUpdated', readClipboardContent());
    });

    setTimeout(() => {
        io.emit('refreshPage', true);
    }, 1500);
}

module.exports = { setupSocket };
