import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

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
        apiKey: !!process.env.AI_API_KEY
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});