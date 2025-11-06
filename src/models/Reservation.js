import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  terrace: { type: mongoose.Schema.Types.ObjectId, ref: "Terrace", required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String }, // opcional
  status: {
    type: String,
    enum: ["pendiente", "confirmada", "rechazada"],
    default: "pendiente",
  },
  paymentStatus: {
    type: String,
    enum: ["sin pagar", "pagado"],
    default: "sin pagar",
  },
}, { timestamps: true });

export default mongoose.model("Reservation", reservationSchema);
