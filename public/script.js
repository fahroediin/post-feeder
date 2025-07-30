document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('story-generator-form');
    const generateBtn = document.getElementById('generate-btn');
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.querySelector('.image-preview__image');
    const imagePreviewDefaultText = document.querySelector('.image-preview__default-text');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const outputSection = document.getElementById('output-section');
    const generatedImage = document.getElementById('generated-image');
    const generatedCaption = document.getElementById('generated-caption');
    const copyCaptionBtn = document.getElementById('copy-caption-btn');

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                imagePreviewDefaultText.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = document.getElementById('title').value.trim();
        const stylePrompt = document.getElementById('style-prompt').value.trim(); // Ambil nilai style
        const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
        const imageFile = imageUpload.files[0];

        if (!title || !imageFile || !stylePrompt) {
            showError('Judul, instruksi gaya, dan foto wajib diisi.');
            return;
        }

        showLoader(true);
        showError(null);
        outputSection.classList.add('hidden');
        generateBtn.disabled = true;

        const formData = new FormData();
        formData.append('title', title);
        formData.append('stylePrompt', stylePrompt); // Tambahkan style prompt ke form data
        formData.append('categories', JSON.stringify(selectedCategories));
        formData.append('image', imageFile);

        try {
            // Panggil endpoint baru /api/generate-creative
            const response = await fetch('/api/generate-creative', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            // Tampilkan hasil baru dari server
            displayResult(data.newImageUrl, data.newCaption);

        } catch (error) {
            console.error('Error:', error);
            showError(`Terjadi kesalahan: ${error.message}`);
        } finally {
            showLoader(false);
            generateBtn.disabled = false;
        }
    });
    
    copyCaptionBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(generatedCaption.innerText).then(() => {
            copyCaptionBtn.innerText = 'Berhasil Disalin!';
            setTimeout(() => {
                copyCaptionBtn.innerText = 'Salin Caption';
            }, 2000);
        });
    });

    const showLoader = (isLoading) => loader.classList.toggle('hidden', !isLoading);

    const showError = (message) => {
        errorMessage.textContent = message || '';
        errorMessage.classList.toggle('hidden', !message);
    };
    
    const displayResult = (imgUrl, captionText) => {
        // Sekarang kita set src dari URL yang diberikan server
        generatedImage.src = imgUrl;
        generatedCaption.innerText = captionText.trim();
        outputSection.classList.remove('hidden');
    };
});