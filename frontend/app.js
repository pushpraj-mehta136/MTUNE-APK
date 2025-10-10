document.addEventListener("DOMContentLoaded", async () => {
    const filesList = document.getElementById("files-list");

    const createFileCard = (file) => {
        const card = document.createElement("div");
        card.className = "file-card";

        card.innerHTML = `
            <h3>${file.title}</h3>
            <p>${file.description}</p>
            <p><strong>Original Filename:</strong> ${file.originalName}</p>
            <a href="/uploads/${file.filename}" download><i class="fas fa-download"></i> Download</a>
        `;

        return card;
    };

    try {
        filesList.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> Loading files...</p>`;

        const response = await fetch('/files');
        if (!response.ok) throw new Error("Failed to load files");

        const files = await response.json();
        filesList.innerHTML = '';

        if (files.length === 0) {
            filesList.innerHTML = `<p><i class="fas fa-box-open"></i> No files available yet.</p>`;
            return;
        }

        files.forEach(file => {
            const card = createFileCard(file);
            filesList.appendChild(card);
        });
    } catch (error) {
        filesList.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</p>`;
        console.error("File fetch error:", error);
    }
});
