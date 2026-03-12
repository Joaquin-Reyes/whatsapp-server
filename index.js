const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const TOKEN = "TU_TOKEN_META";
const PHONE_NUMBER_ID = "TU_PHONE_ID";

app.post("/enviar", async (req, res) => {

  const { telefono, mensaje } = req.body;

  try {

    console.log("📨 Enviando WhatsApp a:", telefono);

    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: telefono,
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

    console.log("✅ Mensaje enviado");

    res.send("Mensaje enviado");

  } catch (error) {

    console.error("❌ Error enviando mensaje:",
      error.response?.data || error.message
    );

    res.status(500).send("Error enviando WhatsApp");

  }

});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {

  console.log("🚀 Servidor WhatsApp iniciado en puerto", PORT);

});