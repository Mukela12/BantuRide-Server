import Booking from "../models/BookRideModel.js";
import { userModel } from "../models/UserModel.js";


const PassagerBookingRequest = async (req, res) => {
  try {
    const { user, pickUpLocation, dropOffLocation, price } = req.body;

    // Check if user, pick-up, and drop-off locations are provided
    if (!user || !pickUpLocation || !dropOffLocation) {
      console.log(req.body);
      return res.status(400).json({
        success: false,
        message: "User, pick-up, and drop-off locations are required.",
        user: user,
        pickUpLocation: pickUpLocation,
        dropOffLocation: dropOffLocation,
      });
    }

    // Create a new booking
    const newBooking = new Booking({
      user,
      pickUpLocation,
      dropOffLocation,
      price,
    });

    // Save the booking to the database
    await newBooking.save();

    // Send a response
    return res.status(201).json({
      success: true,
      message: "Ride Request sent successfully.",
      booking: newBooking,
    });

  } catch (error) {
    console.error("Error in booking a ride:", error);
    return res.status(500).json({
      success: false,
      message: "Error in booking a ride.",
      error: error.message || error,
    });
  }
};


const GetRideRequests = async (req, res) => {
  const { Driver } = req.body;

  try {
    if (!Driver) {
      return res.status(500).send({
        success: false,
        message: "Driver not found",
      });
    }

    // Check driver availability before proceeding
    const driverInfo = await userModel.findById(Driver);
    if (!driverInfo || driverInfo.driverStatus !== "available") {
      return res.status(400).json({
        success: false,
        message: "Driver is currently unavailable for requests.",
      });
    }

    // Find nearby pending requests (consider adding an index on `status` and `pickUpLocation`)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000); // Adjust as needed
    const nearbyRequests = await Booking.find({
      status: "pending",
      pickUpLocation: {
        $geoWithin: {
          $centerSphere: [driverInfo.location.coordinates, 20 / 3963.2], // 20 miles
        },
      },
      createdAt: { $gte: oneMinuteAgo }, // Filter for recent requests
    })
      .sort({ date: -1 }); // Sort by newest first

    if (nearbyRequests.length > 0) {
      // Send available requests
      return res.status(200).json({
        success: true,
        message: "Available ride requests found!",
        requests: nearbyRequests,
      });
    } else {
      // Inform driver about no requests
      return res.status(200).json({
        success: true,
        message: "No available ride requests found at this time.",
      });
    }
  } catch (error) {
    console.error("Error in getting ride requests:", error);
    return res.status(500).json({
      success: false,
      message: "Error during getting ride requests.",
      error: error.message || error,
    });
  }
};




// This Module will wait for the Driver to confirm a Customer
// Flow:
// 1. Driver selects their prefered customer
// 2. POST request is sent to this module 
// 3. Module updates booking details with the Driver's information and information it received of user and booking details from previous request (GetRideRequests)
const DriverConfirmation = async (req, res) => {
  const { Driver, user, pickUpLocation, dropOffLocation } = req.body;

  try {
    if (!Driver || !user || !pickUpLocation || !dropOffLocation) {
      return res.status(400).json({ success: false, message: 'Missing data' });
    }

    // Find the exact pending booking that the driver is confirming
    const pendingBooking = await Booking.findOne({
      user,
      status: 'pending',
      pickUpLocation,
      dropOffLocation,
    });

    if (!pendingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Pending booking not found with the provided details.',
      });
    }

    // Update the booking with driver information and set status to 'confirmed'
    const confirmedBooking = await Booking.findOneAndUpdate(
      { _id: pendingBooking._id, status: 'pending' },
      { driver: Driver, status: 'confirmed' },
      { new: true } // Return the updated document
    );

    if (!confirmedBooking) {
      return res.status(500).json({
        success: false,
        message: 'Error confirming booking. Please try again.',
      });
    }

    return res.status(200).json({ success: true, message: 'Customer confirmed', booking: confirmedBooking });

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error during driver confirmation', error });
  }
};


// This Module will continously receive requests from the customer to check if a driver has accepted their request 
// Flow:
// 1. After Customer has already sent request a wait for driver confirmation begins 
// 2. Once a driver has confirmed with an update in the booking schema connected to the user
const BookingUpdate = async (req, res) => {
  const { user } = req.body;

  try {
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User is required for booking updates.",
      });
    }

    // Create a Change Stream on the Booking collection
    const bookingChangeStream = Booking.watch();

    // Listen for changes specific to the user and driver assignment
    bookingChangeStream.on('change', async (change) => {
      if (change.operationType === 'update' &&
          change.documentKey._id === user &&
          change.updateDescription.updatedFields.driver) {
        // Once the driver is assigned, send a response
        return res.status(200).json({
          success: true,
          message: "We found you a Driver!",
          user,
          driver: change.updateDescription.updatedFields.driver,
        });
      }
    });

  } catch (error) {
    console.error("Error in booking update:", error);
    return res.status(500).json({
      success: false,
      message: "Error in booking update.",
      error: error.message || error,
    });
  }
};



const CancelBooking = async (req, res) => {
  const { user } = req.body;

  try {
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User is required for cancelling a booking.",
      });
    }

    // Find the booking by user and update its status to 'cancelled'
    const canceledBooking = await Booking.findOneAndUpdate(
      { user, status: 'pending' }, // Only cancel 'pending' bookings
      { $set: { status: 'cancelled' } },
      { new: true } // Return the updated document
    );

    if (!canceledBooking) {
      return res.status(404).json({
        success: false,
        message: "No pending booking found for cancellation.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking: canceledBooking,
    });

  } catch (error) {
    console.error("Error in canceling a booking:", error);
    return res.status(500).json({
      success: false,
      message: "Error in canceling a booking.",
      error: error.message || error,
    });
  }
};

export { PassagerBookingRequest, GetRideRequests, DriverConfirmation, BookingUpdate, CancelBooking };

