import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    password: { type: String, required: true },

    // 📱 Teléfono opcional (lo puede agregar después)
    phone: { type: String },

    // 👤 Rol del usuario
    role: {
      type: String,
      enum: ["client", "host", "admin"],
      default: "client",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
