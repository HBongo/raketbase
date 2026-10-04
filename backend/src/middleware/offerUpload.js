const multer = require('multer');

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB each
const MAX_FILES = 3;
// Same whitelist as chat attachments.
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
];

// Held in memory only long enough to forward to Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error(`"${file.originalname}" is not a supported file type`);
    err.code = 'INVALID_FILE_TYPE';
    return cb(err);
  },
});

// Wraps multer so its errors come back in the usual { success, error } shape.
function uploadOfferFiles(req, res, next) {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Each file must be 10 MB or smaller'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `You can attach up to ${MAX_FILES} files`
        : 'Could not read the uploaded files';
      return res.status(400).json({ success: false, error: message });
    }

    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ success: false, error: err.message });
    }

    return next(err);
  });
}

module.exports = { uploadOfferFiles, MAX_FILES, MAX_FILE_BYTES, ALLOWED_TYPES };
