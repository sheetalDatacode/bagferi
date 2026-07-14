import express from 'express';
import {
    addMusic,
    adminListMusic,
    toggleMusic,
    deleteMusic,
    listApprovedMusic
} from '../controllers/music.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();
const uploadMusic = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowed = /mp3|wav|mpeg|ogg|aac|m4a/;
        const isAudio = file.mimetype.startsWith('audio/') || allowed.test(path.extname(file.originalname).toLowerCase());
        if (isAudio) cb(null, true);
        else cb(new Error('Only audio files are allowed (mp3, wav, m4a) - DEBUG: INLINE_FILTER_HIT'));
    }
});

const router = express.Router();

// Public/Vendor routes
router.get('/approved', listApprovedMusic);

// Admin routes
router.use(authenticate);
router.use(authorize('admin', 'superadmin'));

router.post('/', uploadMusic.single('file'), addMusic);
router.get('/', adminListMusic);
router.patch('/:id/toggle', toggleMusic);
router.delete('/:id', deleteMusic);

export default router;
