import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_CLOUDNAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// does: upload the file on cloudinary cloud
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return console.error("Cloudinary upload failed!");
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File uploaded successfully!");
    console.log("Cloudinary URL", response.url);
    return response;
  } catch (error) {
    // remove file stored in temporary folder as cloudinary upload failed!
    fs.unlinkSync(localFilePath);
    return null;
  }
};
