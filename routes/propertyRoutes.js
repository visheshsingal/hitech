const express = require("express");
const router = express.Router();
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  deletePropertyImage,
  filterProperties,
  getCities,
  getCuratedCollections,
  getCuratedPropertyTitles,
  getPropertiesByCollectionKey,
  getFeaturedLocations,
  togglePropertyFeaturedStatus
} = require("../controllers/propertyController");
const { protect } = require("../middleware/authMiddleware");
const { uploadPropertyMedia } = require("../middleware/upload");

// Public routes
router.get("/collections/curated", getCuratedCollections);
router.get("/collections/:key", getPropertiesByCollectionKey);
router.get("/locations/featured", getFeaturedLocations);
router.get("/curated/titles", getCuratedPropertyTitles);
router.get("/", getAllProperties);
router.get("/filter", filterProperties);
router.get("/cities", getCities);
router.get("/:id", getPropertyById);

// Admin (protected) routes
router.post("/", protect, uploadPropertyMedia, createProperty);
router.put("/:id", protect, uploadPropertyMedia, updateProperty);
router.delete("/:id", protect, deleteProperty);
router.delete("/:id/images/:imageIndex", protect, deletePropertyImage);
router.put("/:id/toggle-featured", protect, togglePropertyFeaturedStatus);

module.exports = router;

