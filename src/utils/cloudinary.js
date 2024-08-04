import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
// TODO: apply process.env to configuration
cloudinary.config({
  cloud_name: "dqpnkwk97",
  api_key: "852461792895258",
  api_secret: "b_lflbpRWgSeeqBZ0U-9jifsCic",
});

// does: upload the file on cloudinary cloud
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return console.error("Cloudinary upload failed!");
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // remove file stored in temporary folder as cloudinary upload failed!
    console.error("Cloudinary Error:", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};
