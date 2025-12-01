const Enquiry = require('../models/Enquiry');
const Property = require('../models/Property');

/**
 * @desc    Submit new enquiry
 * @route   POST /api/enquiries
 * @access  Public
 */
const createEnquiry = async (req, res, next) => {
  try {
    const { name, email, phone, message, propertyId } = req.body;

    // Validation
    if (!name || !email || !phone || !message) {
      res.status(400);
      throw new Error('Please provide all required fields');
    }

    // If propertyId is provided, check if property exists
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (!property) {
        res.status(404);
        throw new Error('Property not found');
      }
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      res.status(400);
      throw new Error('Please provide a valid 10-digit phone number');
    }

    // Create enquiry
    const enquiry = await Enquiry.create({
      name,
      email,
      phone,
      message,
      propertyId: propertyId || null
    });

    // Populate property details if exists
    if (propertyId) {
      await enquiry.populate('propertyId', 'title price city address');
    }

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will contact you soon!',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all enquiries with filtering
 * @route   GET /api/enquiries/all
 * @access  Private (Admin only)
 */
const getAllEnquiries = async (req, res, next) => {
  try {
    const { status } = req.query;

    // Build query
    let query = {};
    if (status && ['pending', 'handled'].includes(status)) {
      query.status = status;
    }

    const enquiries = await Enquiry.find(query)
      .populate('propertyId', 'title price city address images')
      .populate('adminNotes.admin', 'name email')
      .sort({ createdAt: -1 });

    const total = await Enquiry.countDocuments();
    const pending = await Enquiry.countDocuments({ status: 'pending' });
    const handled = await Enquiry.countDocuments({ status: 'handled' });

    res.json({
      success: true,
      count: enquiries.length,
      stats: {
        total,
        pending,
        handled
      },
      data: enquiries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add an admin note to an enquiry
 * @route   PUT /api/enquiries/:id/notes
 * @access  Private (Admin only)
 */
const addEnquiryNote = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400);
      throw new Error('Please provide a non-empty note text');
    }

    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    enquiry.adminNotes = enquiry.adminNotes || [];
    enquiry.adminNotes.push({ text: text.trim(), admin: req.admin._id });
    await enquiry.save();

    // Populate for response (use single populate call on the document)
    const populated = await enquiry.populate([
      { path: 'propertyId', select: 'title price city address' },
      { path: 'adminNotes.admin', select: 'name email' }
    ]);

    res.json({ success: true, message: 'Note added', data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update enquiry status
 * @route   PUT /api/enquiries/:id
 * @access  Private (Admin only)
 */
const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'handled'].includes(status)) {
      res.status(400);
      throw new Error('Please provide a valid status (pending or handled)');
    }

    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    enquiry.status = status;
    await enquiry.save();

    await enquiry.populate('propertyId', 'title price city address');

    res.json({
      success: true,
      message: 'Enquiry status updated successfully',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete enquiry
 * @route   DELETE /api/enquiries/:id
 * @access  Private (Admin only)
 */
const deleteEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404);
      throw new Error('Enquiry not found');
    }

    await enquiry.deleteOne();

    res.json({
      success: true,
      message: 'Enquiry deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent enquiries (last 5)
 * @route   GET /api/enquiries/recent
 * @access  Private (Admin only)
 */
const getRecentEnquiries = async (req, res, next) => {
  try {
    const enquiries = await Enquiry.find()
      .populate('propertyId', 'title price city')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnquiry,
  getAllEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
  getRecentEnquiries
};
module.exports.addEnquiryNote = addEnquiryNote;