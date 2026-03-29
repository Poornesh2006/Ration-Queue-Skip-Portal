import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    deviceName: {
      type: String,
      default: "",
      trim: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rationCardNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      alias: "aadhaar_number",
      validate: {
        validator: (value) => !value || /^\d{12}$/.test(value),
        message: "Aadhaar number must be 12 digits",
      },
    },
    familyMembers: {
      type: Number,
      required: true,
      min: 1,
    },
    age: {
      type: Number,
      default: 18,
      min: 0,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    emergencyAccess: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      alias: "phone_number",
      validate: {
        validator: (value) => /^\d{10}$/.test(value),
        message: "Phone number must be 10 digits",
      },
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    village: {
      type: String,
      default: "",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    cardType: {
      type: String,
      enum: ["PHH", "NPHH", "AAY"],
      default: "NPHH",
    },
    profileImage: {
      type: String,
      default: "/images/misc/user1.png",
    },
    faceImage: {
      type: String,
      default: "",
      trim: true,
      alias: "face_image",
    },
    password: {
      type: String,
      required() {
        return this.role === "admin" || this.role === "shop_owner";
      },
      minlength: 6,
      select: false,
      default: null,
    },
    otpCode: {
      type: String,
      default: null,
      select: false,
      alias: "otp",
    },
    otpExpiry: {
      type: Date,
      default: null,
      select: false,
      alias: "otp_expiry",
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    devices: {
      type: [deviceSchema],
      default: [],
    },
    role: {
      type: String,
      enum: ["admin", "user", "shop_owner"],
      default: "user",
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual("priorityCategory").get(function getPriorityCategory() {
  if (this.emergencyAccess) {
    return "emergency";
  }

  if (this.isDisabled) {
    return "disabled";
  }

  if (this.age >= 60) {
    return "elderly";
  }

  return "standard";
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

userSchema.pre("save", async function savePassword(next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function matchPassword(candidatePassword) {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
