const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { verifyQueueToken } = require('../middleware/auth.middleware');

// GET /shows/:showId/available-count (Queue Token 불필요)
router.get('/shows/:showId/available-count', purchaseController.getAvailableCount);

// POST /purchase/non-reserved (Queue Token 필수)
router.post('/purchase/non-reserved', verifyQueueToken, purchaseController.purchaseNonReserved);

// GET /seats/:showId (Queue Token 필수)
router.get('/seats/:showId', verifyQueueToken, purchaseController.getSeats);

// POST /seats/hold (Queue Token 필수)
router.post('/seats/hold', verifyQueueToken, purchaseController.holdSeat);

// POST /purchase/reserved (Queue Token 필수)
router.post('/purchase/reserved', verifyQueueToken, purchaseController.purchaseReserved);

// POST /seats/release (Queue Token 필수)
router.post('/seats/release', verifyQueueToken, purchaseController.releaseSeat);

module.exports = router;
