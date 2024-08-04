import jwt from "jsonwebtoken";
// models
import { User } from "../models/user.model.js";
// utils
import { asyncHandler } from "../utils/asyncHandler.js";
import { isEmpty } from "../utils/validation.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { generateTokens } from "../utils/generateToken.js";
import { cookieOptions } from "../constants.js";

// POST
// route: /api/v1/user/register
export const registerUser = asyncHandler(async (req, res) => {
  // 1. get the user details
  const { username, email, fullName, password } = req.body;
  // 2. check fields are empty or not
  if (isEmpty(username, email, fullName, password)) {
    throw new ApiError(400, "All fields are required!");
  }
  // 3. check if user already exists
  let user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (user) {
    throw new ApiError(409, "User with email or username already exists!");
  }
  // 4. check for images (avatar)
  const avatarLocalFilePath = req.files?.avatar[0]?.path;
  let coverImageLocalFilePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalFilePath = req.files.coverImage[0].path;
  }

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar is required!");
  }
  // 5. upload them on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  if (!avatar) {
    throw new ApiError(400, "Avatar is required!");
  }
  // 6. create user
  user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 7. remove password and refresh token field from response
  user = await User.findById(user._id).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(500, "Can't register user!");
  }
  // send response
  return res
    .status(201)
    .json(new ApiResponse(201, "User registration successful!", user));
});

// POST
// route: /api/v1/user/login
export const loginUser = asyncHandler(async (req, res) => {
  // 1. get the initial data
  const { username, email, password } = req.body;
  // 2. validation
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required!");
  }
  if (!password) {
    throw new ApiError(400, "Password is required!");
  }
  // 3. find the user
  let user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(400, "User doesn't exists!");
  }
  // 4. check the password
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid user credentials!");
  }
  // 5. generate access & refresh token and send cookies
  const { accessToken, refreshToken } = await generateTokens(user._id);
  user = await User.findById(user._id).select("-password -refreshToken");

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, "User logged in successfully!", {
        user,
        accessToken,
        refreshToken,
      })
    );
  // 6. send response
});

// POST
// route: /api/v1/user/logout
export const logoutUser = asyncHandler(async (req, res) => {
  // 1. find the user
  const id = req.user._id;
  const data = await User.findByIdAndUpdate(
    id,
    {
      $set: { refreshToken: null },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, "User logged out successfully!", { data }));
});

// POST
// route: /api/v1/user/refreshAccessToken
// does: if user doesn't have access token (if expired) then with the help of refresh token user can create new access token with the help of refresh token which is stored in database
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. get the token
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  // 2. decode refresh token
  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // 3. find user
    let user = await User.findById(decodedRefreshToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    // 4. compare refresh token
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used!");
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    // 5. send response
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(200, "Access token is refreshed!", {
          accessToken,
          refreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(401, "Failed refreshing access token!");
  }
});
