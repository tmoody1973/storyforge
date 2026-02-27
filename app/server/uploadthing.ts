import { createUploadthing, type FileRouter } from "uploadthing/express";

const f = createUploadthing();

export const uploadRouter = {
  audioUploader: f({
    audio: {
      maxFileSize: "512MB",
      maxFileCount: 5,
    },
  }).onUploadComplete((data) => {
    console.log("Upload complete:", data.file.name, data.file.url);
  }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
