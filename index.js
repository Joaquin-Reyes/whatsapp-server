const express = require("express");
const axios = require("axios");
const cors = require("cors");

const admin = require("firebase-admin");
const cron = require("node-cron");

const app = express();

app.use(cors());
app.use(express.json());

const TOKEN = "EAAhJTuhZBjOQBQwZBXHXnu5iuMULM29aMq1uvZAdIj5QaALEcNpTJ5T9msSSDHzySnrXZAk9chjn4SEBfNEyB8KuwHG36uFxydxrImL3jGD4j6ZB7ZAswM6bg1AmQ8eAj0YzTrYy7ecM8ofZC0kZBy6B477OHLOe0QNL9Ediq4DSAz9XbGHwBFrU4h5JsOJQkzV6ZClUA5WhZBD2FGCFnw112cPKw1ukYa5LV1f8LlUfjC7Mz1LRSB7XWrCthWygz6AQPJYbqVqX3Y83R32XeofXFk";

const PHONE_NUMBER_ID = "996052293598272";


// ==============================
// FIREBASE ADMIN
// ==============================

admin.initializeApp({
  credential: admin.credential.applicationDefault()
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

    // RECORDATORIO PRUEBA A LOS 2 MINUTOS

    if (minutos >= 2 && !turno.recordatorio24h) {

      console.log("📩 Enviando recordatorio prueba:", turno.cliente);

      await enviarWhatsApp(turno.telefono);

      await doc.ref.update({
        recordatorio24h: true
      });

    }

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