import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Successfully connected to Database.")
    } catch (error) {
        console.log(`Error connnecting to Database: ${error}`);
    }
}

export default connectDB;