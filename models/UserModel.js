import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: String,
  tokens: [{ type: Object }],
  otp: String,
  role: {
    type: String,
    default: "user",
  },
  location: {
    type: {
      type: String,
      default: "Point", // GeoJSON point
    },
    coordinates: {
      type: [Number],
      default: [0, 0], // Default to (0, 0) if no location provided
    },
  },
  isDriver: {
    type: Boolean,
    default: false,
  },
  driverStatus: {
    type: String,
    enum: ["available", "unavailable"],
    default: "unavailable",
  },
  ratings: [
    {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Static method to check if an email is already in use
userSchema.statics.isEmailInUse = async function (email) {
  if (!email) throw new Error('Invalid Email');
  try {
    const user = await this.findOne({ email });
    return !user; // Returns true if the email is not in use, false otherwise
  } catch (error) {
    console.error('Error inside isEmailInUse method', error.message);
    return false;
  }
};

export const userModel = mongoose.model('User', userSchema);