import Reservation from "../models/Reservation.js";

export async function createReservation(req, res) {
  const { terrace, date, timeSlot } = req.body;
  const client = req.userId;

  try {
    const reservation = new Reservation({ client, terrace, date, timeSlot });
    await reservation.save();
    res.status(201).json({ message: "Reserva creada", reservation });
  } catch (e) {
    res.status(500).json({ message: "Error al crear la reserva" });
  }
}

export async function confirmReservation(req, res) {
  const { id } = req.params;
  try {
    const reservation = await Reservation.findByIdAndUpdate(id, {
      status: "confirmada",
      paymentStatus: "pagado",
    }, { new: true });
    res.json({ message: "Reserva confirmada", reservation });
  } catch (e) {
    res.status(500).json({ message: "Error al confirmar la reserva" });
  }
}
