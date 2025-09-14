import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "company_logos",
      allowed_formats: ["jpg", "png", "jpeg"],
      public_id: file.originalname.split(".")[0], // optional
    } as any; // <- type cast
  },
});

const upload = multer({ storage });

export default upload;
