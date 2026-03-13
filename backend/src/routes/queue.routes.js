const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const { streamQueueStatus } = require('../controllers/queue.sse.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');

// POST /queue/join
router.post('/join', verifyAccessToken, queueController.joinQueue);

// GET /queue/status (폴링 방식)
router.get('/status', queueController.getQueueStatus);

// GET /queue/stream/:showId (SSE 실시간 스트리밍)
router.get('/stream/:showId', streamQueueStatus);

// POST /queue/allow (관리자용 / 워커 직접 호출)
router.post('/allow', queueController.allowNextInQueue);

module.exports = router;
