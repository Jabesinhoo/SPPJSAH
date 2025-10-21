import express from 'express';
import { getRecentHistory } from '../controllers/historyController.js';

const router = express.Router();

router.get('/recent', getRecentHistory);

export default router;
