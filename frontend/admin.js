document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const adminFilesList = document.getElementById("admin-files-list");

    const ADMIN_HEADERS = {};

    async function askPassword() {
        const pw = prompt("🔐 Enter admin password:");
        if (!pw) {
            alert("Password required");
            throw new Error("No password entered");
        }
        // store for future requests
        ADMIN_HEADERS["Admin-Password"] = pw;
        return pw;
    }

    async function fetchAdminFiles() {
        try {
            if (!ADMIN_HEADERS["Admin-Password"]) {
                await askPassword();
            }
            const res = await fetch("/admin/files", {
                headers: ADMIN_HEADERS
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Failed to fetch files");
            }
            const files = await res.json();
            renderAdminFiles(files);
        } catch (err) {
            console.error("Error fetching admin files:", err);
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
            card.className = "file-card";  // reuse same card style or adjust CSS
            card.innerHTML = `
                <h3>${file.title}</h3>
                <p>${file.description}</p>
                <a href="/uploads/${file.filename}" target="_blank" download>Download</a>
                <div class="admin-controls">
                    <button class="edit-btn" data-filename="${file.filename}">Edit</button>
                    <button class="delete-btn" data-filename="${file.filename}">Delete</button>
                </div>
            `;
            adminFilesList.appendChild(card);
        });

        // attach event handlers
        adminFilesList.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const fname = btn.dataset.filename;
                showEditForm(fname);
            });
        });
        adminFilesList.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const fname = btn.dataset.filename;
                doDeleteFile(fname);
            });
        });
    }

    async function showEditForm(filename) {
        // find the card DOM element
        const btn = document.querySelector(`.edit-btn[data-filename="${filename}"]`);
        const card = btn.closest(".file-card");

        // get current values
        const titleElem = card.querySelector("h3");
        const descElem = card.querySelector("p");

        const currentTitle = titleElem.textContent;
        const currentDesc = descElem.textContent;

        // replace card content with edit form
        card.innerHTML = `
            <input type="text" class="edit-title" value="${currentTitle}" />
            <input type="text" class="edit-desc" value="${currentDesc}" />
            <button class="save-edit-btn">Save</button>
            <button class="cancel-edit-btn">Cancel</button>
        `;

        card.querySelector(".cancel-edit-btn").addEventListener("click", () => {
            fetchAdminFiles();  // re-render
        });

        card.querySelector(".save-edit-btn").addEventListener("click", async () => {
            const newTitle = card.querySelector(".edit-title").value;
            const newDesc = card.querySelector(".edit-desc").value;

            try {
                const res = await fetch(`/admin/files/${filename}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...ADMIN_HEADERS
                    },
                    body: JSON.stringify({
                        title: newTitle,
                        description: newDesc
                    })
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(txt || "Edit failed");
                }

                alert("✅ Edited successfully");
                fetchAdminFiles();
            } catch (err) {
                alert(`❌ Error editing: ${err.message}`);
                console.error("Edit error:", err);
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

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Delete failed");
            }

            alert("✅ Deleted successfully");
            fetchAdminFiles();
        } catch (err) {
            alert(`❌ Error deleting: ${err.message}`);
            console.error("Delete error:", err);
        }
    }

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(uploadForm);

        try {
            if (!ADMIN_HEADERS["Admin-Password"]) {
                await askPassword();
            }

            const res = await fetch("/upload", {
                method: "POST",
                headers: ADMIN_HEADERS,
                body: formData
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || "Upload failed");
            }

            const result = await res.json();
            alert(`✅ Uploaded: ${result.title}`);
            uploadForm.reset();
            fetchAdminFiles();
        } catch (err) {
            alert(`❌ Upload failed: ${err.message}`);
            console.error("Upload error:", err);
        }
    });

    // Initially load admin files
    fetchAdminFiles();
});
