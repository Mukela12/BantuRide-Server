import jwt from "jsonwebtoken";
import otplib from "otplib";
import nodemailer from "nodemailer";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import { userModel } from "../models/UserModel.js";
import dotenv from "dotenv";
dotenv.config();


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
    },
});

const generateHOTP = (secret, counter) => {
    return otplib.hotp.generate(secret, counter);
};

const registerController = async (req, res) => {
    try {
        const { firstname, lastname, email, password } = req.body;

        const counter = Math.floor(100000 + Math.random() * 900000);
        const otp = generateHOTP(process.env.SECRET, counter);
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            return res.status(500).send({
                success: false,
                message: 'User Already Registered With This Email',
            });
        }

        if (!firstname || !lastname || !email) {
            return res.status(400).send({
                success: false,
                message: 'All fields (firstname, lastname, email) are required',
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).send({
                success: false,
                message: 'Password is required and should be at least 6 characters long',
            });
        }

        const hashedPassword = await hashPassword(password);

        const user = new userModel({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            otp
        });

        await user.save();


        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'Account Verification',
            text: `Your OTP for account verification is: ${otp}`,
        });

        console.log('Verification email sent successfully.');

        return res.status(201).json({
            success: true,
            message: 'Registration successful. Please check your email for verification.',
            user,
        });
    } catch (error) {
        console.error('Error in Register API:', error);
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

        if (!user) {
            return res.json({
                success: false,
                message: `User not found with the given email: ${email}`,
            });
        }

        if (user.otp !== enteredOTP) {
            return res.json({
                success: false,
                message: 'Entered OTP does not match!',
            });
        }

        await userModel.findByIdAndUpdate(user._id, { otp: null });
        res.json({ success: true, message: 'OTP verified successfully!' });
    } catch (error) {
        console.error('Error during OTP verification:', error);
        res.json({ success: false, message: 'Error during OTP verification' });
    }
};

const loginController = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).send({
                success: false,
                message: "User Not Found",
            });
        }

        const match = await comparePassword(password, user.password);

        if (!match) {
            return res.status(401).send({
                success: false,
                message: "Invalid email or password",
            });
        }

        
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        user.password = undefined; // Exclude password from output

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user,
        });
    } catch (error) {
        console.error('Error in login API:', error);
        return res.status(500).send({
            success: false,
            message: "Error in login API",
            error,
        });
    }
};

const updateUserController = async (req, res) => {
    const { firstname, lastname, password, email } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (password && password.length < 6) {
            return res.status(400).send({
                success: false,
                message: "Password is required and should be 6 characters long",
            });
        }

        const hashedPassword = password ? await hashPassword(password) : undefined;
        const updatedUser = await userModel.findOneAndUpdate(
            { email },
            {
                firstname: firstname || user.firstname,
                lastname: lastname || user.lastname,
                password: hashedPassword || user.password,
            },
            { new: true }
        );

        updatedUser.password = undefined; // Exclude password from output
        res.status(200).send({
            success: true,
            message: "Profile Updated. Please Login",
            updatedUser,
        });
    } catch (error) {
        console.error('Error In User Update API:', error);
        res.status(500).send({
            success: false,
            message: "Error In User Update API",
            error,
        });
    }
};

export {
    registerController,
    loginController,
    updateUserController,
    verifyOTP
};
