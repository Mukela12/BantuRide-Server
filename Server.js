// import dependencies
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import bodyParser from 'body-parser';

import connectDB from "./config/db.js";

import userRoute from "./routes/AuthRoute.js";
import Rides from "./routes/BookingRide.js";

// configure dotenv
dotenv.config();

// connect to database
connectDB();

// set up server application
const app = express();
const PORT = 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(bodyParser.urlencoded({ extended: true }));

// routes
app.use("/auth", userRoute);
app.use("/bookride", Rides);


// run server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})



