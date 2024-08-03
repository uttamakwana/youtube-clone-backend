import { asyncHandler } from "../utils/asyncHandler.js";

// POST
// route: /api/user/register
export const registerUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ message: "Registration API working successfully!" });
});
