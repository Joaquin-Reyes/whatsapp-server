const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let qrCode = "";
let estado = "desconectado";
let clienteListo = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    protocolTimeout: 120000,
    timeout: 120000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process"
    ]
  },
  webVersionCache: {
    type: "none"
  }
});

client.on("qr", async (qr) => {

  console.log("📱 Nuevo QR generado");

  qrCode = await qrcode.toDataURL(qr);
  estado = "qr";
  clienteListo = false;

});

client.on("ready", () => {

  console.log("✅ WhatsApp conectado");

  estado = "conectado";
  clienteListo = true;

});

client.on("disconnected", () => {

  console.log("❌ WhatsApp desconectado");

  estado = "desconectado";
  clienteListo = false;

});


// Inicializar con delay para evitar crash en Railway
setTimeout(() => {
  client.initialize();
}, 5000);


// VER QR
app.get("/qr", (req, res) => {

  if (!qrCode) {
    return res.send("QR todavía no generado...");
  }

  res.send(`
    <h2>Conectar WhatsApp - Beauty Eyes Pro</h2>
    <img src="${qrCode}" />
  `);

});


// ESTADO
app.get("/estado", (req, res) => {

  res.send({ estado });

});


// ENVIAR MENSAJE
app.post("/enviar", async (req, res) => {

  const { telefono, mensaje } = req.body;

  try {

    if (!clienteListo) {
      console.log("⚠️ WhatsApp todavía iniciando...");
      return res.status(500).send("WhatsApp todavía iniciando");
    }

    console.log("📨 Enviando mensaje a:", telefono);

    let numero = telefono.replace(/\D/g, "");

    if (!numero.startsWith("549")) {
      numero = "549" + numero;
    }

    const chatId = numero + "@c.us";

    console.log("📲 Chat ID:", chatId);

    await client.sendMessage(chatId, mensaje);

    console.log("✅ Mensaje enviado");

    res.send("Mensaje enviado");

  } catch (error) {

    console.error("❌ Error enviando mensaje:", error);

    res.status(500).send("Error enviando mensaje");

  }

});


// RECONEXIÓN
app.get("/reconectar", async (req, res) => {

  try {

    console.log("🔄 Reiniciando WhatsApp...");

    await client.destroy();

    setTimeout(() => {
      client.initialize();
    }, 5000);

    res.send("Reiniciando WhatsApp");

  } catch (error) {

    console.error("❌ Error reiniciando:", error);

    res.status(500).send("Error reiniciando");

  }

});


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log("🚀 Servidor WhatsApp corriendo en puerto " + PORT);

});