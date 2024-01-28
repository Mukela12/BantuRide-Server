import jwt from "jsonwebtoken";
import otplib from "otplib";
import nodemailer from "nodemailer";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import { userModel } from "../models/UserModel.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.USER,
        pass: process.env.PASS,
    },
});

const generateHOTP = (secret, counter) => {
    return otplib.hotp.generate(secret, counter);
};

const registerController = async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        // Generate a random counter value (you may need to store and increment this for each user)
        const counter = Math.floor(100000 + Math.random() * 900000);

        // Generate HOTP
        const otp = generateHOTP(process.env.SECRET, counter);

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(500).send({
                success: false,
                message: 'User Already Registered With This Email',
            });
        }

        // Validation
        if (!firstname || !lastname) {
            return res.status(400).send({
                success: false,
                message: 'Name is required',
            });
        }
        if (!email) {
            return res.status(400).send({
                success: false,
                message: 'Email is required',
            });
        }
        if (!password || password.length < 6) {
            return res.status(400).send({
                success: false,
                message: 'Password is required and should be 6 characters long',
            });
        }

        // Hashed password
        const hashedPassword = await hashPassword(password);

        // Save user
        const user = await userModel({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            otp, // Save OTP to the user model
        }).save();

        // Sending verification email
        console.log('Sending verification email to:', email);
        await transporter.sendMail({
            from: 'breakoutmediaagency@gmail.com',
            to: email,
            subject: 'Account Verification',
            text: `Your OTP for account verification is: ${otp}`,
        });

        console.log('Verification email sent successfully.');

        // Send success response
        return res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for verification.',
            user,
        });
    } catch (error) {
        console.error('Error in Register API:', error);

        // Handle specific errors
        if (error.code === 'ERR_HTTP_HEADERS_SENT') {
            return; // Avoid sending headers multiple times
        }

        // Send error response
        return res.status(500).json({
            success: false,
            message: 'Error in Register API',
            error: error.message || error,
        });
    }
};

const verifyOTP = async (req, res) => {
    const { email, enteredOTP } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (!user)
            return res.json({
                success: false,
                message: `User not found with the given email: ${email}`,
            });

        if (user.otp !== enteredOTP) {
            return res.json({
                success: false,
                message: 'Entered OTP does not match!',
            });
        }

        // Clear the OTP from the database after successful verification
        await userModel.findByIdAndUpdate(user._id, { otp: null });

        res.json({ success: true, message: 'OTP verified successfully!' });
    } catch (error) {
        console.error('Error during OTP verification:', error);
        console.error('Axios response:', error.response); // Add this line
        res.json({ success: false, message: 'Error during OTP verification' });
    }
};

const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validation
        if (!email || !password) {
            return res.status(500).send({
                success: false,
                message: "Please Provide Email Or Password",
            });
        }

        // find user
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(500).send({
                success: false,
                message: "User Not Found",
            });
        }

        // match password
        const match = await comparePassword(password, user.password);

        if (!match) {
            return res.status(500).send({
                success: false,
                message: "Invalid email or password",
            });
        }

        // TOKEN JWT
        const token = await jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        // undefined password
        user.password = undefined;

        res.status(200).send({
            success: true,
            message: "Login successful",
            token,
            user,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: "Error in login API",
            error,
        });
    }
}

const updateUserController = async (req, res) => {
    try {
        const { firstname, lastname, password, email } = req.body;

        // user find
        const user = await userModel.findOne({ email });

        // password validate
        if (password && password.length < 6) {
            return res.status(400).send({
                success: false,
                message: "Password is required and should be 6 characters long",
            });
        }

        const hashedPassword = password ? await hashPassword(password) : undefined;

        // updated user
        const updatedUser = await userModel.findOneAndUpdate(
            { email },
            {
                firstname: firstname || user.firstname,
                lastname: lastname || user.lastname,
                password: hashedPassword || user.password,
            },
            { new: true }
        );

        updatedUser.password = undefined;

        res.status(200).send({
            success: true,
            message: "Profile Updated. Please Login",
            updatedUser,
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "Error In User Update API",
            error,
        });
    }
}

export {
    registerController,
    loginController,
    updateUserController,
    verifyOTP
};
