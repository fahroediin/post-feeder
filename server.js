require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');

const { createStoryPrompt, createImageToImagePrompt } = require('./prompt-engine.js');

// --- Inisialisasi & Konfigurasi ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
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

        // Langkah Resize Gambar
        console.log("Mengubah ukuran gambar agar sesuai dengan dimensi yang diizinkan...");
        const resizedImageBuffer = await sharp(imageFile.buffer)
            .resize({
                width: 1024,
                height: 1024,
                fit: 'cover',
                position: 'center'
            })
            .toFormat('png')
            .toBuffer();
        console.log("Gambar berhasil diubah ukurannya menjadi 1024x1024.");

        // Langkah 1: Generate Gambar Baru dengan Stability AI (Image-to-Image)
        console.log("Mempersiapkan data untuk Stability AI (Image-to-Image)...");
        const formData = new FormData();
        
        const imageBlob = new Blob([resizedImageBuffer], { type: 'image/png' });
        formData.append('init_image', imageBlob, 'init_image.png');
        
        const prompts = createImageToImagePrompt(stylePrompt);
        formData.append('text_prompts[0][text]', prompts.positive);
        formData.append('text_prompts[1][text]', prompts.negative);
        formData.append('text_prompts[1][weight]', '-1.0');

        formData.append('init_image_mode', 'IMAGE_STRENGTH');
        formData.append('image_strength', '0.25');
        formData.append('cfg_scale', '7');
        formData.append('samples', '1');
        formData.append('steps', '30');

        console.log("Meminta gambar baru dari Stability AI...");
        const apiUrl = `${stabilityApiHost}/v1/generation/${stabilityEngineId}/image-to-image`;

        const response = await fetch(apiUrl, {
            method: 'POST',
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

        // Langkah 2 & 3: Generate Caption dengan Gemini
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