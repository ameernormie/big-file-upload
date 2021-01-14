import React, { useEffect, useState } from "react";
import { ProgressBar, Jumbotron, Form } from "react-bootstrap";
import axios from "axios";

const chunkSize = 1048576 * 100; //its 3MB, increase the number measure in mb

function Upload() {
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileState, setFileState] = useState({
    fileSize: 0,
    fileId: "",
    totalChunks: 0,
    totalChunksUploaded: 0,
    startChunk: 0,
    endChunk: chunkSize,
    fileToUpload: null,
    uploadedBytes: 0,
  });

  const progressInstance = (
    <ProgressBar animated now={progress} label={`${progress.toFixed(3)}%`} />
  );

  useEffect(() => {
    if (fileState.fileSize > 0) {
      fileUpload(fileState.totalChunksUploaded);
    }
  }, [fileState.fileSize, fileState.totalChunksUploaded]);

  const getFileContext = (e) => {
    setShowProgress(true);
    setProgress(0);
    resetState();
    const file_obj = e.target.files[0];
    const fileId = `${file_obj.size}-${file_obj.lastModified}-${file_obj.name}`;

    axios
      .get("http://localhost:8082/api/upload/status", {
        headers: {
          "x-file-name": fileId,
          "file-size": file_obj.size,
        },
      })
      .then(({ data }) => {
        const uploadedBytes = data.uploaded;
        console.log("uploaded bbytes ", uploadedBytes);
        const bytesRemaining = file_obj.size - uploadedBytes;
        const endingChunk = Math.min(uploadedBytes + chunkSize, file_obj.size);
        setFileState({
          fileSize: file_obj.size,
          fileId,
          totalChunks: Math.ceil(bytesRemaining / chunkSize),
          totalChunksUploaded: 0,
          startChunk: uploadedBytes,
          endChunk:
            endingChunk === fileState.fileSize ? endingChunk + 1 : endingChunk,
          fileToUpload: file_obj,
          uploadedBytes,
        });
      })
      .catch((err) => console.error("Status call failed ", err));
  };

  const fileUpload = (totalChunksUploaded) => {
    const {
      totalChunks,
      fileToUpload,
      startChunk,
      endChunk,
      fileId,
    } = fileState;
    if (totalChunksUploaded <= totalChunks) {
      var chunk = fileToUpload.slice(startChunk, endChunk);
      uploadChunk(chunk);
    } else {
      axios
        .post("http://localhost:8082/api/upload/complete", {
          headers: {
            "x-file-name": fileId,
          },
        })
        .then(resetState);
    }
  };

  const uploadChunk = (chunk) => {
    console.table({ ...fileState, fileToUpload: "" });
    const {
      fileId,
      startChunk,
      endChunk,
      fileSize,
      totalChunksUploaded,
      uploadedBytes,
    } = fileState;
    axios
      .post("http://localhost:8082/api/upload/files", chunk, {
        headers: {
          "x-file-name": fileId,
          "Content-Range": `bytes ${startChunk}-${endChunk}/${fileSize}`,
          "file-size": fileSize,
        },
      })
      .then(({ data }) => {
        const endingChunk = Math.min(endChunk + chunkSize, fileSize);

        setFileState({
          ...fileState,
          totalChunksUploaded: totalChunksUploaded + 1,
          startChunk: endChunk,
          endChunk: endingChunk === fileSize ? endingChunk + 1 : endingChunk,
          uploadedBytes: endingChunk,
        });
        const prog = fileSize ? (uploadedBytes / fileSize) * 100 : 0.1;
        setProgress(prog);
      });
  };

  const resetState = () => {
    setFileState({
      fileSize: 0,
      fileId: "",
      totalChunks: 0,
      totalChunksUploaded: 0,
      startChunk: 0,
      endChunk: chunkSize,
      fileToUpload: null,
      uploadedBytes: 0,
    });
  };

  return (
    <Jumbotron>
      <Form>
        <Form.Group>
          <Form.File
            id="exampleFormControlFile1"
            onChange={getFileContext}
            label="Example file input"
          />
        </Form.Group>
        <Form.Group style={{ display: showProgress ? "block" : "none" }}>
          {progressInstance}
        </Form.Group>
      </Form>
    </Jumbotron>
  );
}

export default Upload;
