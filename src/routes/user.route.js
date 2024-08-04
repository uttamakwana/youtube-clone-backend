import { Router } from "express";
// controllers
import {
  changePassword,
  getChannelInfo,
  getCurrentUser,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserInfo,
} from "../controllers/user.controller.js";
// middlewares
import { upload } from "../middlewares/multer.middleware.js";
import { isAuth } from "../middlewares/auth.middleware.js";

// user router
export const userRouter = Router();

// routes
// does: handle user registration route
userRouter.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);
// does: handle user login route
userRouter.route("/login").post(loginUser);

//? secured routes
// does: handle user logout route
userRouter.route("/logout").post(isAuth, logoutUser);
userRouter.route("/refresh-access-token").post(refreshAccessToken);
userRouter.route("/change-password").put(isAuth, changePassword);
userRouter.route("/").get(isAuth, getCurrentUser);
userRouter.route("/update-user-info").put(isAuth, updateUserInfo);
userRouter
  .route("/update-avatar")
  .put(isAuth, upload.single("avatar"), updateUserAvatar);
userRouter
  .route("/update-cover-image")
  .put(isAuth, upload.single("coverImage"), updateUserCoverImage);
userRouter.route("/:channelUsername").get(isAuth, getChannelInfo);
userRouter.route("/history").get(isAuth, getWatchHistory);
