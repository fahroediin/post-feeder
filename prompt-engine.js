/**
 * Modul ini bertanggung jawab untuk membuat prompt yang akan dikirim ke AI.
 */

// Fungsi ini tetap sama, untuk membuat caption dari gambar HASIL AKHIR.
function createStoryPrompt(title, categories) {
    const baseInstruction = `Anda adalah seorang content creator ahli. Analisis gambar yang diberikan dan buatkan caption yang menarik dan engaging.`;
    const context = `Konteks atau judul utama untuk postingan ini adalah "${title}".`;
    let toneInstruction = '';
    if (categories && categories.length > 0) {
        toneInstruction = `Gunakan nada/gaya berikut dalam penulisan caption: ${categories.join(', ')}.`;
    } else {
        toneInstruction = `Gunakan nada yang umum dan informatif.`;
    }
    const outputRules = `Berikan HANYA teks captionnya saja, tanpa pengantar. Buatlah dalam format yang siap di-copy-paste ke sosial media.`;
    
    return [baseInstruction, context, toneInstruction, outputRules].join(' ');
}

// !!! FUNGSI BARU UNTUK GENERASI GAMBAR !!!
// Prompt ini lebih efektif untuk image-to-image.
function createImageToImagePrompt(stylePrompt) {
    // Kita tidak perlu lagi mendeskripsikan gambar, karena AI sudah menerimanya.
    // Kita hanya perlu memberikan instruksi gaya dan beberapa kata kunci untuk kualitas.
    const qualityEnhancers = "masterpiece, 8k, high detail, professional photography, sharp focus";
    
    // Menggabungkan gaya dari user dengan peningkat kualitas.
    return `${stylePrompt}, ${qualityEnhancers}`;
}

// Ekspor kedua fungsi
module.exports = {
    createStoryPrompt,
    createImageToImagePrompt
};