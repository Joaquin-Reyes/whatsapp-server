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
// FIREBASE ADMIN (Railway)
// ==============================

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


// ==============================
// FUNCIÓN REUTILIZABLE WHATSAPP
// ==============================

async function enviarWhatsApp(telefono) {

  try {

    let numero = telefono.replace(/\D/g, "");

    if (numero.startsWith("549")) {
      numero = "54" + numero.substring(3);
    }

    console.log("📨 Enviando WhatsApp a:", numero);

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: numero,
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US"
          }
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
// ENDPOINT ENVÍO MANUAL
// ==============================

app.post("/enviar", async (req, res) => {

  const { telefono } = req.body;

  try {

    await enviarWhatsApp(telefono);

    res.send("Mensaje enviado");

  } catch (error) {

    console.error(error);
    res.status(500).send("Error enviando WhatsApp");

  }

});


// ==============================
// REVISAR TURNOS AUTOMÁTICOS
// ==============================

async function revisarTurnos() {

  console.log("⏰ Revisando turnos...");

  const ahora = new Date();
  const ahoraMs = ahora.getTime();

  try {

    const snapshot = await db.collection("turnos").get();

    for (const doc of snapshot.docs) {

      const turno = doc.data();

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

        console.log("📩 Enviando recordatorio prueba:", turno.cliente);

        await enviarWhatsApp(turno.telefono);

        await doc.ref.update({
          recordatorio24h: true
        });

      }

    }

  } catch (error) {

    console.error("❌ Error revisando turnos:", error);

  }

}


// ==============================
// CRON JOB
// ==============================

cron.schedule("*/1 * * * *", () => {

  revisarTurnos();

});


// ==============================
// SERVIDOR
// ==============================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log("🚀 Servidor WhatsApp iniciado en puerto", PORT);

});