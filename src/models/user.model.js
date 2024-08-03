import { Schema, models } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// constants
import { BCRYPT_SALTS_ROUNDS } from "../constants";

// user schema
const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required!"],
      unique: [true, "Username must be unique!"],
      lowercase: [true, "Username must be in lowercase!"],
      trim: true,
      index: true,
      min: [2, "Username must be at least 2 characters long!"],
      max: [20, "Username must be no more than 20 characters long!"],
    },
    email: {
      type: String,
      required: [true, "Email is required!"],
      unique: [true, "Email must be unique!"],
      lowercase: [true, "Email must be in lowercase!"],
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, "Full Name is required!"],
      min: [2, "Full Name must be at least 2 characters long!"],
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url
      required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    password: {
      type: String,
      required: [true, "Password is required!"],
      min: [6, "Password must be at least 6 characters long!"],
      max: [20, "Password must be no more than 20 characters long!"],
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

// middlewares
// does: encrypt the password before saving document in the database
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_SALTS_ROUNDS);
  next();
});

// custom methods
// does: check whether password is correct or not
UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
// does: generate access token for user
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
// does: generate refresh token for user
UserSchema.methods.refreshAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};
// user model
export const User = models("User", UserSchema);
