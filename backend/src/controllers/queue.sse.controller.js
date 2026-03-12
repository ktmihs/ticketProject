const redisService = require('../services/redis.service');
const jwtUtil = require('../utils/jwt.util');

// ALLOWED 상태 유지 시간 (10분)
const ALLOWED_DURATION_MS = 10 * 60 * 1000;

/**
 * GET /queue/stream/:showId?token=<queueToken>
 * SSE 기반 대기열 실시간 상태 스트리밍
 */
async function streamQueueStatus(req, res) {
  const { showId } = req.params;
  const token = req.query.token;

  // 토큰 검증
  if (!token) {
    res.status(401).json({ error: { code: 'NO_TOKEN', message: '토큰이 없습니다' } });
    return;
  }

  let decoded;
  try {
    decoded = jwtUtil.verifyToken(token);
  } catch (err) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다' } });
    return;
  }

  const userId = decoded.sub;

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx 버퍼링 방지
  res.flushHeaders();

  const sendEvent = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // 클라이언트 연결 끊어짐
    }
  };

  // 즉시 첫 번째 상태 전송
  const sendStatus = async () => {
    try {
      const status = await redisService.getQueueStatus(showId, userId);

      if (status.status === 'ALLOWED') {
        // ALLOWED: 새 토큰 발급 + allowedUntil 포함
        const allowedUntil = Date.now() + ALLOWED_DURATION_MS;
        const newQueueToken = jwtUtil.generateQueueToken({
          userId,
          showId,
          position: 0,
          status: 'ALLOWED',
          allowedUntil,
        });

        sendEvent({
          status: 'ALLOWED',
          position: 0,
          estimatedWaitTime: 0,
          queueToken: newQueueToken,
          allowedUntil,
        });

        clearInterval(intervalId);
        res.end();
        return true; // 완료 신호
      }

      if (status.status === 'NOT_FOUND') {
        sendEvent({ status: 'EXPIRED' });
        clearInterval(intervalId);
        res.end();
        return true;
      }

      // WAITING
      const estimatedWaitTime = Math.max(0, (status.position - 1) * 2);
      sendEvent({
        status: 'WAITING',
        position: status.position,
        estimatedWaitTime,
      });
      return false;
    } catch (err) {
      console.error('SSE sendStatus error:', err);
      return false;
    }
  };

  // 즉시 전송
  await sendStatus();

  // 2초마다 폴링
  const intervalId = setInterval(async () => {
    const done = await sendStatus();
    if (done) {
      clearInterval(intervalId);
    }
  }, 2000);

  // 클라이언트 연결 종료 시 정리
  req.on('close', () => {
    clearInterval(intervalId);
  });
}

module.exports = { streamQueueStatus };
