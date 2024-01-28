import express from "express";
import { PassagerBookingRequest, GetRideRequests, DriverConfirmation, BookingUpdate, CancelBooking } from "../controllers/BookRideController.js";

const router = express.Router();

// Route to book a ride
router.post("/BookRequest", PassagerBookingRequest);
router.post("/Confirm", DriverConfirmation);
router.get("/GetRideRequest", GetRideRequests);
router.get("/RideUpdate", BookingUpdate);
router.post("/cancelride", CancelBooking);


export default router;
