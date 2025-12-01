// utils/upload.js

const multer = require('multer');
const path = require('path');

// Memory storage
const storage = multer.memoryStorage();

// Combined media filter
const mediaFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|mov|avi|wmv|flv|mkv/;
  const extname = path.extname(file.originalname).toLowerCase();

  const isImage = imageTypes.test(extname) && file.mimetype.startsWith('image/');
  const isVideo = videoTypes.test(extname) && file.mimetype.startsWith('video/');

  if (isImage || isVideo) {
    return cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'));
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter: mediaFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Export the .fields() method directly
const uploadPropertyMedia = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]);

module.exports = {
  uploadPropertyMedia,
  uploadImage: upload.single('image'), // optional
  uploadVideo: upload.single('video')  // optional
};