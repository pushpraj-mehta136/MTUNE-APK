document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const adminFilesList = document.getElementById("admin-files-list");

    const ADMIN_HEADERS = {};

    async function askPassword() {
        const pw = prompt("🔐 Enter admin password:");
        if (!pw) {
            alert("Password is required");
            throw new Error("No password entered");
        }
        ADMIN_HEADERS["Admin-Password"] = pw;
        return pw;
    }

    async function fetchAdminFiles() {
        try {
            if (!ADMIN_HEADERS["Admin-Password"]) await askPassword();

            const res = await fetch("/admin/files", {
                headers: ADMIN_HEADERS
            });

            if (!res.ok) throw new Error(await res.text());
            const files = await res.json();
            renderAdminFiles(files);
        } catch (err) {
            console.error("Fetch error:", err);
            adminFilesList.innerHTML = `<p>❌ ${err.message}</p>`;
        }
    }

    function renderAdminFiles(files) {
        adminFilesList.innerHTML = "";

        if (files.length === 0) {
            adminFilesList.innerHTML = "<p>No files uploaded yet.</p>";
            return;
        }

        files.forEach(file => {
            const card = document.createElement("div");
            card.className = "file-card";
            card.innerHTML = `
                <h3>${file.title}</h3>
                <p>${file.description}</p>
                <p><strong>Original Filename:</strong> ${file.originalName}</p>
                <a href="/uploads/${file.filename}" download>⬇️ Download</a>
                <div class="admin-controls">
                    <button class="edit-btn" data-filename="${file.filename}">✏️ Edit</button>
                    <button class="delete-btn" data-filename="${file.filename}">🗑️ Delete</button>
                </div>
            `;
            adminFilesList.appendChild(card);
        });

        attachAdminActions();
    }

    function attachAdminActions() {
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const filename = btn.dataset.filename;
                showEditForm(filename);
            });
        });

        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const filename = btn.dataset.filename;
                doDeleteFile(filename);
            });
        });
    }

    async function showEditForm(filename) {
        const card = document.querySelector(`.edit-btn[data-filename="${filename}"]`).closest(".file-card");
        const title = card.querySelector("h3").textContent;
        const desc = card.querySelector("p").textContent;

        card.innerHTML = `
            <input type="text" class="edit-title" value="${title}" />
            <input type="text" class="edit-desc" value="${desc}" />
            <button class="save-edit-btn">💾 Save</button>
            <button class="cancel-edit-btn">❌ Cancel</button>
        `;

        card.querySelector(".cancel-edit-btn").addEventListener("click", fetchAdminFiles);

        card.querySelector(".save-edit-btn").addEventListener("click", async () => {
            const newTitle = card.querySelector(".edit-title").value.trim();
            const newDesc = card.querySelector(".edit-desc").value.trim();

            try {
                const res = await fetch(`/admin/files/${filename}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...ADMIN_HEADERS
                    },
                    body: JSON.stringify({ title: newTitle, description: newDesc })
                });

                if (!res.ok) throw new Error(await res.text());
                alert("✅ File updated");
                fetchAdminFiles();
            } catch (err) {
                alert(`❌ Failed to update: ${err.message}`);
            }
        });
    }

    async function doDeleteFile(filename) {
        if (!confirm("Are you sure you want to delete this file?")) return;

        try {
            const res = await fetch(`/admin/files/${filename}`, {
                method: "DELETE",
                headers: ADMIN_HEADERS
            });

            if (!res.ok) throw new Error(await res.text());

            alert("✅ File deleted");
            fetchAdminFiles();
        } catch (err) {
            alert(`❌ Delete failed: ${err.message}`);
        }
    }

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(uploadForm);

        try {
            if (!ADMIN_HEADERS["Admin-Password"]) await askPassword();

            const res = await fetch("/upload", {
                method: "POST",
                headers: ADMIN_HEADERS,
                body: formData
            });

            if (!res.ok) throw new Error(await res.text());

            const result = await res.json();
            alert(`✅ Uploaded: ${result.title}`);
            uploadForm.reset();
            fetchAdminFiles();
        } catch (err) {
            alert(`❌ Upload failed: ${err.message}`);
        }
    });

    // Initial load
    fetchAdminFiles();
});
