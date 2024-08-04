import { Router } from "express";
// controllers
import {
  loginUser,
  logoutUser,
  registerUser,
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
