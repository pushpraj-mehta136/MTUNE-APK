const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

const ADMIN_PASSWORD = "Pushpraj@##@2123";

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(express.static("frontend"));
app.use("/uploads", express.static(uploadsDir));

app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        // Generate a unique filename using timestamp + original filename
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

let fileMetadata = [];

// Middleware to check for admin authentication
function isAuthenticated(req, res, next) {
    const password = req.headers["admin-password"];
    if (password === ADMIN_PASSWORD) return next();
    return res.status(401).send("Unauthorized");
}

// Upload new file
app.post("/upload", isAuthenticated, upload.single("file"), (req, res) => {
    const { title, description } = req.body;
    if (!req.file) return res.status(400).send("No file uploaded");

    const meta = {
        title,
        description,
        filename: req.file.filename, // Store the unique filename
        originalName: req.file.originalname // Store the original filename
    };
    fileMetadata.push(meta);
    res.json(meta);
});

// Public route to get the list of files
app.get("/files", (req, res) => {
    res.json(fileMetadata.map(({ title, description, originalName, filename }) => ({
        title,
        description,
        originalName,
        filename
    })));
});

// Admin route to get all files with metadata
app.get("/admin/files", isAuthenticated, (req, res) => {
    res.json(fileMetadata);
});

// Admin route to update title/description of a file
app.put("/admin/files/:filename", isAuthenticated, (req, res) => {
    const fname = req.params.filename;
    const { title, description } = req.body;

    const file = fileMetadata.find(f => f.filename === fname);
    if (!file) {
        return res.status(404).send("File not found");
    }

    if (title !== undefined) file.title = title;
    if (description !== undefined) file.description = description;

    res.json(file);
});

// Admin route to delete a file and metadata
app.delete("/admin/files/:filename", isAuthenticated, (req, res) => {
    const fname = req.params.filename;

    const idx = fileMetadata.findIndex(f => f.filename === fname);
    if (idx === -1) {
        return res.status(404).send("File not found");
    }

    // Remove from metadata list
    const [ removed ] = fileMetadata.splice(idx, 1);

    // Delete physical file
    const filePath = path.join(uploadsDir, removed.filename);
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("Error deleting file:", err);
            return res.status(500).send("Error deleting file");
        }
        res.json({ message: "Deleted", filename: removed.filename });
    });
});

// Endpoint to download a file with its original name
app.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;

    const file = fileMetadata.find(f => f.filename === filename);
    if (!file) {
        return res.status(404).send("File not found");
    }

    const filePath = path.join(uploadsDir, filename);
    const originalName = file.originalName;

    res.download(filePath, originalName, (err) => {
        if (err) {
            console.error("Error downloading file:", err);
            res.status(500).send("Error downloading file");
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
