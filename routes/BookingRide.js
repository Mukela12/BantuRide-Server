import express from "express";
import { PassagerBookingRequest, GetDriverRequests } from "../controllers/BookingController";

const router = express.Router();

// Route to book a ride
router.post("/BookRequest", PassagerBookingRequest);

router.get("/GetRideRequest", GetDriverRequests);

export default router;
