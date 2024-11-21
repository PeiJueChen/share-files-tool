const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const QRCode = require('qrcode');
const { exec } = require('child_process');
const net = require('net');
const app = express();


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

// 1024 - 65535
const getRandomPort = async () => {
    let port;
    let isAvailable = false;

    while (!isAvailable) {
        port = Math.floor(Math.random() * (65535 - 1024 + 1)) + 1024;
        isAvailable = await isPortAvailable(port);
    }
    return port;
};


const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, ext);

        let newFileName = originalName;
        let counter = 1;
        while (fs.existsSync(path.join(uploadsDir, newFileName))) {
            const creationDate = new Date();
            const formattedDate = `${creationDate.getMonth() + 1}${creationDate.getDate()}${creationDate.getFullYear()}${creationDate.getHours().toString().padStart(2, '0')}${creationDate.getMinutes().toString().padStart(2, '0')}${creationDate.getSeconds().toString().padStart(2, '0')}`;
            newFileName = `${nameWithoutExt}_${formattedDate}${ext}`;
            counter++;
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

app.get('/list-downloads', (req, res) => {
    fs.readdir(uploadsDir, (err, files) => {

        if (err) {
            console.log("err:", err);
            return res.status(500).send('Unable to read download folder');
        }
        let fileListHtml = `
        <html>
        <head>
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
            </style>
        </head>
        <body>
            <h1>List of downloadable files</h1>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">File Name</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Create Date</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Size (MB)</th>
                        <th style="border: 1px solid #ddd; padding: 16px; height: 80px;">Action</th>
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
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word; word-break: break-all;">${formattedDate}</td>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word; word-break: break-all;">${sizeInMB}</td>
                    <td style="border: 1px solid #ddd; padding: 30px 10px;word-wrap: break-word; word-break: break-all;">
                        <a href="/download/${file}" download>Download</a> / 
                        <a href="/delete/${file}" onclick="return confirm('Surely want to delete?')">Delete</a>
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

const getIpAddress = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        for (const iface of networkInterfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
};

let PORT;

app.get('/qrcode', async (req, res) => {
    const ipAddress = getIpAddress();
    const url = `http://${ipAddress}:${PORT}`;
    try {
        const qrCodeDataURL = await QRCode.toDataURL(url);
        res.send(qrCodeDataURL); // 发送二维码的 Data URL
    } catch (err) {
        res.status(500).send('An error occurred while generating the QR code');
    }
});

(async () => {
    PORT = await getRandomPort();
    const ipAddress = getIpAddress();
    const url = `http://${ipAddress}:${PORT}`;
    app.listen(PORT, async () => {

        console.log(`run at: http://localhost:${PORT} or ${url}`);


        console.log(`If catch a permission error, try to run with sudo: sudo chmod -R 777 ${uploadsDir}`);

        if (os.platform() === 'win32') {
            // Windows
            exec(`start http://localhost:${PORT}`);
        } else if (os.platform() === 'darwin') {
            // macOS
            exec(`open http://localhost:${PORT}`);
        } else {
            console.log('The function of automatically opening the browser is not implemented, for non-Windows and macOS systems');
        }
    });
})();

