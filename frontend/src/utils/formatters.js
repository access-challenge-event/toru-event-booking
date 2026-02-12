export const formatDate = (value, options) =>
  new Date(value).toLocaleDateString("en-GB", options);

export const formatTime = (value) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
