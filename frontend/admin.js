document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const adminFilesList = document.getElementById("admin-files-list");
    const modalContainer = document.getElementById("modal-container");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const modalInputContainer = document.getElementById("modal-input-container");
    const modalButtons = document.getElementById("modal-buttons");

    const ADMIN_HEADERS = {};

    // --- Custom Modal Functions ---

    const showModal = () => {
        modalContainer.classList.remove("hidden");
        // A brief timeout to allow the display property to apply before transitioning opacity
        setTimeout(() => modalContainer.style.opacity = '1', 10);
    };

    const hideModal = () => {
        modalContainer.style.opacity = '0';
        // Wait for transition to finish before hiding
        setTimeout(() => modalContainer.classList.add("hidden"), 300);
    };

    const customAlert = (message, title = "Alert") => {
        return new Promise((resolve) => {
            modalTitle.innerHTML = title;
            modalMessage.textContent = message;
            modalInputContainer.innerHTML = "";
            modalButtons.innerHTML = `<button id="modal-ok">OK</button>`;
            showModal();

            document.getElementById("modal-ok").onclick = () => {
                hideModal();
                resolve();
            };
        });
    };

    const customConfirm = (message, title = "Confirm") => {
        return new Promise((resolve) => {
            modalTitle.innerHTML = title;
            modalMessage.textContent = message;
            modalInputContainer.innerHTML = "";
            modalButtons.innerHTML = `
                <button id="modal-confirm">Confirm</button>
                <button id="modal-cancel" class="cancel-btn">Cancel</button>
            `;
            showModal();

            document.getElementById("modal-confirm").onclick = () => { hideModal(); resolve(true); };
            document.getElementById("modal-cancel").onclick = () => { hideModal(); resolve(false); };
        });
    };

    const customPrompt = (message, title = "Input Required", type = "password") => {
        return new Promise((resolve) => {
            modalTitle.innerHTML = title;
            modalMessage.textContent = message;
            modalInputContainer.innerHTML = `<input type="${type}" id="modal-input" class="modal-input" />`;
            modalButtons.innerHTML = `
                <button id="modal-ok">OK</button>
                <button id="modal-cancel" class="cancel-btn">Cancel</button>
            `;
            showModal();
            const input = document.getElementById("modal-input");
            input.focus();

            const handleOk = () => { hideModal(); resolve(input.value); };

            document.getElementById("modal-ok").onclick = () => { hideModal(); resolve(input.value); };
            document.getElementById("modal-cancel").onclick = () => { hideModal(); resolve(null); };

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleOk();
                }
            });
        });
    };

    async function askPassword() {
        const pw = await customPrompt("Enter admin password:", '<i class="fas fa-key"></i> Admin Access');
        if (!pw) {
            window.location.href = '/'; // Redirect if password prompt is cancelled
            throw new Error("Authentication cancelled by user.");
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
            adminFilesList.innerHTML = `<p><i class="fas fa-exclamation-triangle"></i> ${err.message}</p>`;
        }
    }

    function renderAdminFiles(files) {
        adminFilesList.innerHTML = "";

        if (files.length === 0) {
            adminFilesList.innerHTML = '<p><i class="fas fa-box-open"></i> No files uploaded yet.</p>';
            return;
        }

        files.forEach(file => {
            const card = document.createElement("div");
            card.className = "file-card";
            const uploadDate = file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : 'N/A';

            card.innerHTML = `
                <h3 class="file-title">${file.title}</h3>
                <p class="file-description">${file.description}</p>
                <p><strong>Original Filename:</strong> ${file.originalName}</p>
                <p><small><strong>Uploaded:</strong> ${uploadDate}</small></p>
                <a href="/uploads/${file.filename}" download><i class="fas fa-download"></i> Download File</a>
                <div class="admin-controls">
                    <button class="edit-btn" data-filename="${file.filename}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn" data-filename="${file.filename}"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
            adminFilesList.appendChild(card);
        });

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

    // Use event delegation for dynamically created buttons
    adminFilesList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const filename = target.dataset.filename;

        if (target.classList.contains('edit-btn')) {
            showEditForm(filename);
        } else if (target.classList.contains('delete-btn')) {
            doDeleteFile(filename);
        }
    });

    async function showEditForm(filename) {
        const card = document.querySelector(`.file-card button[data-filename="${filename}"]`).closest(".file-card");
        const title = card.querySelector(".file-title").textContent;
        const desc = card.querySelector(".file-description").textContent;

        card.innerHTML = `
            <input type="text" class="edit-title" value="${title}" />
            <input type="text" class="edit-desc" value="${desc}" />
            <div class="admin-controls">
                <button class="save-edit-btn"><i class="fas fa-save"></i> Save</button>
                <button class="cancel-edit-btn"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;

        card.querySelector(".cancel-edit-btn").addEventListener("click", fetchAdminFiles);

        const handleSave = async () => {
            try {
                const res = await fetch(`/admin/files/${filename}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...ADMIN_HEADERS
                    },
                    body: JSON.stringify({ title: card.querySelector(".edit-title").value.trim(), description: card.querySelector(".edit-desc").value.trim() })
                });

                if (!res.ok) throw new Error(`Server error: ${await res.text()}`);
                await customAlert("File updated successfully!", '<i class="fas fa-check-circle"></i> Success');
                fetchAdminFiles();
            } catch (err) {
                await customAlert(err.message, '<i class="fas fa-times-circle"></i> Update Failed');
            }
        };

        card.querySelector(".save-edit-btn").addEventListener("click", handleSave);
        card.querySelectorAll("input").forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') fetchAdminFiles();
            });
        });
    }

    async function doDeleteFile(filename) { 
        const confirmed = await customConfirm("Are you sure you want to permanently delete this file? This action cannot be undone.", "Delete Confirmation");
        if (!confirmed) return;

        try {
            const res = await fetch(`/admin/files/${filename}`, {
                method: "DELETE",
                headers: ADMIN_HEADERS
            });

            if (!res.ok) throw new Error(`Server error: ${await res.text()}`);

            await customAlert("The file has been deleted.", '<i class="fas fa-check-circle"></i> Deleted');
            fetchAdminFiles();
        } catch (err) {
            await customAlert(err.message, '<i class="fas fa-times-circle"></i> Delete Failed');
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
            await customAlert(`File "${result.title}" was uploaded successfully.`, '<i class="fas fa-check-circle"></i> Upload Complete');
            uploadForm.reset();
            fetchAdminFiles();
        } catch (err) {
            await customAlert(err.message, '<i class="fas fa-times-circle"></i> Upload Failed');
        }
    });

    // Initial load
    fetchAdminFiles();
});
