const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

// ==============================
// CORS + PREFLIGHT
// ==============================

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(cors());
app.use(express.json());

// ==============================
// VARIABLES WHATSAPP
// ==============================

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ==============================
// FIREBASE ADMIN
// ==============================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT no configurado");
  process.exit(1);
}

let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error("❌ Error leyendo FIREBASE_SERVICE_ACCOUNT:", error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("🔥 Firebase conectado");

// ==============================
// ESCUCHAR TURNOS NUEVOS
// ==============================

db.collection("turnos").onSnapshot(async (snapshot) => {

  for (const change of snapshot.docChanges()) {

    if (change.type === "added") {

      const turno = change.doc.data();

      console.log("📦 Turno detectado:", turno);

      if (!turno.telefono || turno.whatsappEnviado) return;

      const mensaje = `Hola ${turno.cliente} 😊
Tu turno fue confirmado.

📅 Fecha: ${turno.fecha}
⏰ Hora: ${turno.hora}
💅 Servicio: ${turno.servicio}

Te esperamos 💗`;

      try {

        await enviarWhatsApp(turno.telefono, mensaje);

        await change.doc.ref.update({
          whatsappEnviado: true
        });

        console.log("📩 WhatsApp automático enviado");

      } catch (error) {

        console.error("❌ Error enviando WhatsApp automático", error);

      }

    }

  }

});

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

    throw error;
  }

}

// ==============================
// ENDPOINT PARA TEST MANUAL
// ==============================

app.post("/enviar", async (req, res) => {

  const { telefono, mensaje } = req.body;

  console.log("📩 Petición recibida");
  console.log("Telefono:", telefono);
  console.log("Mensaje:", mensaje);

  try {

    await enviarWhatsApp(telefono, mensaje);

    return res.json({
      status: "ok",
      message: "Mensaje enviado"
    });

  } catch (error) {

    console.error("❌ Error endpoint:", error);

    return res.status(500).json({
      status: "error",
      message: "Error enviando WhatsApp"
    });

  }

});

// ==============================
// SERVER
// ==============================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log("🚀 Servidor iniciado en puerto", PORT);

});