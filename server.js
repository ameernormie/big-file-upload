const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/", function (req, res) {
  res.send("Got a POST request");
});

app.post("/api/chunkedUpload", function (req, res) {
  if (req.headers["content-range"]) {
    /* the format of content range header is 'Content-Range: start-end/total' */
    var match = req.headers["content-range"].match(/(\d+)-(\d+)\/(\d+)/);
    if (!match || !match[1] || !match[2] || !match[3]) {
      /* malformed content-range header */
      res.status(400).send("Bad Request");
      return;
    }

    var start = parseInt(match[1]);
    var end = parseInt(match[2]);
    var total = parseInt(match[3]);
    var filename = req.headers["x-file-name"];

    console.log("start end total ", start, end, total);

    /*
     * The filename and the file size is used for the hash since filenames are not always
     * unique for our customers
     */

    var hash = crypto
      .createHash("sha1")
      .update(filename + total)
      .digest("hex");
    console.log("hash ", hash);
    var target_file = "/uploads/" + hash + path.extname(filename);

    /* The individual chunks are concatenated using a stream */
    var stream = streams[hash];
    if (!stream) {
      stream = fs.createWriteStream(target_file, { flags: "a+" });
      streams[hash] = stream;
    }

    var size = 0;
    if (fs.existsSync(target_file)) {
      size = fs.statSync(target_file).size;
    }

    /*
     * basic sanity checks for content range
     */
    if (end + 1 == size) {
      /* duplicate chunk */
      res.status(201).send("Created");
      return;
    }

    if (start != size) {
      /* missing chunk */
      res.status(400).send("Bad Request");
      return;
    }

    /* if everything looks good then read this chunk and append it to the target */
    fs.readFile(req.headers["x-file-name"], function (error, data) {
      if (error) {
        res.status(500).send("Internal Server Error");
        return;
      }

      stream.write(data);
      fs.unlink(req.headers["x-file-name"]);

      if (start + data.length >= total) {
        /* all chunks have been received */
        stream.on("finish", function () {
          process_upload(target_file);
        });

        stream.end();
      } else {
        /* this chunk has been processed successfully */
        res.status(201).send("Created");
      }
    });
  } else {
    /* this is a normal upload session */
    // process_upload(req.headers["x-file"]);
  }
});

app.post("/chunkedUpload", function (request, response) {
  // Check if we uploading using a x-file-header
  // This means that we have offloaded the file upload to the
  // web server (NGINX) and we are sending up the path to the actual
  // file in the header. The file chunk will not be in the body
  // of the request

  console.log("request.headers ", request.headers);
  console.log(
    "request.headers['content-range'] ",
    request.headers["content-range"]
  );

  if (request.headers["x-file-name"]) {
    // Temporary location of our uploaded file
    // Nginx uses a private file path in /tmp on Centos
    // we need to get the name of that path
    var temp_dir = fs.readdirSync("/tmp");
    var nginx_temp_dir = [];

    console.log("temp_dir ", temp_dir);

    for (var i = 0; i < temp_dir.length; i++) {
      if (temp_dir[i].match("nginx.service")) {
        nginx_temp_dir.push(temp_dir[i]);
      }
    }

    console.log("nginx_temp_dir ", nginx_temp_dir);

    var temp_path = "/tmp/nginx" + request.headers["x-file-name"];
    // const { filename, mimetype } = request.file;
    // const ext = mimetype.split("/").pop();
    // const newFilename = `${filename}.${ext}`;
    const destPath = `uploads/`;

    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath);
    }

    console.log("[UPLOAD] temp_path ", temp_path);
    console.log("[UPLOAD] response.locals ", response.locals);
    // console.log("[UPLOAD] filename ", filename);
    // console.log("[UPLOAD] mimetype ", mimetype);
    // console.log("[UPLOAD] ext ", ext);

    fs.rename(temp_path, destPath, function (err) {
      if (err) {
        response.status(500).send(err);
        return;
      }

      // Send back a sucessful response with the file name
      response.status(200).send("success path");
      // response.status(200).send(response.locals.localfilepath);
      response.end();
    });
  }
});

app.post("/api/upload", function (request, response) {
  // Check if we uploading using a x-file-header
  // This means that we have offloaded the file upload to the
  // web server (NGINX) and we are sending up the path to the actual
  // file in the header. The file chunk will not be in the body
  // of the request

  console.log("[/api/upload]", request.headers);

  if (request.headers["x-file-name"]) {
    // Temporary location of our uploaded file
    // Nginx uses a private file path in /tmp on Centos
    // we need to get the name of that path
    var temp_dir = fs.readdirSync("/tmp");
    var nginx_temp_dir = [];

    for (var i = 0; i < temp_dir.length; i++) {
      if (temp_dir[i].match("nginx.service")) {
        nginx_temp_dir.push(temp_dir[i]);
      }
    }

    var temp_path = request.headers["x-file-name"];
    // "/tmp/" + nginx_temp_dir[0] + request.headers["x-file-name"];
    const destPath = `uploads/`;

    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath);
    }

    const tempFileName = Math.floor(Math.random() * 100000);

    fs.rename(temp_path, `${destPath}${tempFileName}`, function (err) {
      if (err) {
        response.status(500).send(err);
        return;
      }

      response.status(200).send(`${destPath}${tempFileName}`);
      response.end();
    });
  }
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
        if (fileSize == stats.size) {
          res.send({
            status: "file is already uploaded",
            uploaded: stats.size,
          });
          return;
        }
        if (!uploads[uniqueFileId]) uploads[uniqueFileId] = {};
        uploads[uniqueFileId]["bytesReceived"] = stats.size;
        if (upload) res.send({ uploaded: stats.size });
      }
    } catch (err) {
      const upload = uploads[uniqueFileId];
      if (upload) res.send({ uploaded: upload.bytesReceived });
      else res.send({ uploaded: 0 });
    }
  }
});

let uploads = {};

app.post("/upload/files", (req, res) => {
  let uniqueFileId = req.headers["x-file-name"];
  const match = req.headers["content-range"].match(/(\d+)-(\d+)\/(\d+)/);
  const start = parseInt(match[1]);
  let fileSize = parseInt(req.headers["file-size"], 10);
  // console.log("file Size", fileSize, uniqueFileId, start);
  if (
    uploads[uniqueFileId] &&
    fileSize == uploads[uniqueFileId].bytesReceived
  ) {
    res.end();
    return;
  }

  console.log("uploads[uniqueFileId] ", uploads[uniqueFileId]);
  console.log("start ", start);

  if (!uniqueFileId) {
    res.writeHead(400, "No file id");
    res.end(400);
  }
  console.log(uploads[uniqueFileId]);
  if (!uploads[uniqueFileId]) uploads[uniqueFileId] = {};

  let upload = uploads[uniqueFileId];

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
    //console.log("bytes received", upload.bytesReceived);
    upload.bytesReceived += data.length;
  });

  req.pipe(fileStream);

  // when the request is finished, and all its data is written
  fileStream.on("close", function () {
    console.log(upload.bytesReceived, fileSize);

    res.send({ status: "uploaded" });
    // if (upload.bytesReceived == fileSize) {
    //   console.log("Upload finished");
    //   delete uploads[uniqueFileId];

    //   // can do something else with the uploaded file here
    //   res.send({ status: "uploaded" });
    //   res.end();
    // } else {
    //   // connection lost, we leave the unfinished file around
    //   console.log("File unfinished, stopped at " + upload.bytesReceived);
    //   res.writeHead(500, "Server Error");
    //   res.end();
    // }
  });

  // in case of I/O error - finish the request
  fileStream.on("error", function (err) {
    console.log("fileStream error", err);
    res.writeHead(500, "File error");
    res.end();
  });
});

app.post("/upload/complete", (req, res) => {
  const uniqueFileId = req.headers["x-file-name"];
  delete uploads[uniqueFileId];

  res.status(201).send("File successfully created");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// const streams = {};
// app.post("/upload/filechunk", (req, res, next) => {
//   const fileId = req.headers["x-file-name"];

//   if (req.headers["content-range"]) {
//     const match = req.headers["content-range"].match(/(\d+)-(\d+)\/(\d+)/);
//     if (!match || !match[1] || !match[2] || !match[3]) {
//       /* malformed content-range header */
//       res.status(400).send("Bad Request");
//       return;
//     }

//     const start = parseInt(match[1]);
//     const end = parseInt(match[2]);
//     const total = parseInt(match[3]);

//     console.log("start, end , total ", start, end, total);

//     const target_file = "./uploads/" + fileId;

//     /* The individual chunks are concatenated using a stream */
//     let stream = streams[fileId];
//     console.log("stream before ", Boolean(stream));
//     if (!stream) {
//       stream = fs.createWriteStream(target_file, { flags: "a+" });
//       streams[fileId] = stream;
//     }
//     console.log("stream after ", Boolean(stream));

//     let size = 0;
//     if (fs.existsSync(target_file)) {
//       size = fs.statSync(target_file).size;
//     }

//     console.log("size ", size, start);

//     if (end + 1 == size) {
//       /* duplicate chunk */
//       res.status(201).send("Created");
//       return;
//     }

//     // if (start != size) {
//     //   /* missing chunk */
//     //   res.status(400).send("Bad Request");
//     //   return;
//     // }

//     console.log("target_file ", target_file);

//     /* if everything looks good then read this chunk and append it to the target */
//     fs.readFile(target_file, function (error, data) {
//       console.log("error ", error);
//       console.log("data ", data);
//       if (error) {
//         res.status(500).send("Internal Server Error");
//         return;
//       }
//       stream.write(data);
//       // fs.unlink(target_file, (err) => {
//       //   console.log("err ", err);
//       // });
//       if (start + data.length >= total) {
//         /* all chunks have been received */
//         stream.on("finish", function () {
//           console.log("all chunck have been received");
//           // process_upload(target_file);
//         });
//         stream.end();
//       } else {
//         /* this chunk has been processed successfully */
//         res.status(201).send("Created");
//       }
//     });
//   } else {
//     // no content range header found
//   }
// });

// app.post("/upload/file", (req, res, next) => {
//   let fileId = req.headers["x-file-id"];
//   let startByte = parseInt(req.headers["x-start-byte"], 10);
//   let name = req.headers["name"];
//   let fileSize = parseInt(req.headers["size"], 10);
//   console.log("file Size", fileSize, fileId, startByte);
//   if (uploads[fileId] && fileSize == uploads[fileId].bytesReceived) {
//     res.end();
//     return;
//   }

//   console.log(fileSize);

//   if (!fileId) {
//     res.writeHead(400, "No file id");
//     res.end(400);
//   }
//   console.log(uploads[fileId]);
//   if (!uploads[fileId]) uploads[fileId] = {};

//   let upload = uploads[fileId];

//   let fileStream;

//   if (!startByte) {
//     upload.bytesReceived = 0;
//     let name = req.headers["name"];
//     fileStream = fs.createWriteStream(`./uploads/${name}`, {
//       flags: "w",
//     });
//   } else {
//     if (upload.bytesReceived != startByte) {
//       res.writeHead(400, "Wrong start byte");
//       res.end(upload.bytesReceived);
//       return;
//     }
//     // append to existing file
//     fileStream = fs.createWriteStream(`./uploads/${name}`, {
//       flags: "a",
//     });
//   }

//   req.on("data", function (data) {
//     //console.log("bytes received", upload.bytesReceived);
//     upload.bytesReceived += data.length;
//   });

//   req.pipe(fileStream);

//   // when the request is finished, and all its data is written
//   fileStream.on("close", function () {
//     console.log(upload.bytesReceived, fileSize);
//     if (upload.bytesReceived == fileSize) {
//       console.log("Upload finished");
//       delete uploads[fileId];

//       // can do something else with the uploaded file here
//       res.send({ status: "uploaded" });
//       res.end();
//     } else {
//       // connection lost, we leave the unfinished file around
//       console.log("File unfinished, stopped at " + upload.bytesReceived);
//       res.writeHead(500, "Server Error");
//       res.end();
//     }
//   });

//   // in case of I/O error - finish the request
//   fileStream.on("error", function (err) {
//     console.log("fileStream error", err);
//     res.writeHead(500, "File error");
//     res.end();
//   });
// });
