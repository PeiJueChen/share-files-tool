const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
// const QRCode = require('qrcode');
const qr = require('qr-image');
const { exec } = require('child_process');
const net = require('net');
const app = express();
const child_process = require("child_process");
const http = require('http');
const socketIo = require('socket.io');

const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

let PORT = 3000;
let _url;

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

newwindow = false;

// 1024 - 65535
const getRandomPort = async () => {
    // console.log("process.argv:",process.argv);

    if (process.argv.includes('once')) {
        newwindow = true;
        return 3000;
    }

    let port;
    let isAvailable = false;

    while (!isAvailable) {
        port = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        isAvailable = await isPortAvailable(port);
    }
    return port;
};


const uploadsDir = path.join(__dirname, 'uploads');
const clipboardPath = path.join(__dirname, 'clipboard.txt');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }
} catch (error) {
    console.log(error);
    redlog(`If catch a permission error, try to run with sudo: sudo chmod -R 777 ${__dirname}`);
}

// 监听 uploads 目录
fs.watch(uploadsDir, (eventType, filename) => {
    // if (filename) {
    //     console.log(`Event type: ${eventType}, filename: ${filename}`);
    //     // 当 uploads 目录内有文件变化时，推送更新到所有连接的客户端
    //     io.emit('uploadsUpdated', { eventType, filename });
    // }
    io.emit('uploadsUpdated', true);
});


function readClipboardContent() {
    return fs.readFileSync(clipboardPath, 'utf8');
}

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


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, ext);

        let newFileName = originalName;
        if (fs.existsSync(path.join(uploadsDir, newFileName))) {
            const creationDate = new Date();
            const formattedDate = `${creationDate.getMonth() + 1}${creationDate.getDate()}${creationDate.getFullYear()}${creationDate.getHours().toString().padStart(2, '0')}${creationDate.getMinutes().toString().padStart(2, '0')}${creationDate.getSeconds().toString().padStart(2, '0')}`;
            newFileName = `${nameWithoutExt}_${formattedDate}${ext}`;
        }

        cb(null, newFileName);
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('src/uploads'));

function getSuccessHtml() {
    const responseHtml = `
        <html>
        <head>
            <meta charset="UTF-8">
            <title>successfully</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; text-align: center;}
                h1 { color: #333; font-size: 2.5rem; }
                    
                button { 
                margin-top: 3rem;
                padding: 1.4rem;
                width: 23rem;
                background-color: #5cb85c; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 2.5rem; }
                button:hover { background-color: #4cae4c; }
                p { text-align: center; font-size: 2.5rem; margin: 4rem 0;}
                .container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
            </style>
            <script>
                window.addEventListener('load', () => {
                        setTimeout(() => {
                            window.location.href='/list-downloads'
                        }, 0);
                    });
            </script>
        </head>
        <body>
            <h1>The file uploads successfully！</h1>
            <div class="container">
            <button style="margin-top: 20px;" onclick="window.location.href='/list-downloads'">View lists</button>
            <button style="margin-top: 20px;" onclick="window.location.href='/'">Back to Home</button>
            </div>
        </body>
        </html>
    `;
    return responseHtml;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.post('/upload', upload.array('files'), (req, res) => {

    res.send(getSuccessHtml());
});

app.get('/upload-success', (req, res) => {
    res.send(getSuccessHtml());
});

// app.post('/upload', upload.single('file'), (req, res) => {
//     const responseHtml = `
//         <html>
//         <head>
//             <title>successfully</title>
//             <style>
//                 body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; text-align: center;}
//                 h1 { color: #333; font-size: 2.5rem; }
//                 button { background-color: #5cb85c; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-size: 2.5rem; }
//                 button:hover { background-color: #4cae4c; }
//                 p { text-align: center; font-size: 2.5rem; margin: 4rem 0;}
//             </style>
//         </head>
//         <body>
//             <h1>The file uploads successfully.！</h1>
//             <p>Can be downloaded at: <a href="/uploads/${req.file.filename}" download>Download</a></p>
//             <button style="margin-top: 20px;" onclick="window.location.href='/'">Back to Home</button>
//         </body>
//         </html>
//     `;
//     res.send(responseHtml);
// });


app.get('/download/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
            console.error('File access error:', err);
            return res.status(404).send('File not found or cannot be accessed.');
        }
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Could not download file.');
            }
        });
    });

});

app.get('/delete/:filename', (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).send(`Can't delete the file. ${err}`);
        }
        res.redirect('/list-downloads'); // 删除后重定向回文件列表
    });
});

// 抽取预览页面的 HTML 模板
function getPreviewHtml(fileType, fileUrl, filename) {
    const isImage = fileType === 'image';
    const isVideo = fileType === 'video';
    const isPdf = fileType === 'pdf';
    const isTxt = fileType === 'txt';
    let content;
    if (isImage) {
        content = `<img id="media" src="${fileUrl}" alt="${filename}">`;
    } else if (isVideo) {
        content = `
            <video id="media" controls>
                <source src="${fileUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else if (isPdf) {
        // content = `
        //     <embed id="media" src="${fileUrl}" type="application/pdf" width="100%" height="100%">
        // `;
        content = `
        <div id="media">
        <div id="pdf-container" style="width: 100%; height: 80vh; overflow: auto; text-align: center;">
            <canvas id="pdf-canvas"></canvas>
        </div>
        </div>
        <div style="margin-top: 10px;">
            <button id="prev-page" onclick="prevPage()">Previous</button>
            <span id="page-num">Page: 1</span> / <span id="page-count">Loading...</span>
            <button id="next-page" onclick="nextPage()">Next</button>
        </div>
        <script>
            let pdfDoc = null;
            let pageNum = 1;
            let pageRendering = false;
            let pageNumPending = null;
            const scale = 1.5;

            const url = '${fileUrl}';
            const canvas = document.getElementById('pdf-canvas');
            const ctx = canvas.getContext('2d');

            function renderPage(num) {
                pageRendering = true;
                pdfDoc.getPage(num).then(page => {
                    const viewport = page.getViewport({ scale });
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: ctx,
                        viewport: viewport
                    };
                    page.render(renderContext).promise.then(() => {
                        pageRendering = false;
                        if (pageNumPending !== null) {
                            renderPage(pageNumPending);
                            pageNumPending = null;
                        }
                    });
                });

                document.getElementById('page-num').textContent = 'Page: ' + num;
            }

            function queueRenderPage(num) {
                if (pageRendering) {
                    pageNumPending = num;
                } else {
                    renderPage(num);
                }
            }

            function prevPage() {
                if (pageNum <= 1) return;
                pageNum--;
                queueRenderPage(pageNum);
            }

            function nextPage() {
                if (pageNum >= pdfDoc.numPages) return;
                pageNum++;
                queueRenderPage(pageNum);
            }

            pdfjsLib.getDocument(url).promise.then(pdf => {
                pdfDoc = pdf;
                document.getElementById('page-count').textContent = pdfDoc.numPages;
                renderPage(pageNum);
            }).catch(error => {
                console.error('Failed to load PDF:', error);
                document.getElementById('pdf-container').innerHTML = '<p>Failed to load PDF.</p>';
            });
        </script>
    `;
    } else if (isTxt) {
        content = `
            <iframe id="media" src="${fileUrl}" width="100%" height="100%" style="border: none;"></iframe>
        `;
    } else {
        content = `<p style="font-size: 2.5rem;">The file type does not support preview.</p>`;
    }

    return `
           <!DOCTYPE html>
           <html>
           <head>
               <title>Preview</title>
               <style>
                   body {
                       font-family: Arial, sans-serif;
                       text-align: center;
                       background-color: #f4f4f4;
                       padding: 20px;
                       margin: 0;
                       height: 100vh;
                       display: flex;
                       flex-direction: column;
                       justify-content: center;
                       align-items: center;
                   }
                   #media {
                       max-width: 100%;
                       max-height: 100%;
                       object-fit: contain;
                   }
                   button {
                       background-color: #5cb85c;
                       color: white;
                       border: none;
                       padding: 10px 20px;
                       border-radius: 5px;
                       cursor: pointer;
                       font-size: 2rem;
                       margin-top: 20px;
                   }
                   button:hover {
                       background-color: #4cae4c;
                   }
                    .btn-group-div button:last-child {
                     margin-left: 1rem;
                    }
               </style>
               <script src="/js/pdf.min.js"></script>
               <script src="/js/pdf.worker.min.js"></script>
           </head>
           <body>
               <div id="media-container">
                   ${content}
               </div>
               <div class="btn-group-div">
               <button onclick="window.history.back()">Back</button>
               <button onclick="window.location.href='/download/${filename}'">Download</button>
               </div>
               
   
               <script>
                   function adjustMediaSize() {
                       const media = document.getElementById('media');
                       const container = document.getElementById('media-container');
                       const screenWidth = window.innerWidth;
                       const screenHeight = window.innerHeight;
   
                       if (screenWidth > screenHeight) {
                        media.style.height = '85vh';
                           media.style.width = 'auto';
                       } else {
                           media.style.width = '100vw';
                           media.style.height = 'auto';
                       }
                   }
   
                   // 页面加载时调整媒体尺寸
                   window.addEventListener('load', adjustMediaSize);
                   // 窗口大小变化时调整媒体尺寸
                   window.addEventListener('resize', adjustMediaSize);
               </script>
           </body>
           </html>
       `;
}


// 添加预览文件的路由
app.get('/preview/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    // const fileUrl = `/uploads/${filename}`;
    const fileUrl = `${_url}/uploads/${filename}`;

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    
    // const fileUrl = `/uploads/${filename}`;
    // 检查文件类型
    if (filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.jpeg') || filename.endsWith('.gif')) {
        res.send(getPreviewHtml('image', fileUrl, filename));
    } else if (filename.endsWith('.mp4') || filename.endsWith('.webm') || filename.endsWith('.ogg')) {
        res.send(getPreviewHtml('video', fileUrl, filename));
    } else if (filename.endsWith('.pdf')) {
        res.send(getPreviewHtml('pdf', fileUrl, filename));
    } else if (filename.endsWith('.txt')) {
        res.send(getPreviewHtml('txt', fileUrl, filename));
    } else {
        res.send(getPreviewHtml('none', fileUrl, filename));
        // res.status(404).send('The file type does not support preview.');
    }
});

app.get('/list-downloads', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {

        if (err) {
            console.log("err:", err);
            return res.status(500).send('Unable to read download folder');
        }

        var isEmpty = files.length === 0;
        let fileListHtml = `
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
            <title>downloadable files</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; text-align: center;}
                h1 { color: #333; margin: 2rem 0; font-size: 2.5rem;}
                button { background-color: #5cb85c; color: white; border: none; padding: 2rem; border-radius: 5px; cursor: pointer; font-size: 2.5rem; }
                button:hover { background-color: #4cae4c; }
                ul { list-style-type: none; padding: 0; }
                li { margin: 4rem 0; font-size: 3rem; }
                a { text-decoration: none; color: #007bff; }
                a:hover { text-decoration: underline; }
                table {
                    font-size: 2rem;
                }
                    td {
                        text-align: center;
                    }
                        tr {
                        font-size: 2.5rem;
                        }
                        .fa-sync-alt {
                            font-size: 50px !important;
                            margin-right: 1.3rem;
                        }
                        .preview-btn {
                            padding: 1rem 1.3rem;
                        }
                        .btn-group {
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                        }
                        .btn-group a {
                            background-color: #5cb85c;
                            color: white;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 2.5rem;
                            padding: 1rem 1.3rem;
                            white-space: pre-wrap;
                        }
                            .btn-group a:last-child {
                                margin-top: 1rem;
                            }

                        .empty-msg {
                        font-size: 2.5rem;
                        text-align: center;
                        margin-top: 5rem;
                        }
            </style>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            <div>
                <h1>List of downloadable files <i class="fas fa-sync-alt" id="refreshIcon" style="cursor:pointer; float:right; font-size:24px;" title="Refresh"></i></h1>
            </div>
            
            <script>
        window.addEventListener('load', function () {
            document.getElementById('refreshIcon').addEventListener('click', function() { location.reload(); });

            if (io) {
                const socket = io();
                socket.on('uploadsUpdated', (data) => {
                    location.reload();
                });
                socket.on('refreshPage', data => {
                    location.reload();
                })
            }

            if (${isEmpty}) {
                setTimeout(() => {
                    window.location.href='/'
                }, 800);
            }
        });
        function previewFile(filename) {
        // window.open("/preview/"+filename, '_blank', 'width=800,height=600');
        window.location.href = "/preview/"+filename;
        }
    </script>
            <p class="empty-msg" style="display: ${isEmpty ? 'block' : 'none'};">Cann't Found Any File</p>
            <table style="width: 100%; border-collapse: collapse;" style="display: ${isEmpty ? 'none' : 'table-header-group'};">
                <thead style="display: ${isEmpty ? 'none' : 'table-header-group'};">
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">File Name</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Create Date</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Size (MB)</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Action</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Preview</th>
                    </tr>
                </thead>
                <tbody>`;
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            const creationDate = new Date(stats.birthtime);
            const formattedDate = `${creationDate.getMonth() + 1}-${creationDate.getDate()}-${creationDate.getFullYear()} ${creationDate.getHours().toString().padStart(2, '0')}:${creationDate.getMinutes().toString().padStart(2, '0')}:${creationDate.getSeconds().toString().padStart(2, '0')}`;
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

            fileListHtml += `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word; word-break: break-all;">${file}</td>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word;">${formattedDate}</td>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word; word-break: break-all;">${sizeInMB}</td>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word;">
                        <div class="btn-group">
                        <a href="/download/${file}" download>Download</a>
                        <a href="/delete/${file}" onclick="return confirm('Surely want to delete?')">   Delete   </a>
                        </div>
                    </td>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word;">
                        <button class="preview-btn" onclick="previewFile('${file}')">Preview</button> 
                    </td>
                </tr>`;

        });
        fileListHtml += `
            </tbody>
            </table>
            <button style="margin-top: 3rem;" onclick="window.location.href='/'">Back to Home</button>
        </body>
        </html>`;
        res.send(fileListHtml);
    });
});



// 路由：共享粘贴板
app.post('/shareClipboard', async (req, res) => {
    try {
        const content = req.body?.content;

        fs.writeFileSync(clipboardPath, content || "", 'utf8');

        res.json({ message: 'shared: ' + content, content });
    } catch (error) {

        res.status(500).json({ message: 'Failed to read clipboard contents:', error });
    }
});

// 路由：获取粘贴板
app.get('/getClipboard', (req, res) => {
    const content = fs.readFileSync(clipboardPath, 'utf8');

    res.json({ content: content || "" });
});
app.post('/clearClipboard', (req, res) => {
    fs.writeFileSync(clipboardPath, '', 'utf8'); // 清空文件内容
    res.json({ message: 'cleared clipboard' });
});

const log = (msg) => {
    console.log(`\x1b[32m ${msg} \x1b[0m`);
};

const redlog = (msg) => {
    console.log(`\x1b[31m ${msg} \x1b[0m`);
}

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        child_process.exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(stdout + stderr);
            }
            else {
                resolve(stdout);
            }
        });
    });
}

let currentIp;
const getIpAddress = async () => {

    if (currentIp) return currentIp;
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168')) {
                currentIp = iface.address;
                return currentIp;
            }
        }
    }

    if (os.platform() === 'darwin') {
        try {
            const ip = await runCommand('ipconfig getifaddr en0');
            currentIp = ip.trim();
            return currentIp;
        } catch (error) {

        }
    }
    currentIp = '127.0.0.1';
    return currentIp;
};


app.get('/qrcode', async (req, res) => {
    const ipAddress = await getIpAddress();
    const url = `http://${ipAddress}:${PORT}`;
    try {
        // const qrCodeDataURL = await QRCode.toDataURL(url);
        // res.send(qrCodeDataURL); // 发送二维码的 Data URL
        const qrCodeImage = qr.imageSync(url, { type: 'png' });
        const base64QRImage = Buffer.from(qrCodeImage).toString('base64');
        const dataUrl = `data:image/png;base64,${base64QRImage}`;
        res.send(dataUrl);
    } catch (err) {
        res.status(500).send('An error occurred while generating the QR code');
    }
});

(async () => {
    PORT = await getRandomPort();
    const ipAddress = await getIpAddress();
    const url = `http://${ipAddress}:${PORT}`;
    _url = url;
    server.listen(PORT, async () => {

        log(`\nrun at: ${url}`);

        redlog(`\nIf catch a permission error, try to run with sudo: sudo chmod -R 777 ${__dirname} \n`);

        if (os.platform() === 'win32') {
            // Windows
            exec(`start http://localhost:${PORT}`);
        } else if (os.platform() === 'darwin') {
            // macOS 
            if (newwindow) {
                exec(`open -a "Google Chrome" --args --new-tab http://localhost:${PORT}`);
            } else {
                exec(`open http://localhost:${PORT}`);
            }
        } else {
            redlog('The function of automatically opening the browser is not implemented, for non-Windows and macOS systems');
        }
    });
})();

