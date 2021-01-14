import React, { useEffect, useState } from "react";
import { ProgressBar, Jumbotron, Button, Form } from "react-bootstrap";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const chunkSize = 1048576 * 1; //its 3MB, increase the number measure in mb

function App() {
  const [showProgress, setShowProgress] = useState(false);
  const [counter, setCounter] = useState(1);
  const [fileToBeUpload, setFileToBeUpload] = useState({});
  const [beginingOfTheChunk, setBeginingOfTheChunk] = useState(0);
  const [endOfTheChunk, setEndOfTheChunk] = useState(chunkSize);
  const [progress, setProgress] = useState(0);
  const [fileGuid, setFileGuid] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);

  const progressInstance = (
    <ProgressBar animated now={progress} label={`${progress.toFixed(3)}%`} />
  );

  useEffect(() => {
    if (fileSize > 0) {
      fileUpload(counter);
    }
  }, [fileToBeUpload, progress]);

  const getFileContext = (e) => {
    // const file_obj = e.target.files[0];
    // console.log("fileobj ", file_obj);

    // let fileId = `${file_obj.name}-${file_obj.lastModified}`;
    // setFileGuid(fileId);
    // let headers = {
    //   size: file_obj.size.toString(),
    //   "x-file-id": fileId,
    //   name: file_obj.name,
    // };
    // const totalChunks =
    //   file_obj.size <= chunkSize
    //     ? 1
    //     : file_obj.size % chunkSize === 0
    //     ? file_obj.size / chunkSize
    //     : Math.floor(file_obj.size / chunkSize) + 1;
    // setChunkCount(totalChunks);
    // setFileToBeUpload(file_obj);
    // console.log("_totalChunks ", totalChunks);
    // // Check if the file has already been uploadeed
    // axios
    //   .get("http://localhost:3002/upload/status", {
    //     headers,
    //   })
    //   .then((res) => {
    //     console.log("result ", res);
    //     const uploadedBytes = res.data.uploaded;
    //     // If there are uploadedBytes then it means that file can be resumed
    //     // if (uploadedBytes) {
    //     headers = {
    //       size: file_obj.size.toString(),
    //       "x-file-id": fileId,
    //       name: file_obj.name,
    //       "x-start-byte": uploadedBytes.toString(),
    //     };
    //     axios.post(
    //       "http://localhost:3002/upload/file",
    //       file_obj.slice(uploadedBytes, file_obj.size + 1),
    //       {
    //         headers,
    //       }
    //     );
    //     // } else {
    //     // }
    //   })
    //   .catch((err) => console.log("erro ", err));

    // return;

    // NNNNNNN

    resetChunkProperties();
    const _file = e.target.files[0];
    setFileSize(_file.size);

    const _totalCount =
      _file.size <= chunkSize
        ? 1
        : _file.size % chunkSize === 0
        ? _file.size / chunkSize
        : Math.floor(_file.size / chunkSize) + 1; // Total count of chunks will have been upload to finish the file
    setChunkCount(_totalCount);

    setFileToBeUpload(_file);
    const _fileID = uuidv4() + "." + _file.name.split(".").pop();
    setFileGuid(_fileID);
  };

  const fileUpload = () => {
    setCounter(counter + 1);
    if (counter <= chunkCount) {
      var chunk = fileToBeUpload.slice(beginingOfTheChunk, endOfTheChunk);
      console.log("chunk ", chunk);
      uploadChunk(chunk);
    }
  };

  const uploadChunk = async (chunk) => {
    try {
      const response = await axios.post(
        "http://localhost:3002/upload/filechunk",
        chunk,
        {
          headers: {
            "x-file-name": fileGuid,
            "Content-range": `bytes ${beginingOfTheChunk}-${endOfTheChunk}/${fileSize}`,
          },
        }
      );
      const data = response.data;
      console.log("data ", data);
      // if (data.isSuccess) {
      setBeginingOfTheChunk(endOfTheChunk);

      setEndOfTheChunk(
        fileSize - endOfTheChunk < chunkSize
          ? fileSize
          : endOfTheChunk + chunkSize
      );
      if (counter === chunkCount) {
        console.log("Process is complete, counter", counter);

        await uploadCompleted();
      } else {
        var percentage = (counter / chunkCount) * 100;
        setProgress(percentage);
      }
      // } else {
      // console.log("Error Occurred:", data);
      // }
    } catch (error) {
      // debugger;
      console.log("error", error);
    }
  };

  const uploadCompleted = async () => {
    var formData = new FormData();
    formData.append("fileName", fileGuid);

    const response = await axios.post(
      "http://localhost:3002/testChunkUpload/UploadComplete",
      {},
      {
        params: {
          fileName: fileGuid,
        },
        data: formData,
      }
    );

    const data = response.data;
    if (data.isSuccess) {
      setProgress(100);
    }
  };

  const resetChunkProperties = () => {
    setShowProgress(true);
    setProgress(0);
    setCounter(1);
    setBeginingOfTheChunk(0);
    setEndOfTheChunk(chunkSize);
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

export default App;

// import React, { useEffect, useState } from "react";
// import { ProgressBar, Jumbotron, Form } from "react-bootstrap";
// import axios from "axios";

// const chunkSize = 1048576 * 100; //its 3MB, increase the number measure in mb

// function Upload() {
//   const [showProgress, setShowProgress] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [fileSize, setFileSize] = useState(0);
//   const [fileId, setFileId] = useState("");
//   const [totalChunks, setTotalChunks] = useState(0);
//   const [startChunk, setStartChunk] = useState(0);
//   const [endChunk, setEndChunk] = useState(chunkSize);
//   const [totalChunksUploaded, setTotalChunksUploaded] = useState(0);
//   const [fileToUpload, setFileToUpload] = useState(null);

//   const progressInstance = (
//     <ProgressBar animated now={progress} label={`${progress.toFixed(3)}%`} />
//   );

//   useEffect(() => {
//     if (fileSize > 0) {
//       fileUpload();
//     }
//   }, [fileToUpload, progress]);

//   const getFileContext = (e) => {
//     setShowProgress(true);
//     setProgress(0);
//     resetState();
//     const file_obj = e.target.files[0];
//     const fileId = `${file_obj.size}-${file_obj.lastModified}-${file_obj.name}`;
//     setFileId(fileId);
//     setFileSize(file_obj.size);
//     setFileToUpload(file_obj);

//     axios
//       .get("http://localhost:3002/upload/status", {
//         headers: {
//           "x-file-name": fileId,
//           "file-size": file_obj.size,
//         },
//       })
//       .then(({ data }) => {
//         const uploadedBytes = data.uploaded;
//         console.log("uploaded bbytes ", uploadedBytes);

//         const bytesRemaining = file_obj.size - uploadedBytes;
//         setTotalChunks(Math.ceil(bytesRemaining / chunkSize));
//         setStartChunk(uploadedBytes);
//         const endingChunk = Math.min(uploadedBytes + chunkSize, file_obj.size);
//         setEndChunk(endingChunk === fileSize ? endingChunk + 1 : endingChunk);
//       })
//       .catch((err) => console.error("Status call failed"));
//   };

//   const fileUpload = () => {
//     setTotalChunksUploaded(totalChunksUploaded + 1);
//     if (totalChunksUploaded <= totalChunks) {
//       var chunk = fileToUpload.slice(startChunk, endChunk);
//       uploadChunk(chunk);
//     } else {
//       axios
//         .post("http://localhost:3002/upload/complete", {
//           headers: {
//             "x-file-name": fileId,
//           },
//         })
//         .then(resetState);
//     }
//   };

//   const uploadChunk = (chunk) => {
//     console.table({
//       startChunk,
//       endChunk,
//       totalChunks,
//       totalChunksUploaded,
//       fileSize,
//       progress,
//     });
//     axios
//       .post("http://localhost:3002/upload/files", chunk, {
//         headers: {
//           "x-file-name": fileId,
//           "Content-Range": `bytes ${startChunk}-${endChunk}/${fileSize}`,
//           "file-size": fileSize,
//         },
//       })
//       .then(({ data }) => {
//         setTotalChunksUploaded(totalChunksUploaded + 1);
//         setStartChunk(endChunk);
//         const endingChunk = Math.min(endChunk + chunkSize, fileSize);
//         setEndChunk(endingChunk === fileSize ? endingChunk + 1 : endingChunk);
//         const prog = totalChunks
//           ? (totalChunksUploaded / totalChunks) * 100
//           : 0.1;
//         setProgress(prog);
//       });
//   };

//   const resetState = () => {
//     setFileToUpload(null);
//     setFileId("");
//     setStartChunk(0);
//     setEndChunk(0);
//     setFileSize(0);
//     setTotalChunks(0);
//     setTotalChunksUploaded(0);
//   };

//   return (
//     <Jumbotron>
//       <Form>
//         <Form.Group>
//           <Form.File
//             id="exampleFormControlFile1"
//             onChange={getFileContext}
//             label="Example file input"
//           />
//         </Form.Group>
//         <Form.Group style={{ display: showProgress ? "block" : "none" }}>
//           {progressInstance}
//         </Form.Group>
//       </Form>
//     </Jumbotron>
//   );
// }

// export default Upload;
