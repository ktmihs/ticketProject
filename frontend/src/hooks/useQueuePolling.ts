import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchQueueStatus, stopPolling, setAllowedStatus } from '@/store/queueSlice';

/**
 * 대기열 상태를 주기적으로 폴링하는 Hook
 * @param interval - 폴링 간격 (ms), 기본값 3000ms
 */
export function useQueuePolling(interval: number = 3000) {
  const dispatch = useAppDispatch();
  const { isPolling, status } = useAppSelector((state) => state.queue);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPolling) {
      // 폴링 중단
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 폴링 시작
    const poll = async () => {
      try {
        const result = await dispatch(fetchQueueStatus()).unwrap();
        
        // ALLOWED 상태가 되면 폴링 중단
        if (result.status === 'ALLOWED') {
          dispatch(stopPolling());
        }
      } catch (error) {
        console.error('Queue polling error:', error);
        // 에러 발생 시 폴링 중단
        dispatch(stopPolling());
      }
    };

    // 즉시 한 번 실행
    poll();

    // 주기적 폴링 시작
    intervalRef.current = setInterval(poll, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, interval, dispatch]);

  return { isPolling, status };
}
