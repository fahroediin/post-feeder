/**
 * Modul ini bertanggung jawab untuk membuat prompt yang akan dikirim ke AI.
 */

// Fungsi untuk membuat caption dari gambar HASIL AKHIR.
function createStoryPrompt(title, categories) {
    const baseInstruction = `Anda adalah seorang content creator ahli. Analisis gambar yang diberikan dan buatkan caption yang menarik dan engaging.`;
    const context = `Konteks atau judul utama untuk postingan ini adalah "${title}".`;
    let toneInstruction = '';
    if (categories && categories.length > 0) {
        toneInstruction = `Gunakan nada/gaya berikut dalam penulisan caption: ${categories.join(', ')}.`;
    } else {
        toneInstruction = `Gunakan nada yang umum dan informatif.`;
    }
    const outputRules = `Berikan HANYA teks captionnya saja, tanpa pengantar. Buatlah dalam format yang siap di-copy-paste ke sosial media, lengkap dengan hashtag yang relevan.`;
    
    return [baseInstruction, context, toneInstruction, outputRules].join(' ');
}

// Fungsi untuk menghasilkan prompt positif & negatif untuk generasi gambar.
function createImageToImagePrompt(stylePrompt) {
    // Prompt positif fokus pada gaya yang diinginkan dan kualitas.
    const positivePrompt = `${stylePrompt}, masterpiece, 8k, high detail, professional photography, sharp focus`;

    // Prompt negatif berisi hal-hal yang ingin kita hindari.
    const negativePrompt = "do not change face, deformed, disfigured, ugly, blurry, low quality, bad text, garbled letters, mutated, mutation, duplicate";

    return {
        positive: positivePrompt,
        negative: negativePrompt
    };
}

// Ekspor kedua fungsi
module.exports = {
    createStoryPrompt,
    createImageToImagePrompt
};