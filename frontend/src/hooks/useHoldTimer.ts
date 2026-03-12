import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { expireHold } from '@/store/purchaseSlice';

/**
 * 좌석 선점(HOLD) 만료 시간을 추적하는 Hook
 * @param expiresAt - 만료 시각 (timestamp)
 * @returns remainingSeconds - 남은 시간 (초)
 */
export function useHoldTimer(expiresAt: number | null) {
  const dispatch = useAppDispatch();
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    // 초기 남은 시간 계산
    const updateRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setRemainingSeconds(remaining);

      // 만료되었으면 Redux 액션 디스패치
      if (remaining === 0) {
        dispatch(expireHold());
      }

      return remaining;
    };

    // 즉시 실행
    const remaining = updateRemaining();

    if (remaining === 0) {
      return;
    }

    // 1초마다 업데이트
    const interval = setInterval(() => {
      const remaining = updateRemaining();
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, dispatch]);

  return remainingSeconds;
}

/**
 * 남은 시간을 MM:SS 형식으로 포맷
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
