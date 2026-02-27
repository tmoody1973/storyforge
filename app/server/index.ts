import express from "express";
import cors from "cors";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./uploadthing";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));

app.use(
  "/api/uploadthing",
  createRouteHandler({ router: uploadRouter })
);

const port = 3001;
app.listen(port, () => {
  console.log(`UploadThing server running on http://localhost:${port}`);
});
