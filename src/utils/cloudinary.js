import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./apiError.js";

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

// does: delete the file on cloudinary
export const deleteOnCloudinary = async (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl)
      throw new ApiError(400, "Couldn't find out cloudinary URL");
    const cloudinaryUrlPublicId = getPublicIdFromUrl(cloudinaryUrl);
    await cloudinary.uploader.destroy(cloudinaryUrlPublicId);
  } catch (error) {
    throw new ApiError(400, "Couldn't delete cloudinary image");
  }
};

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1];
  const publicId = fileName.split(".")[0]; // Remove file extension
  return publicId;
};
