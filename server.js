const express = require("express");
const cors = require("cors");
const fs = require("fs");
const app = express();
const port = 3002;

app.use(express.json());
app.use(cors({ origin: "*" }));

const dest = "uploads/";

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/", function (req, res) {
  res.send("Got a POST request");
});

app.get("/upload/status", (req, res) => {
  const uniqueFileId = String(req.headers["x-file-name"]);
  const fileSize = parseInt(String(req.headers["file-size"]), 10);

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }

  if (!fileSize) {
    res.status(400).send("No file-size header found");
    res.end(400);
    return;
  }

  if (!uniqueFileId) {
    res.status(400).send("No x-file-name header found");
    res.end(400);
    return;
  }

  if (uniqueFileId) {
    try {
      const stats = fs.statSync(dest + uniqueFileId);
      if (stats.isFile()) {
        if (fileSize === stats.size) {
          res.send({
            status: "ALREADY_UPLOADED_FILE",
            uploaded: stats.size,
          });
          return;
        }
        if (!uploads[uniqueFileId]) uploads[uniqueFileId] = {};
        uploads[uniqueFileId]["bytesReceived"] = stats.size;
        res.send({ uploaded: stats.size });
      }
    } catch (err) {
      const upload = uploads[uniqueFileId];
      if (upload)
        res.send({ uploaded: upload.bytesReceived, status: "RESUMED_FILE" });
      else res.send({ uploaded: 0, status: "NEW_FILE" });
    }
  }
});

let uploads = {};

app.post("/upload/files", (req, res) => {
  const uniqueFileId = String(req.headers["x-file-name"]);
  const match = req.headers["content-range"].match(/(\d+)-(\d+)\/(\d+)/);
  const start = parseInt(match[1]);
  const fileSize = parseInt(String(req.headers["file-size"]), 10);

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
  }

  if (
    uploads[uniqueFileId] &&
    fileSize === uploads[uniqueFileId].bytesReceived
  ) {
    res.status(200).send("File already uploaded");
    res.end();
    return;
  }

  if (!uniqueFileId) {
    res.status(400).send("No x-file-name header found");
    res.end(400);
    return;
  }

  if (!uploads[uniqueFileId]) uploads[uniqueFileId] = {};
  const upload = uploads[uniqueFileId];

  let fileStream;

  if (!start) {
    upload.bytesReceived = 0;
    fileStream = fs.createWriteStream(`./uploads/${uniqueFileId}`, {
      flags: "w",
    });
  } else {
    if (upload.bytesReceived != start) {
      res.writeHead(400, "Wrong start byte");
      res.end(upload.bytesReceived);
      return;
    }
    // append to existing file
    fileStream = fs.createWriteStream(`./uploads/${uniqueFileId}`, {
      flags: "a",
    });
  }

  req.on("data", function (data) {
    upload.bytesReceived += data.length;
  });

  req.pipe(fileStream);

  // when the request is finished, and all its data is written
  fileStream.on("close", function () {
    res.status(201).send({ status: "UPLOAD_COMPLETE" });
  });

  // in case of I/O error - finish the request
  fileStream.on("error", function (_err) {
    res.status(500).send("File error");
    res.end();
  });
});

app.post("/upload/complete", (req, res) => {
  const uniqueFileId = String(req.headers["x-file-name"]);
  delete uploads[uniqueFileId];

  res.status(201).send({ status: "SUCCESSFULLY_UPLOADED" });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
