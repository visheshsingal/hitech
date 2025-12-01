const Analytics = require('../models/Analytics');
const Property = require('../models/Property');

/**
 * @desc    Track property view
 * @route   POST /api/analytics/view
 * @access  Public
 */
const trackView = async (req, res) => {
  try {
    const { propertyId, sessionId } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const analytics = await Analytics.create({
      propertyId,
      eventType: 'view',
      city: property.city,
      price: property.price,
      bhk: property.bhk,
      sessionId: sessionId || req.ip,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('trackView ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track view',
      error: error.message
    });
  }
};

/**
 * @desc    Track property click
 * @route   POST /api/analytics/click
 * @access  Public
 */
const trackClick = async (req, res) => {
  try {
    const { propertyId, sessionId } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    const analytics = await Analytics.create({
      propertyId,
      eventType: 'click',
      city: property.city,
      price: property.price,
      bhk: property.bhk,
      sessionId: sessionId || req.ip,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('trackClick ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click',
      error: error.message
    });
  }
};

/**
 * @desc    Track filter usage
 * @route   POST /api/analytics/filter
 * @access  Public
 */
const trackFilter = async (req, res) => {
  try {
    const { city, priceRange, bhk, sessionId } = req.body;

    const analytics = await Analytics.create({
      propertyId: null,
      eventType: 'filter',
      city: city || null,
      price: priceRange?.max || null,
      bhk: bhk || null,
      sessionId: sessionId || req.ip,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('trackFilter ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track filter',
      error: error.message
    });
  }
};

/**
 * @desc    Get top properties by views/clicks
 * @route   GET /api/analytics/top-properties
 * @access  Private (Admin)
 */
const getTopProperties = async (req, res) => {
  try {
    const { eventType = 'view', limit = 10 } = req.query;

    const topProperties = await Analytics.aggregate([
      {
        $match: {
          eventType: eventType,
          propertyId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$propertyId',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'property'
        }
      },
      {
        $unwind: '$property'
      },
      {
        $project: {
          propertyId: '$_id',
          title: '$property.title',
          city: '$property.city',
          price: '$property.price',
          bhk: '$property.bhk',
          image: { $arrayElemAt: ['$property.images.url', 0] },
          count: 1,
          lastActivity: 1
        }
      }
    ]);

    res.json({
      success: true,
      count: topProperties.length,
      data: topProperties
    });
  } catch (error) {
    console.error('getTopProperties ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top properties',
      error: error.message
    });
  }
};

/**
 * @desc    Get top locations
 * @route   GET /api/analytics/top-locations
 * @access  Private (Admin)
 */
const getTopLocations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topLocations = await Analytics.aggregate([
      {
        $match: {
          city: { $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$city',
          views: {
            $sum: { $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] }
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
          },
          totalEvents: { $sum: 1 }
        }
      },
      {
        $sort: { totalEvents: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      count: topLocations.length,
      data: topLocations
    });
  } catch (error) {
    console.error('getTopLocations ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top locations',
      error: error.message
    });
  }
};

/**
 * @desc    Get price range analytics
 * @route   GET /api/analytics/top-prices
 * @access  Private (Admin)
 */
const getTopPrices = async (req, res) => {
  try {
    const priceRanges = [
      { label: 'Under 50L', min: 0, max: 5000000 },
      { label: '50L - 1Cr', min: 5000000, max: 10000000 },
      { label: '1Cr - 2Cr', min: 10000000, max: 20000000 },
      { label: '2Cr - 5Cr', min: 20000000, max: 50000000 },
      { label: 'Above 5Cr', min: 50000000, max: Infinity }
    ];

    const analytics = await Promise.all(
      priceRanges.map(async (range) => {
        const count = await Analytics.countDocuments({
          price: { $gte: range.min, $lt: range.max },
          eventType: { $in: ['view', 'click'] }
        });
        return {
          range: range.label,
          count
        };
      })
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('getTopPrices ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get price analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get BHK analytics
 * @route   GET /api/analytics/top-bhk
 * @access  Private (Admin)
 */
const getTopBHK = async (req, res) => {
  try {
    const bhkAnalytics = await Analytics.aggregate([
      {
        $match: {
          bhk: { $ne: null },
          eventType: { $in: ['view', 'click'] }
        }
      },
      {
        $group: {
          _id: '$bhk',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: bhkAnalytics.map(item => ({
        bhk: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('getTopBHK ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get BHK analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get engagement over time
 * @route   GET /api/analytics/engagement
 * @access  Private (Admin)
 */
const getEngagement = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const engagement = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    // Format data for charts
    const formattedData = {};
    engagement.forEach(item => {
      if (!formattedData[item._id.date]) {
        formattedData[item._id.date] = { date: item._id.date, views: 0, clicks: 0 };
      }
      formattedData[item._id.date][item._id.eventType + 's'] = item.count;
    });

    res.json({
      success: true,
      data: Object.values(formattedData)
    });
  } catch (error) {
    console.error('getEngagement ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get engagement data',
      error: error.message
    });
  }
};

/**
 * @desc    Get analytics summary
 * @route   GET /api/analytics/summary
 * @access  Private (Admin)
 */
const getSummary = async (req, res) => {
  try {
    const totalViews = await Analytics.countDocuments({ eventType: 'view' });
    const totalClicks = await Analytics.countDocuments({ eventType: 'click' });
    
    const topCity = await Analytics.aggregate([
      {
        $match: { city: { $ne: null, $ne: '' } }
      },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 1
      }
    ]);

    const topPriceRange = await Analytics.aggregate([
      {
        $match: { price: { $ne: null } }
      },
      {
        $bucket: {
          groupBy: '$price',
          boundaries: [0, 5000000, 10000000, 20000000, 50000000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 1
      }
    ]);

    res.json({
      success: true,
      data: {
        totalViews,
        totalClicks,
        topCity: topCity[0]?._id || 'N/A',
        topCityCount: topCity[0]?.count || 0,
        engagementRate: totalClicks > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('getSummary ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics summary',
      error: error.message
    });
  }
};

module.exports = {
  trackView,
  trackClick,
  trackFilter,
  getTopProperties,
  getTopLocations,
  getTopPrices,
  getTopBHK,
  getEngagement,
  getSummary
};