# Big file upload

Uploading a big file on web is an issue. Most browsers don't support uploading big file more than 1-2 GB.
A solution to this problem is to upload a file in chunks.

### Using chunks

Uploading a file using chunks is a simple but effective solution to upload big files.
Basically we do these steps:

1. Get the file context in the frontend, find out the size of the file.
2. Make chunks of the bytes based on a pre-defined chunkSize
3. Upload chunks to the server sequentially.

### How does backend handle chunks

1. From frontend we give our uploaded file a unique file id, which helps backend to realize the existing chunks that have already been uploaded.
2. We send the unique file id in the `x-file-name` header.
3. Backend checks if the file already has some bytes uploaded previously, if yes, then the backend appends using a filestream to the existing file

### Resumable Upload

We can take advantage of resuming our file upload with the chunk upload approach.
To acheive this, we have defined three API calls in the server.

1. `/upload/status`: We will send the unique file id in the header `x-file-name` and file size in the headder `file-size`. Backend will let us know how many bytes have already been uploaded for this file. If no bytes are uploaded then the backend will return `uploaded` 0.
2. `/upload/files`: After the status api call, we will have the uploaded bytes, based on that we will make chunks of the remaining bytes of the file and start uploading them sequentially.
3. `/upload/complete`: After all chunks have been uploaded, we will make the complete api call so that backend can do cleanup.

### Running

1. Frontend: run frontend using command `yarn start` after installing node modules.
2. Backend: run backend using `yarn server`
