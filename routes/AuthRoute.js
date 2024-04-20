import express from "express";
import {
    registerController,
    loginController,
    updateUserController,
    verifyOTP
} from "../controllers/UserController.js";

import multer from 'multer';
const upload = multer();

const router = express.Router();

router.post("/create-user",upload.none(), registerController);

router.put("/update-user", updateUserController);

router.post("/verify-otp", verifyOTP);


// Using multer

// For handling multipart/form-data
// Here, 'none()' is used because you're not expecting files, just text fields.

router.post("/signin", upload.none(), loginController);

export default router;