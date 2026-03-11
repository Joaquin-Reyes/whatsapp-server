const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

let qrCode = "";
let estado = "desconectado";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  }
});

client.on("qr", async (qr) => {

  console.log("📱 Nuevo QR generado");

  qrCode = await qrcode.toDataURL(qr);

  estado = "qr";

});

client.on("ready", () => {

  console.log("✅ WhatsApp conectado");

  estado = "conectado";

});

client.on("disconnected", () => {

  console.log("❌ WhatsApp desconectado");

  estado = "desconectado";

});

client.initialize();


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


// RECONEXIÓN MANUAL
app.get("/reconectar", async (req, res) => {

  try {

    console.log("🔄 Reconectando WhatsApp...");

    await client.destroy();

    estado = "reconectando";

    await client.initialize();

    res.send("Reconectando WhatsApp");

  } catch (error) {

    console.log(error);

    res.status(500).send("Error reconectando");

  }

});


// ENVIAR MENSAJE
app.post("/enviar", async (req, res) => {

  const { telefono, mensaje } = req.body;

  try {

    console.log("📨 Enviando mensaje a:", telefono);

    await client.sendMessage(telefono + "@c.us", mensaje);

    res.send("Mensaje enviado");

  } catch (error) {

    console.error("❌ Error enviando mensaje:", error);

    res.status(500).send("Error enviando mensaje");

  }

});


const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log("🚀 Servidor WhatsApp corriendo en puerto " + PORT);

});