require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Tidak perlu 'form-data' lagi

const { createStoryPrompt, createImageToImagePrompt } = require('./prompt-engine.js');

// --- Inisialisasi Klien AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// --- Konfigurasi Stability AI ---
const stabilityApiKey = process.env.STABILITY_API_KEY;
const stabilityEngineId = 'stable-diffusion-xl-1024-v1-0';
const stabilityApiHost = 'https://api.stability.ai';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: 'Terlalu banyak permintaan...' } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// --- Endpoint API ---
app.post('/api/generate-creative', apiLimiter, upload.single('image'), async (req, res) => {
    try {
        const { title, categories, stylePrompt } = req.body;
        const imageFile = req.file;

        if (!title || !imageFile || !stylePrompt) {
            return res.status(400).json({ error: 'Judul, foto, dan instruksi gaya wajib diisi.' });
        }

        // === LANGKAH 1: GENERATE GAMBAR BARU DENGAN STABILITY AI (IMAGE-TO-IMAGE) ===
        console.log("Mempersiapkan data untuk Stability AI (Image-to-Image)...");

        // Menggunakan FormData bawaan Node.js
        const formData = new FormData();
        
        // Mengubah buffer menjadi Blob, yang lebih standar untuk FormData
        const imageBlob = new Blob([imageFile.buffer], { type: imageFile.mimetype });
        formData.append('init_image', imageBlob, 'init_image.png');
        
        const imagePrompt = createImageToImagePrompt(stylePrompt);
        formData.append('text_prompts[0][text]', imagePrompt);
        
        formData.append('init_image_mode', 'IMAGE_STRENGTH');
        formData.append('image_strength', '0.35'); // Kirim sebagai string, lebih aman
        formData.append('cfg_scale', '7');
        formData.append('samples', '1');
        formData.append('steps', '30');

        console.log("Meminta gambar baru dari Stability AI...");
        const apiUrl = `${stabilityApiHost}/v1/generation/${stabilityEngineId}/image-to-image`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            // !!! KUNCI PERBAIKAN: JANGAN SET HEADER CONTENT-TYPE MANUAL !!!
            // fetch akan otomatis mengaturnya dengan boundary yang benar saat body adalah FormData
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${stabilityApiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error dari Stability AI:", errorBody);
            throw new Error(`Non-200 response dari Stability AI: ${response.status}`);
        }

        const responseJSON = await response.json();
        const newImageBase64 = responseJSON.artifacts[0].base64;
        const newImageBuffer = Buffer.from(newImageBase64, 'base64');
        const newImageUrlForDisplay = `data:image/png;base64,${newImageBase64}`;
        console.log("Gambar baru berhasil dibuat.");

        // === LANGKAH 2 & 3 (Tetap Sama) ===
        console.log("Meminta caption dari Gemini...");
        const imagePart = { inlineData: { data: newImageBuffer.toString("base64"), mimeType: 'image/png' } };
        const parsedCategories = JSON.parse(categories);
        const captionPrompt = createStoryPrompt(title, parsedCategories);
        const result = await geminiModel.generateContent([captionPrompt, imagePart]);
        const geminiResponse = await result.response;
        const newCaption = geminiResponse.text();
        console.log("Caption berhasil dibuat.");

        res.json({ newImageUrl: newImageUrlForDisplay, newCaption: newCaption });

    } catch (error) {
        console.error("Error dalam proses kreatif:", error);
        res.status(500).json({ error: 'Gagal dalam proses kreatif AI. Cek log server untuk detail.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});