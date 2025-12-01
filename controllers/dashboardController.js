const Property = require("../models/Property");
const Enquiry = require("../models/Enquiry");

/**
 * Get comprehensive dashboard statistics
 * GET /api/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    // === PROPERTY STATS ===
    const totalProperties = await Property.countDocuments();

    // Properties this month
    const propertiesThisMonth = await Property.countDocuments({
      createdAt: { $gte: startOfThisMonth },
    });

    // Properties last month
    const propertiesLastMonth = await Property.countDocuments({
      createdAt: {
        $gte: startOfLastMonth,
        $lt: startOfThisMonth,
      },
    });

    // Calculate properties growth
    const propertiesGrowth =
      propertiesLastMonth > 0
        ? (
            ((propertiesThisMonth - propertiesLastMonth) /
              propertiesLastMonth) *
            100
          ).toFixed(1)
        : propertiesThisMonth > 0
        ? 100
        : 0;

    // Active listings (recent properties)
    const activeListings = await Property.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      status: "active",
    });

    // === ENQUIRY STATS ===
    const totalEnquiries = await Enquiry.countDocuments();

    // Enquiries this month
    const enquiriesThisMonth = await Enquiry.countDocuments({
      createdAt: { $gte: startOfThisMonth },
    });

    // Enquiries last month
    const enquiriesLastMonth = await Enquiry.countDocuments({
      createdAt: {
        $gte: startOfLastMonth,
        $lt: startOfThisMonth,
      },
    });

    // Calculate enquiries growth
    const enquiriesGrowth =
      enquiriesLastMonth > 0
        ? (
            ((enquiriesThisMonth - enquiriesLastMonth) / enquiriesLastMonth) *
            100
          ).toFixed(1)
        : enquiriesThisMonth > 0
        ? 100
        : 0;

    // Pending and handled enquiries
    const pendingEnquiries = await Enquiry.countDocuments({
      status: "pending",
    });
    const handledEnquiries = await Enquiry.countDocuments({
      status: "handled",
    });

    // === ADDITIONAL INSIGHTS ===
    // Most popular city
    const cityStats = await Property.aggregate([
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    const popularCity = cityStats.length > 0 ? cityStats[0]._id : "N/A";

    // Average property price
    const priceStats = await Property.aggregate([
      { $group: { _id: null, avgPrice: { $avg: "$price" } } },
    ]);
    const avgPrice =
      priceStats.length > 0 ? Math.round(priceStats[0].avgPrice) : 0;

    // Most common BHK
    const bhkStats = await Property.aggregate([
      { $group: { _id: "$bhk", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    const popularBHK = bhkStats.length > 0 ? bhkStats[0]._id : "N/A";

    res.status(200).json({
      success: true,
      stats: {
        properties: {
          total: totalProperties,
          thisMonth: propertiesThisMonth,
          lastMonth: propertiesLastMonth,
          growth: parseFloat(propertiesGrowth),
          active: activeListings,
        },
        enquiries: {
          total: totalEnquiries,
          thisMonth: enquiriesThisMonth,
          lastMonth: enquiriesLastMonth,
          growth: parseFloat(enquiriesGrowth),
          pending: pendingEnquiries,
          handled: handledEnquiries,
        },
        insights: {
          popularCity,
          avgPrice,
          popularBHK,
        },
      },
    });
  } catch (error) {
    console.error("❌ Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

module.exports = exports;
