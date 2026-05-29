const express = require("express");
const multer = require("multer");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const fs = require("fs");
const path = require("path");

// Make uploads directory if not exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const app = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Set the destination folder to a folder called "uploads"
        cb(null, "uploads");
    },
    filename: function (req, file, cb) {
        // Use the original file name and extension for the uploaded file
        cb(null, file.originalname);
    },
});
const upload = multer({
    // dest: 'uploads/',
    storage: storage,
});

app.use(express.json());

// Swagger API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// File upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send("No file uploaded.");
    }
    res.send(`File uploaded: ${file.originalname}`);
});

// Start the server
const PORT = process.env.PORT || 4501;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});
