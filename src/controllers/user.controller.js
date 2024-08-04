import jwt from "jsonwebtoken";
// models
import { User } from "../models/user.model.js";
// utils
import { asyncHandler } from "../utils/asyncHandler.js";
import { isEmpty } from "../utils/validation.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { generateTokens } from "../utils/generateToken.js";
import { cookieOptions } from "../constants.js";
import mongoose from "mongoose";

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
// route: /api/v1/user/refresh-access-token
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

// PUT
// route: /api/v1/user/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (isEmpty(oldPassword, newPassword)) {
    throw new ApiError(401, "Old password and new password are required!");
  }
  if (oldPassword === newPassword) {
    throw new ApiError(400, "Try setting different password!");
  }
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password!");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password updated successfully!", {}));
});

// GET
// route: /api/v1/user/
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(200, "User fetched successfully!", { user: req.user })
    );
});

// PUT
// route: /api/v1/user/update-user-info
export const updateUserInfo = asyncHandler(async (req, res) => {
  const { fullName, username, email } = req.body;

  if (!fullName && !username && !email) {
    throw new ApiError(400, "Give a field to update!");
  }

  const objectData = {};
  if (fullName) objectData.fullName = fullName;
  if (username) objectData.username = username;
  if (email) objectData.email = email;

  let user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (user) {
    throw new ApiError(400, "Already taken!");
  }

  user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: objectData,
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "User updated successfully!", { user }));
});

// PUT
// route: /api/v1/user/update-avatar
export const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalFilePath = req.file?.path;
  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Invalid avatar file path!");
  }

  let user = await User.findById(req.user?._id);
  if (user.avatar) {
    await deleteOnCloudinary(user.avatar);
  }

  const avatar = await uploadOnCloudinary(avatarLocalFilePath);
  if (!avatar.url) {
    throw new ApiError(400, "Failed uploading avatar!");
  }

  user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(202)
    .json(new ApiResponse(202, "Avatar updated successfully!", { user }));
});

// PUT
// route: /api/v1/user/update-cover-image
export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalFilePath = req.file?.path;
  console.log(coverImageLocalFilePath);
  if (!coverImageLocalFilePath) {
    throw new ApiError(400, "Invalid avatar file path!");
  }

  let user = await User.findById(req.user?._id);
  if (user.coverImage) {
    await deleteOnCloudinary(user.coverImage);
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  if (!coverImage.url) {
    throw new ApiError(400, "Failed uploading Cover Image!");
  }

  user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(202)
    .json(new ApiResponse(202, "Cover Image updated successfully!", { user }));
});

// GET
// route: /api/v1/user/:channelUsername
export const getChannelInfo = asyncHandler(async (req, res) => {
  const { channelUsername } = req.params;

  if (!channelUsername?.trim()) {
    throw new ApiError(400, "Channel username is required!");
  }

  let channel = await User.findOne({ username: channelUsername });
  if (!channel) {
    throw new ApiError(400, "Channel not found!");
  }

  channel = User.aggregate([
    // find out the channel with it's username
    {
      $match: {
        username: channelUsername.toLowerCase(),
      },
    },
    // find out the number of subscribers of that channel from subscriptions model
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    // add the above field subscriber count in the channel information
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    // only give the necessary information required to show in the channel profile
    {
      $project: {
        fullName: 1,
        email: 1,
        username: 1,
        subscriberCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        createdAt: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(400, "Channel data is not available!");
  }

  return res.status(200).json(
    new ApiResponse(200, "Channel data retrieved successfully!", {
      channel: channel[0],
    })
  );
});

// GET
// route: /api/v1/user/history
export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  if (!user) {
    throw new ApiError(400, "No watch history available!");
  }

  return res.status(200).json(
    new ApiResponse(200, "Watch history retrieved successfully!", {
      watchHistory: user[0]?.watchHistory,
    })
  );
});
