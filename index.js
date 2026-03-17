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

const TOKEN = "EAAhJTuhZBjOQBQz0iVynWNvnzAUzypJaidDUaWvZBwfCcrYuNDNnaBNiAp6YoU8lMA1IrFYv95sgDB5MYQ9hhHPXpNfexn5xFViqX1L3ToJn3gqcN1k0owR4PCZCUNidbNLB7146S0cl2JJizG1xkA6A2P71trZAH863wCqGELS0S0qZADqP3pujuCMmOQK19PkmZCUIeXU8DtxA1DIPXMQtS39O5Dod7eDrRqULpi8R6Kf3ZAggeA7uc03nTbWvLChuAy15ZAdpIbrroRqEfZCyx";
const PHONE_NUMBER_ID = "996052293598272";

console.log("🔑 TOKEN manual cargado");
console.log("📱 PHONE_NUMBER_ID:", PHONE_NUMBER_ID);

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

      if (!turno.createdAt) {
        continue;
      }

      if (!turno.telefono || turno.whatsappEnviado) {
        continue;
      }

      const mensaje = `Hola ${turno.cliente || ""} 😊
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

    let numero = telefono.toString().replace(/\D/g, "");

    // formato argentino WhatsApp
    if (!numero.startsWith("549")) {

      if (numero.startsWith("11")) {
        numero = "549" + numero;
      }

      if (numero.startsWith("15")) {
        numero = "54911" + numero.slice(2);
      }

    }

    console.log("📨 Enviando WhatsApp a:", numero);

    const response = await axios.post(
  `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
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