const express = require("express");
const app = express();
const fs = require("fs");

app.set('view engine', 'ejs')

const VIDEO_TYPES = ['hdd', 'ssd'];

function getFileFromRequest(req)
{
    return `../storage-${req.query.type.toUpperCase()}/${req.query.file}`
}

function videoStreamingMiddleware(req, res, next, checkRang = true) {
    if (!req.query.type || !req.query.file) {
        res.status(400).send("You don't have access to this page (Access Denied - 1)");
        return false;
    }

    if (VIDEO_TYPES.indexOf(req.query.type) === -1) {
        res.status(400).send("You don't have access to this page (Access Denied - 2)");
        return false;
    }

    if (! fs.existsSync(getFileFromRequest(req))) {
        res.status(400).send("The file you requested doesn't exist.");
        return false;
    }

    if (checkRang && !req.headers.range) {
        res.status(400).send("Requires Range header");
        return false;
    }

    next();
}

// Open this for test purpose
app.get("/vs", (req, res, next) => videoStreamingMiddleware(req, res, next, false), function (req, res) {
    const {file, type} = req.query;
    const fileParts = file.split('.');
    const fileExt = fileParts[fileParts.length - 1];

    res.render('index', {
        file,
        type,
        fileExt,
    })
});

app.get("/vs/video-stream", videoStreamingMiddleware, function (req, res) {
    const videoPath = getFileFromRequest(req);
    const range = req.headers.range;
    const videoSize = fs.statSync(videoPath).size;
    const CHUNK_SIZE = 10 ** 6;
    const start = Number(range ? range.replace(/\D/g, "") : "");
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
    const contentLength = end - start + 1;

    const fileParts = req.query.file.split('.');
    const fileExt = fileParts[fileParts.length - 1];

    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/" + fileExt,
    };

    res.writeHead(206, headers);

    const videoStream = fs.createReadStream(videoPath, { start, end });

    videoStream.pipe(res);
});

app.listen(3000, function () {
    console.log("Listening on port 3000!");
});