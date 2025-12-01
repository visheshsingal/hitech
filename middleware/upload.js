const multer = require("multer");

// Use in-memory storage (works great with Cloudinary buffer uploads)
const storage = multer.memoryStorage();

// Validate file types
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "images") {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed for images"), false);
  } else if (file.fieldname === "video" || file.fieldname === "videos") {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed for videos"), false);
  } else if (file.fieldname === "featuredLocationImage") {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed for featuredLocationImage"), false);
  } else if (file.fieldname === "curatedPropertyImage") {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed for curatedPropertyImage"), false);
  } else {
    cb(new Error("Invalid fieldname"), false);
  }
};

// Define the multer upload middleware
const uploadPropertyMedia = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for safety
  },
}).fields([
  { name: "images", maxCount: 15 },
  { name: "video", maxCount: 1 },
  { name: "videos", maxCount: 2 },
  { name: "featuredLocationImage", maxCount: 1 },
  { name: "curatedPropertyImage", maxCount: 1 },
]);

module.exports = { uploadPropertyMedia };
