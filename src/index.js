import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import { app } from "./app.js";

//? configurations
dotenv.config();
console.log(process.env.MONGODB_URI);

// connection to database and server listening
connectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Server started on PORT:", process.env.PORT);
    });
    app.on("error", (error) => {
      console.log("Failed to connect to the server", error);
    });
  })
  .catch((error) => {
    console.log(error);
  });
