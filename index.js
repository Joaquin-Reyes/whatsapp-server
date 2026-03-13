const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");
const cron = require("node-cron");

const app = express();

app.use(cors());
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ==============================
// FIREBASE ADMIN
// ==============================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT no configurado");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("🔥 Firebase conectado");

// ==============================
// ENDPOINT TEST
// ==============================

app.get("/", (req, res) => {
  res.send("Servidor WhatsApp funcionando 🚀");
});

// ==============================
// FUNCIÓN WHATSAPP
// ==============================

async function enviarWhatsApp(telefono, mensaje) {

  if (!TOKEN || !PHONE_NUMBER_ID) {
    console.error("❌ Falta WHATSAPP_TOKEN o PHONE_NUMBER_ID");
    return;
  }

  try {

    if (!telefono) {
      console.log("⚠️ Teléfono vacío");
      return;
    }

    const numero = telefono.toString().replace(/\D/g, "");

    console.log("📨 Enviando WhatsApp a:", numero);

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: {
          body: mensaje
        }
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Mensaje enviado:", response.data);

  } catch (error) {

    console.error(
      "❌ Error enviando WhatsApp:",
      error.response?.data || error.message
    );

  }
}

// ==============================
// ENDPOINT PARA FRONTEND
// ==============================

app.post("/enviar", async (req, res) => {

  const { telefono, mensaje } = req.body;

  console.log("📩 Petición recibida");
  console.log("Telefono:", telefono);
  console.log("Mensaje:", mensaje);

  try {

    await enviarWhatsApp(telefono, mensaje);

    res.send("Mensaje enviado");

  } catch (error) {

    console.error(error);
    res.status(500).send("Error enviando WhatsApp");

  }

});

// ==============================
// SISTEMA DE RECORDATORIOS
// (DESACTIVADO TEMPORALMENTE)
// ==============================

async function revisarTurnos() {

  console.log("⏰ Revisando turnos...");

  const ahora = new Date();
  const ahoraMs = ahora.getTime();

  try {

    const snapshot = await db.collection("turnos").get();

    for (const docItem of snapshot.docs) {

      const turno = docItem.data();

      if (!turno.telefono || !turno.cliente || !turno.createdAt) {
        continue;
      }

      const createdAt = turno.createdAt.toDate
        ? turno.createdAt.toDate()
        : new Date(turno.createdAt);

      const turnoMs = createdAt.getTime();

      const diff = ahoraMs - turnoMs;
      const minutos = diff / (1000 * 60);

      console.log("Turno:", turno.cliente);
      console.log("Minutos desde creación:", minutos);

      if (minutos >= 2 && !turno.recordatorio24h) {

        console.log("📩 Enviando recordatorio:", turno.cliente);

        const mensaje = `Hola ${turno.cliente} 😊
Recordatorio de tu turno en Beauty Eyes.

📅 Fecha: ${turno.fecha}
⏰ Hora: ${turno.hora}

Te esperamos 💗`;

        await enviarWhatsApp(turno.telefono, mensaje);

        await docItem.ref.update({
          recordatorio24h: true
        });

      }

    }

  } catch (error) {

    console.error("❌ Error revisando turnos:", error);

  }
}

// ==============================
// CRON DESACTIVADO
// ==============================

// cron.schedule("*/1 * * * *", async () => {

//   try {

//     await revisarTurnos();

//   } catch (error) {

//     console.error("Error en cron:", error);

//   }

// });

// ==============================
// SERVER
// ==============================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log("🚀 Servidor iniciado en puerto", PORT);

});