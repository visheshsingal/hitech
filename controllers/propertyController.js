const Property = require('../models/Property');
const {
  uploadImageFromBuffer,
  uploadVideoFromBuffer,
  deleteMultipleFiles,
  deleteFile
} = require('../utils/cloudinary');

/**
 * @desc    Get all properties with pagination
 * @route   GET /api/properties
 * @access  Public
 */
const getAllProperties = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const properties = await Property.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments();

    res.json({
      success: true,
      count: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: properties
    });
  } catch (error) {
    console.error('getAllProperties ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Get single property by ID
 * @route   GET /api/properties/:id
 * @access  Public
 */
const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('getPropertyById ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Create new property with images and video
 * @route   POST /api/properties
 * @access  Private (Admin only)
 */
const createProperty = async (req, res, next) => {
  console.log('=== createProperty START ===');
  console.log('req.body:', req.body);
  console.log('req.files:', req.files);

  try {
    // destructure required fields from request body
    const {
      title,
      description,
      price,
      bhk,
      bathrooms,
      city,
      address,
      area,
      amenities,
      status,
      featuredLocationTitle,
      curatedPropertyTitle
    } = req.body;

    // Required fields (area is optional)
    if (!title || !price || !city || !bhk || !bathrooms) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    // Parse amenities
    let amenitiesArray = [];
    if (amenities) {
      if (typeof amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(amenities);
        } catch {
          amenitiesArray = amenities.split(',').map(a => a.trim()).filter(a => a);
        }
      } else if (Array.isArray(amenities)) {
        amenitiesArray = amenities;
      }
    }

    // Upload images
    let uploadedImages = [];
    if (req.files?.images) {
      const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

      if (imageFiles.length > 5) {
        return res.status(400).json({ success: false, message: 'Maximum 5 images allowed' });
      }

      const uploadPromises = imageFiles.map(file => uploadImageFromBuffer(file.buffer));
      uploadedImages = await Promise.all(uploadPromises);
    }

    // Upload video
    let uploadedVideo = null;
    if (req.files?.video?.[0]) {
      uploadedVideo = await uploadVideoFromBuffer(req.files.video[0].buffer);
    }

    // Handle optional featured location image upload if admin marked this property
    // as part of a featured location. Expect `featuredLocationTitle` in body and
    // `featuredLocationImage` as a file in `req.files` when adding a manual featured location.
    let featuredLocation = undefined;
    if (featuredLocationTitle) {
      // If the admin selected an existing featured location title (from dropdown),
      // reuse its image. Otherwise, require an uploaded image for the new title.
      const featuredImageFile = req.files?.featuredLocationImage;
      if (!featuredImageFile) {
        // try to find an existing image for this title
        const existing = await Property.findOne({ 'featuredLocation.title': featuredLocationTitle, 'featuredLocation.image.url': { $exists: true } }).select('featuredLocation.image');
        if (existing && existing.featuredLocation?.image) {
          featuredLocation = {
            title: featuredLocationTitle,
            image: existing.featuredLocation.image
          };
        } else {
          return res.status(400).json({ success: false, message: 'Featured location requires an image for a new title' });
        }
      } else {
        const uploadedFeaturedImage = await uploadImageFromBuffer(Array.isArray(featuredImageFile) ? featuredImageFile[0].buffer : featuredImageFile.buffer);
        featuredLocation = {
          title: featuredLocationTitle,
          image: uploadedFeaturedImage
        };
      }
    }

    // Handle optional curated property image upload / reuse
    let curatedProperty = undefined;
    if (curatedPropertyTitle) {
      const curatedImageFile = req.files?.curatedPropertyImage;
      if (!curatedImageFile) {
        // try to find an existing image for this curated title
        const existingCurated = await Property.findOne({ 'curatedProperty.title': curatedPropertyTitle, 'curatedProperty.image.url': { $exists: true } }).select('curatedProperty.image');
        if (existingCurated && existingCurated.curatedProperty?.image) {
          curatedProperty = {
            title: curatedPropertyTitle,
            image: existingCurated.curatedProperty.image
          };
        } else {
          return res.status(400).json({ success: false, message: 'Curated property requires an image for a new title' });
        }
      } else {
        const uploadedCuratedImage = await uploadImageFromBuffer(Array.isArray(curatedImageFile) ? curatedImageFile[0].buffer : curatedImageFile.buffer);
        curatedProperty = {
          title: curatedPropertyTitle,
          image: uploadedCuratedImage
        };
      }
    }

    // Create property (do not auto-mark featured)
    const property = await Property.create({
      title,
      description: description || '',
      price: parseFloat(price),
      bhk: parseInt(bhk),
      bathrooms: parseInt(bathrooms),
      city,
      address: address || '',
      area: area ? parseFloat(area) : undefined,
      amenities: amenitiesArray,
      images: uploadedImages,
      video: uploadedVideo,
      featured: false,
      featuredLocation: featuredLocation || undefined,
      curatedProperty: curatedProperty || undefined,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('createProperty ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create property',
      error: error.message
    });
  }
};

/**
 * @desc    Update property
 * @route   PUT /api/properties/:id
 * @access  Private (Admin only)
 */
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const {
      title,
      description,
      price,
      bhk,
      bathrooms,
      city,
      address,
      area,
      amenities,
      featured,
      status,
      featuredLocationTitle,
      curatedPropertyTitle
    } = req.body;

    // Update fields
    if (title) property.title = title;
    if (description) property.description = description;
    if (price) property.price = parseFloat(price);
    if (bhk) property.bhk = parseInt(bhk);
    if (bathrooms) property.bathrooms = parseInt(bathrooms);
    if (city) property.city = city;
    if (address) property.address = address;
    if (area) property.area = parseFloat(area);
    if (featured !== undefined) property.featured = featured === 'true' || featured === true;
    if (status) property.status = status;

      // only extract removal flags here; other fields were destructured above
      const { removeFeaturedLocation, removeCuratedProperty } = req.body;

    // Add new images
    if (req.files?.images) {
      const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      if (property.images.length + imageFiles.length > 5) {
        return res.status(400).json({ success: false, message: 'Total images cannot exceed 5' });
      }
      const uploadPromises = imageFiles.map(file => uploadImageFromBuffer(file.buffer));
      const newImages = await Promise.all(uploadPromises);
      property.images = [...property.images, ...newImages];
    }

    // Replace video
      // Handle featuredLocation updates/removal
      if (removeFeaturedLocation === 'true' || removeFeaturedLocation === true) {
        // remove featured image from cloudinary if exists
        if (property.featuredLocation?.image?.publicId) {
          await deleteFile(property.featuredLocation.image.publicId, 'image');
        }
        property.featuredLocation = undefined;
      } else if (featuredLocationTitle) {
        // If a new featuredLocationTitle is provided, expect optional featuredLocationImage
        const featuredImageFile = req.files?.featuredLocationImage;
        if (featuredImageFile) {
          // delete previous image if exists
          if (property.featuredLocation?.image?.publicId) {
            await deleteFile(property.featuredLocation.image.publicId, 'image');
          }
          const uploadedFeaturedImage = await uploadImageFromBuffer(Array.isArray(featuredImageFile) ? featuredImageFile[0].buffer : featuredImageFile.buffer);
          property.featuredLocation = {
            title: featuredLocationTitle,
            image: uploadedFeaturedImage
          };
        } else {
          // update only title
          property.featuredLocation = property.featuredLocation || {};
          property.featuredLocation.title = featuredLocationTitle;
        }
      }

      // Handle curatedProperty updates/removal
      if (removeCuratedProperty === 'true' || removeCuratedProperty === true) {
        if (property.curatedProperty?.image?.publicId) {
          await deleteFile(property.curatedProperty.image.publicId, 'image');
        }
        property.curatedProperty = undefined;
      } else if (curatedPropertyTitle) {
        const curatedImageFile = req.files?.curatedPropertyImage;
        if (curatedImageFile) {
          if (property.curatedProperty?.image?.publicId) {
            await deleteFile(property.curatedProperty.image.publicId, 'image');
          }
          const uploadedCuratedImage = await uploadImageFromBuffer(Array.isArray(curatedImageFile) ? curatedImageFile[0].buffer : curatedImageFile.buffer);
          property.curatedProperty = {
            title: curatedPropertyTitle,
            image: uploadedCuratedImage
          };
        } else {
          property.curatedProperty = property.curatedProperty || {};
          property.curatedProperty.title = curatedPropertyTitle;
        }
      }
    if (req.files?.video?.[0]) {
      if (property.video?.publicId) {
        await deleteFile(property.video.publicId, 'video');
      }
      const newVideo = await uploadVideoFromBuffer(req.files.video[0].buffer);
      property.video = newVideo;
    }

    await property.save();

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    console.error('updateProperty ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Delete property
 * @route   DELETE /api/properties/:id
 * @access  Private (Admin only)
 */
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Delete from Cloudinary
    if (property.images?.length > 0) {
      const publicIds = property.images.map(img => img.publicId).filter(Boolean);
      if (publicIds.length > 0) await deleteMultipleFiles(publicIds, 'image');
    }
    if (property.video?.publicId) {
      await deleteFile(property.video.publicId, 'video');
    }

    await property.deleteOne();

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('deleteProperty ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Delete single image from property
 * @route   DELETE /api/properties/:id/images/:imageIndex
 * @access  Private (Admin only)
 */
const deletePropertyImage = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= property.images.length) {
      return res.status(400).json({ success: false, message: 'Invalid image index' });
    }

    const image = property.images[imageIndex];
    if (image.publicId) {
      await deleteFile(image.publicId, 'image');
    }

    property.images.splice(imageIndex, 1);
    await property.save();

    res.json({
      success: true,
      message: 'Image deleted successfully',
      data: property
    });
  } catch (error) {
    console.error('deletePropertyImage ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Filter properties
 * @route   GET /api/properties/filter
 * @access  Public
 */
const filterProperties = async (req, res, next) => {
  try {
    const { city, minPrice, maxPrice, bhk, sort } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (city) query.city = { $regex: city, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (bhk) query.bhk = parseInt(bhk);

    let sortQuery = { createdAt: -1 };
    if (sort === 'price_asc') sortQuery = { price: 1 };
    else if (sort === 'price_desc') sortQuery = { price: -1 };
    else if (sort === 'bhk_asc') sortQuery = { bhk: 1 };
    else if (sort === 'bhk_desc') sortQuery = { bhk: -1 };

    const properties = await Property.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      count: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: properties
    });
  } catch (error) {
    console.error('filterProperties ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Get all cities
 * @route   GET /api/properties/cities
 * @access  Public
 */
const getCities = async (req, res, next) => {
  try {
    const cities = await Property.distinct('city');
    res.json({
      success: true,
      count: cities.length,
      data: cities.sort()
    });
  } catch (error) {
    console.error('getCities ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Get curated collections of properties (manual collections only)
 * @route   GET /api/properties/collections/curated
 * @access  Public
 */
const getCuratedCollections = async (req, res, next) => {
  try {
    // Curated collections are manual. Properties must be assigned to a
    // collection via the `collections` array on the Property model.
    const collectionKeys = [
      { key: 'new-projects', title: 'New Projects', defaultImage: "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=1200" },
      { key: 'ready-to-move', title: 'Ready to Move', defaultImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200" },
      { key: 'luxury', title: 'Luxury Homes', defaultImage: "https://images.unsplash.com/photo-1512914890250-353c97c9e7e2?w=1200" },
      { key: 'budget-friendly', title: 'Budget Friendly', defaultImage: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200" }
    ];

    const curatedCollections = [];

    for (const col of collectionKeys) {
      const count = await Property.countDocuments({ collections: col.key, status: 'active' });
      const sample = await Property.findOne({ collections: col.key, status: 'active', 'images.0': { $exists: true } }).select('images');
      curatedCollections.push({
        title: col.title,
        count: `${count} Properties`,
        image: sample?.images?.[0]?.url || col.defaultImage,
        key: col.key,
        properties: count
      });
    }

    res.json({ success: true, data: curatedCollections });
  } catch (error) {
    console.error('getCuratedCollections ERROR:', error);
    next(error);
  }
};


/**
 * @desc    Get properties for a specific curated collection
 * @route   GET /api/properties/collections/:key
 * @access  Public
 */
const getPropertiesByCollectionKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Only return properties manually assigned to the collection via
    // the `collections` array on the Property model.
    const acceptedKeys = ['new-projects', 'ready-to-move', 'luxury', 'budget-friendly'];
    const keyNormalized = (key || '').toLowerCase().trim();

    if (!acceptedKeys.includes(keyNormalized)) {
      return res.status(400).json({
        success: false,
        message: `Unknown collection key: ${key}. Valid keys: ${acceptedKeys.join(', ')}`
      });
    }

    const query = { collections: keyNormalized, status: 'active' };

    const properties = await Property.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      count: properties.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: properties
    });
  } catch (error) {
    console.error('getPropertiesByCollectionKey ERROR:', error);
    next(error);
  }
};

/**
 * @desc    Get featured locations (top cities/areas with most featured properties)
 * @route   GET /api/properties/locations/featured
 * @access  Public
 */
const getFeaturedLocations = async (req, res, next) => {
  try {
    // 1) Manual featured locations: properties that have a featuredLocation.title
    const manual = await Property.aggregate([
      { $match: { status: 'active', 'featuredLocation.title': { $exists: true, $ne: '' } } },
      { $group: {
          _id: '$featuredLocation.title',
          count: { $sum: 1 },
          sampleImage: { $first: '$featuredLocation.image.url' }
      }},
      { $sort: { count: -1 } },
      { $project: { _id: 0, title: '$_id', count: 1, image: '$sampleImage' } }
    ]);

    // NOTE: We intentionally do NOT include an automatic city-based aggregation
    // driven by the `featured` boolean. Featured locations should be manual
    // entries (properties with `featuredLocation.title`) to avoid star-toggling
    // a property from creating a new featured location implicitly.
    res.status(200).json({ success: true, data: { manual, cities: [] } });

  } catch (error) {
    console.error('Error fetching featured locations:', error);
    res.status(500).json({ success: false, error: 'Server Error fetching featured locations' });
  }
};

/**
 * @desc    Get distinct curated property titles (manual curated tags)
 * @route   GET /api/properties/curated/titles
 * @access  Public
 */
const getCuratedPropertyTitles = async (req, res, next) => {
  try {
    const manual = await Property.aggregate([
      { $match: { status: 'active', 'curatedProperty.title': { $exists: true, $ne: '' } } },
      { $group: {
          _id: '$curatedProperty.title',
          count: { $sum: 1 },
          sampleImage: { $first: '$curatedProperty.image.url' }
      }},
      { $sort: { count: -1 } },
      { $project: { _id: 0, title: '$_id', count: 1, image: '$sampleImage' } }
    ]);

    res.status(200).json({ success: true, data: manual });
  } catch (error) {
    console.error('Error fetching curated titles:', error);
    res.status(500).json({ success: false, error: 'Server Error fetching curated titles' });
  }
};

// Example of the function in your controller/service file
const togglePropertyFeaturedStatus = async (req, res) => {
  try {
    const propertyId = req.params.id;
    // 1. Find the current property
    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // 2. Determine the new status (the opposite of the current status)
    const newFeaturedStatus = !property.featured;

    // 3. Update the property in the database
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { $set: { featured: newFeaturedStatus } },
      { new: true } // Return the updated document
    );

    res.status(200).json({
      message: 'Property featured status toggled successfully',
      property: updatedProperty
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during toggle operation' });
  }
}


module.exports = {
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
};