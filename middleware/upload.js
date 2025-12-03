const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '-' + safeName);

    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;