import mongoose from "mongoose";
//? constants
import { DB_NAME } from "../constants.js";

// does: establish connection with the database
export const connectDB = async () => {
  try {
    const res = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("*****Database connection established*****");
    console.log("Database Name:", res.connection.name);
    console.log("Database Host:", res.connection.host);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};
