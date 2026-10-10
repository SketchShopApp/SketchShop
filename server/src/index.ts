import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'dotenv/config';
dotenv.config();
import { generateDrawingScene } from './gemini.js';


const app = express();
const port = process.env.PORT;

app.use(cors({
    origin:['http://localhost:5173', 'http://127.0.0.1:5173']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Backend SketchShop est en ligne',
        apiKey: !!process.env.GEMINI_API_KEY
    });
});

// Route principale : reçoit le prompt utilisateur et renvoie les instructions de dessin
app.post('/api/chat-to-canvas', async (req, res) => {
  try {
    const { prompt, canvasWidth, canvasHeight } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Le champ "prompt" est requis et doit être une chaîne de caractères.'
      });
    }

    console.log(`Génération demandée pour le prompt : "${prompt}"`);

    // Appel sécurisé à Gemini via notre service
    const scene = await generateDrawingScene(
      prompt,
      canvasWidth || 800,
      canvasHeight || 600
    );

    res.json({
      success: true,
      scene
    });
  } catch (error: any) {
    console.error('Erreur lors de la génération de la scène :', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Une erreur est survenue lors de la génération.'
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});