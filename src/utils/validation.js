export const isEmpty = (...values) => {
  return values.some((value) => {
    return value == null || value.trim() === "";
  });
};
