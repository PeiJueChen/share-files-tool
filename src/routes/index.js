const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSuccessHtml, getPreviewHtml, getFileListHtml } = require('../utils/htmlTemplates');
const qr = require('qr-image');

var ipUrl;
function setupRoutes(app, uploadsDir, clipboardPath, dirname__, ) {
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
    app.use('/uploads', express.static(uploadsDir));

    app.get('/', (req, res) => {
        res.sendFile(path.join(dirname__, '../public', 'index.html'));
    });

    app.post('/upload', upload.array('files'), (req, res) => {
        res.send(getSuccessHtml());
    });

    app.get('/upload-success', (req, res) => {
        res.send(getSuccessHtml());
    });

    app.get('/download/:filename', (req, res) => {
        const filePath = path.join(uploadsDir, req.params.filename);
        fs.access(filePath, fs.constants.R_OK, (err) => {
            if (err) {
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
            res.redirect('/list-downloads');
        });
    });

    app.get('/preview/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);
        const fileUrl = `${ipUrl}/uploads/${filename}`;

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }

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
        }
    });

    app.get('/list-downloads', (req, res) => {
        fs.readdir(uploadsDir, (err, files) => {
            if (err) {
                return res.status(500).send('Unable to read download folder');
            }
            res.send(getFileListHtml(files, uploadsDir));
        });
    });

    app.post('/shareClipboard', (req, res) => {
        try {
            const content = req.body && req.body.content;
    
            fs.writeFileSync(clipboardPath, content || "", 'utf8');
    
            res.json({ message: 'shared: ' + content, content });
        } catch (error) {
    
            res.status(500).json({ message: 'Failed to read clipboard contents:', error });
        }
    });

    app.get('/getClipboard', (req, res) => {
        const content = fs.readFileSync(clipboardPath, 'utf8');
        res.json({ content: content || "" });
    });

    app.post('/clearClipboard', (req, res) => {
        fs.writeFileSync(clipboardPath, '', 'utf8');
        res.json({ message: 'cleared clipboard' });
    });

    app.get('/qrcode', async (req, res) => {
        try {
            const qrCodeImage = qr.imageSync(ipUrl, { type: 'png' });
            const base64QRImage = Buffer.from(qrCodeImage).toString('base64');
            const dataUrl = `data:image/png;base64,${base64QRImage}`;
            res.send(dataUrl);
        } catch (err) {
            res.status(500).send('An error occurred while generating the QR code');
        }
    });
}

function setIpUrl(url) {
    ipUrl = url;
}

module.exports = { setupRoutes, setIpUrl };
