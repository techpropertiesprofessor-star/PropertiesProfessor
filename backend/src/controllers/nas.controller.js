const NasFolder = require('../models/NasFolder');
const spacesService = require('../services/spaces.service');
const path = require('path');

const NAS_ROOT = 'NAS'; // Root folder prefix in DO Spaces

// ─── Helpers ──────────────────────────────────────────────────────────

function detectFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif', '.tiff', '.tif', '.avif'];
  if (videoExts.includes(ext)) return 'video';
  if (imageExts.includes(ext)) return 'image';
  return 'file';
}

function buildNasKey(folderId, filename) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${NAS_ROOT}/${folderId}/${Date.now()}-${safe}`;
}

// ─── Folders ──────────────────────────────────────────────────────────

/**
 * Create a new NAS folder
 */
exports.createFolder = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await NasFolder.create({
      name: name.trim(),
      description: description || '',
      createdBy: req.user._id,
      createdByName: req.user.name || req.user.username || req.user.email || 'Unknown',
    });

    res.status(201).json(folder);
  } catch (err) {
    console.error('NAS createFolder error:', err);
    res.status(500).json({ error: 'Failed to create folder', details: err.message });
  }
};

/**
 * List all NAS folders (with file counts and basic info)
 */
exports.listFolders = async (req, res) => {
  try {
    const folders = await NasFolder.find()
      .sort({ createdAt: -1 })
      .select('name description createdBy createdByName files createdAt updatedAt')
      .lean();

    // Return summary (file counts, thumbnail hint) without the full file list
    const result = folders.map(f => ({
      _id: f._id,
      name: f.name,
      description: f.description,
      createdBy: f.createdBy,
      createdByName: f.createdByName,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      fileCount: f.files ? f.files.length : 0,
      imageCount: f.files ? f.files.filter(fl => fl.type === 'image').length : 0,
      videoCount: f.files ? f.files.filter(fl => fl.type === 'video').length : 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('NAS listFolders error:', err);
    res.status(500).json({ error: 'Failed to list folders', details: err.message });
  }
};

/**
 * Get a single folder with all its files (and presigned download URLs)
 */
exports.getFolder = async (req, res) => {
  try {
    const folder = await NasFolder.findById(req.params.folderId).lean();
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      (folder.files || []).map(async (file) => {
        let downloadUrl = '';
        try {
          downloadUrl = await spacesService.getPresignedDownloadUrl(file.key, 3600);
        } catch (e) {
          console.warn('NAS: failed to get download URL for', file.key, e.message);
        }
        return { ...file, downloadUrl };
      })
    );

    res.json({
      ...folder,
      files: filesWithUrls,
    });
  } catch (err) {
    console.error('NAS getFolder error:', err);
    res.status(500).json({ error: 'Failed to get folder', details: err.message });
  }
};

/**
 * Update folder name / description
 */
exports.updateFolder = async (req, res) => {
  try {
    const { name, description } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description;

    const folder = await NasFolder.findByIdAndUpdate(
      req.params.folderId,
      { $set: update },
      { new: true }
    );
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    res.json(folder);
  } catch (err) {
    console.error('NAS updateFolder error:', err);
    res.status(500).json({ error: 'Failed to update folder', details: err.message });
  }
};

/**
 * Delete a folder and all its files from Spaces
 */
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await NasFolder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    // Delete all files from Spaces
    for (const file of (folder.files || [])) {
      try {
        await spacesService.deleteFile(file.key);
      } catch (e) {
        console.warn('NAS: failed to delete file from Spaces:', file.key, e.message);
      }
    }

    await NasFolder.findByIdAndDelete(req.params.folderId);
    res.json({ message: 'Folder deleted successfully' });
  } catch (err) {
    console.error('NAS deleteFolder error:', err);
    res.status(500).json({ error: 'Failed to delete folder', details: err.message });
  }
};

// ─── Files ────────────────────────────────────────────────────────────

/**
 * Upload files to a NAS folder (multipart/form-data)
 * Field name: 'files'
 */
exports.uploadFiles = async (req, res) => {
  try {
    const folder = await NasFolder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploaded = [];
    for (const file of req.files) {
      const key = buildNasKey(req.params.folderId, file.originalname);
      const fileType = detectFileType(file.originalname);

      try {
        await spacesService.uploadRaw(key, file.buffer, file.mimetype, 'private');

        const fileDoc = {
          key,
          originalName: file.originalname,
          type: fileType,
          size: file.size,
          contentType: file.mimetype,
          uploadedBy: req.user._id,
          uploadedByName: req.user.name || req.user.username || req.user.email || 'Unknown',
          uploadedAt: new Date(),
        };

        folder.files.push(fileDoc);
        uploaded.push(fileDoc);
      } catch (uploadErr) {
        console.error('NAS: upload failed for', file.originalname, uploadErr.message);
      }
    }

    await folder.save();

    // Return presigned URLs for the newly uploaded files
    const filesWithUrls = await Promise.all(
      uploaded.map(async (f) => {
        let downloadUrl = '';
        try {
          downloadUrl = await spacesService.getPresignedDownloadUrl(f.key, 3600);
        } catch (e) { /* ignore */ }
        return { ...f, downloadUrl };
      })
    );

    res.status(201).json({ uploaded: filesWithUrls, totalFiles: folder.files.length });
  } catch (err) {
    console.error('NAS uploadFiles error:', err);
    res.status(500).json({ error: 'Failed to upload files', details: err.message });
  }
};

/**
 * Delete a specific file from a NAS folder
 */
exports.deleteFile = async (req, res) => {
  try {
    const folder = await NasFolder.findById(req.params.folderId);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const fileKey = decodeURIComponent(req.params.fileKey);
    const fileIndex = folder.files.findIndex(f => f.key === fileKey);
    if (fileIndex === -1) return res.status(404).json({ error: 'File not found in folder' });

    // Delete from Spaces
    try {
      await spacesService.deleteFile(fileKey);
    } catch (e) {
      console.warn('NAS: failed to delete from Spaces:', fileKey, e.message);
    }

    folder.files.splice(fileIndex, 1);
    await folder.save();

    res.json({ message: 'File deleted successfully', totalFiles: folder.files.length });
  } catch (err) {
    console.error('NAS deleteFile error:', err);
    res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
};
