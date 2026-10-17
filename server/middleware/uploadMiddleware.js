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

// Allowed formats
const ALLOWED_VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.ogg', '.mkv', '.m4v', '.avi'];
const ALLOWED_IMAGE_EXTS = ['.jpeg', '.jpg', '.png', '.webp', '.gif'];

// Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isVideo = ALLOWED_VIDEO_EXTS.includes(ext);
    const isImage = ALLOWED_IMAGE_EXTS.includes(ext);

    if (isVideo) {
      cb(null, videoUploadDir);
    } else if (isImage) {
      cb(null, imageUploadDir);
    } else {
      cb(new Error('Invalid destination for file format.'), null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter enforcing strict extension whitelist and MIME consistency
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isVideoExt = ALLOWED_VIDEO_EXTS.includes(ext);
  const isImageExt = ALLOWED_IMAGE_EXTS.includes(ext);

  if (!isVideoExt && !isImageExt) {
    return cb(
      new Error(
        'Invalid file type. Allowed formats: MP4, WebM, MOV, MKV, JPG, PNG, WEBP.'
      ),
      false
    );
  }

  // Prevent MIME mismatch / polyglot executable uploads
  if (isVideoExt) {
    const isAllowedVideoMime =
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === 'application/x-matroska';
    if (!isAllowedVideoMime) {
      return cb(new Error('MIME type does not match video file extension.'), false);
    }
  }

  if (isImageExt) {
    const isAllowedImageMime =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/octet-stream';
    if (!isAllowedImageMime) {
      return cb(new Error('MIME type does not match image file extension.'), false);
    }
  }

  cb(null, true);
};

// Upload limit (default 2048MB = 2GB to comfortably support large HD / 4K videos)
const MAX_VIDEO_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB, 10) || 2048;
const MAX_FILE_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

/**
 * Uploads a local file to Cloudinary if configured, or keeps local file and returns local URL.
 * Automatically utilizes chunked large uploads for videos exceeding standard upload sizes.
 * @param {Object} file - Multer file object
 * @param {String} folder - Subfolder category ('videos' | 'thumbnails' | 'avatars')
 * @param {String} resourceType - 'video' | 'image' | 'auto'
 */
const uploadMedia = async (file, folder = 'videos', resourceType = 'video') => {
  if (!file) return { url: '', publicId: '' };

  if (isCloudinaryConfigured) {
    try {
      let result;
      if (resourceType === 'video') {
        // Use upload_large for videos to support large files without hitting 100MB buffer constraints
        result = await cloudinary.uploader.upload_large(file.path, {
          folder: `comm_practice/${folder}`,
          resource_type: 'video',
          chunk_size: 20 * 1024 * 1024, // 20MB chunks
        });
      } else {
        result = await cloudinary.uploader.upload(file.path, {
          folder: `comm_practice/${folder}`,
          resource_type: resourceType,
        });
      }

      // Cleanup local temp file after successful cloud upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (err) {
      console.error('[Cloudinary Upload Error]:', err.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Media storage upload failed: ${err.message}`);
      }
      // In development: fall through to local file fallback
    }
  }

  // Local storage URL format
  const ext = path.extname(file.originalname).toLowerCase();
  const isVideo = ALLOWED_VIDEO_EXTS.includes(ext) || file.mimetype.startsWith('video/');
  const subFolder = isVideo ? 'videos' : 'images';
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
  MAX_VIDEO_SIZE_MB,
};
