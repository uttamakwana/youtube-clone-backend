// does: takes function as an argument and return a promise which either resolves or rejects
export const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ success: false, message: error.message });
  }
};

// 2nd way
export const asyncHandler2 = (requestHandler) => {
  return function (req, res, next) {
    Promise.resolve(requestHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
};
