const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a property title"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      maxlength: [2000, "Description cannot be more than 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
      min: [0, "Price cannot be negative"],
    },
    bhk: {
      type: Number,
      required: [true, "Please specify BHK"],
      min: [1, "BHK must be at least 1"],
      max: [10, "BHK cannot exceed 10"],
    },
    bathrooms: {
      type: Number,
      required: [true, "Please specify number of bathrooms"],
      min: [1, "Bathrooms must be at least 1"],
      max: [10, "Bathrooms cannot exceed 10"],
    },
    city: {
      type: String,
      required: [true, "Please add a city"],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, "Please add an address"],
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Collections is an array of manually assigned collection keys (e.g. 'luxury', 'budget-friendly')
    collections: {
      type: [String],
      default: [],
      index: true,
    },
    // Manually assigned featured location for a property
    featuredLocation: {
      title: { type: String, trim: true },
      image: {
        url: { type: String },
        publicId: { type: String }
      }
    },
    // Manually assigned curated property tag for a property (mirrors featuredLocation)
    curatedProperty: {
      title: { type: String, trim: true },
      image: {
        url: { type: String },
        publicId: { type: String }
      }
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    images: {
      type: [
        {
          url: String,
          publicId: String,
        },
      ],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 15;
        },
        message: "Cannot upload more than 15 images",
      },
    },
    // Legacy single-video field kept for backward compatibility.
    video: {
      url: String,
      publicId: String,
    },
    // New videos array to support multiple videos (up to 2)
    videos: {
      type: [
        {
          url: String,
          publicId: String,
        },
      ],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 2;
        },
        message: "Cannot upload more than 2 videos",
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "sold"],
      default: "active",
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for filtering
propertySchema.index({ city: 1, price: 1 });
propertySchema.index({ status: 1, createdAt: -1 });

// Virtual for checking if property is recent (last 30 days)
propertySchema.virtual("isRecent").get(function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return this.createdAt >= thirtyDaysAgo;
});

module.exports = mongoose.model("Property", propertySchema);
