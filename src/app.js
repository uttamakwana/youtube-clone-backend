import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

export const app = express();

//? configurations
// allow cors origin to access our backend services
app.use(cors({ origin: process.env.CORS_ORIGIN }));
// don't allow more than 16kb data in a single request
app.use(express.json({ limit: "16kb" }));
// allow extended urls in the request
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// make public folder statically accessible
app.use(express.static("public"));
// store and retrieve cookies from the client browser
app.use(cookieParser());
