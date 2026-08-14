const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Ensure local upload directories exist
const uploadDir = path.join(__dirname, '..', 'uploads');
const videoUploadDir = path.join(uploadDir, 'videos');
const imageUploadDir = path.join(uploadDir, 'images');

[uploadDir, videoUploadDir, imageUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, videoUploadDir);
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, imageUploadDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedVideoMimes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/ogg',
    'video/x-matroska',
  ];
  const allowedImageMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (
    allowedVideoMimes.includes(file.mimetype) ||
    allowedImageMimes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Allowed formats: MP4, WebM, MOV, JPG, PNG, WEBP.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max limit
  },
});

/**
 * Uploads a local file to Cloudinary if configured, or keeps local file and returns local URL.
 * @param {Object} file - Multer file object
 * @param {String} folder - Subfolder category ('videos' | 'thumbnails' | 'avatars')
 * @param {String} resourceType - 'video' | 'image' | 'auto'
 */
const uploadMedia = async (file, folder = 'videos', resourceType = 'video') => {
  if (!file) return { url: '', publicId: '' };

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `comm_practice/${folder}`,
        resource_type: resourceType,
      });

      // Cleanup local temp file after successful cloud upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (err) {
      console.error('[Cloudinary Upload Error] Falling back to local file:', err.message);
      // Fall through to local file fallback
    }
  }

  // Local storage URL format
  const subFolder = file.mimetype.startsWith('video/') ? 'videos' : 'images';
  const relativeUrl = `/uploads/${subFolder}/${file.filename}`;
  return {
    url: relativeUrl,
    publicId: file.filename,
  };
};

/**
 * Deletes media from Cloudinary or local file system
 */
const deleteMedia = async (publicId, resourceType = 'video') => {
  if (!publicId) return;

  if (isCloudinaryConfigured && publicId.includes('/')) {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return;
    } catch (err) {
      console.error('[Cloudinary Delete Error]:', err.message);
    }
  }

  // Check local file deletion
  const subFolder = resourceType === 'video' ? 'videos' : 'images';
  const localPath = path.join(uploadDir, subFolder, publicId);
  if (fs.existsSync(localPath)) {
    try {
      fs.unlinkSync(localPath);
    } catch (err) {
      console.error('[Local File Delete Error]:', err.message);
    }
  }
};

module.exports = {
  upload,
  uploadMedia,
  deleteMedia,
};
