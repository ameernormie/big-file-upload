import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Upload from "./Upload";
import "bootstrap/dist/css/bootstrap.min.css";

ReactDOM.render(
  <React.StrictMode>
    <Upload />
    {/* <App/> */}
  </React.StrictMode>,
  document.getElementById("root")
);
