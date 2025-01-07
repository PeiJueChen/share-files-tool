const path = require('path');
const fs = require('fs');

function getSuccessHtml() {
    return `
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
}

function getPreviewHtml(fileType, fileUrl, filename) {
    let content;
    if (fileType === 'image') {
        content = `<img id="media" src="${fileUrl}" alt="${filename}">`;
    } else if (fileType === 'video') {
        content = `
            <video id="media" controls>
                <source src="${fileUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else if (fileType === 'pdf') {
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
    } else if (fileType === 'txt') {
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

                window.addEventListener('load', adjustMediaSize);
                window.addEventListener('resize', adjustMediaSize);
            </script>
        </body>
        </html>
    `;
}

function getFileListHtml(files, uploadsDir) {
    const isEmpty = files.length === 0;
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
    return fileListHtml;
}

module.exports = { getSuccessHtml, getPreviewHtml, getFileListHtml };

