"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDownloadStream = sendDownloadStream;
function sendDownloadStream(res, file) {
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", file.contentDisposition);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    if (file.contentLength !== undefined) {
        res.setHeader("Content-Length", String(file.contentLength));
    }
    file.body.on("error", () => {
        if (!res.headersSent) {
            res.status(502).end();
            return;
        }
        res.destroy();
    });
    file.body.pipe(res);
}
