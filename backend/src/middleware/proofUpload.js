import multer from 'multer';

const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image uploads are allowed for challenge proof'));
      return;
    }

    callback(null, true);
  },
});

export default proofUpload;
