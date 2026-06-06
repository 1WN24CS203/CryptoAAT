import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    dob: {
      type: String,
      required: [true, 'Date of birth is required'],
      trim: true,
    },
    collegeName: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
    },
    favoriteWord: {
      type: String,
      required: [true, 'Favorite word is required'],
      trim: true,
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpires: {
      type: Date,
      default: null,
    },
    passwordMd5Crypt: {
      type: String,
      default: null,
    },
    // Cache the password analysis on creation/update
    passwordScore: {
      type: Number,
      default: 0,
    },
    passwordStatus: {
      type: String,
      default: 'Weak',
    },
    passwordReasons: {
      type: [String],
      default: [],
    },
    passwordRecommendations: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
