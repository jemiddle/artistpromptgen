import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import Stripe from 'stripe';
import { Configuration, OpenAIApi } from "openai";

// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serves index.html, login.html, etc.

// Debug log
console.log("STRIPE KEY:", process.env.STRIPE_SECRET_KEY);

// === ROUTES ===

// Generate AI Prompt
app.post("/generate-prompt", async (req, res) => {
  const { artist, mood, tempo, gender } = req.body;

  const prompt = `Generate a concise detailed prompt with fewer than 1000 characters that captures the unique sound and stylistic elements of ${artist}. The track should have a ${mood} mood, ${tempo} tempo, and feature ${gender} vocals. Focus on vibe, tone, and genre influences. Do NOT include a song title or lyrics. Do NOT mention the artist’s name. The goal is to inspire an AI music generator like Suno or Riffusion. Make the prompt immersive, rich in details, and concise, no more than 1000 characters.`;

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const result = completion.data.choices[0].message.content;
    res.json({ result });
  } catch (err) {
    console.error("OpenAI Error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "Failed to generate prompt" });
  }
});

// Stripe Checkout Session
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Artist Prompt Generator Access",
            },
            unit_amount: 500,
          },
          quantity: 1,
        },
      ],
      success_url: "http://localhost:3000/index.html",
      cancel_url: "http://localhost:3000/cancel.html",
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("Stripe Checkout Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
