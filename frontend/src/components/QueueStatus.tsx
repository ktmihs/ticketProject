'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useQueuePolling } from '@/hooks/useQueuePolling';
import { LoadingSpinner } from './LoadingSpinner';

interface QueueStatusProps {
  onAllowed: () => void;
}

export function QueueStatus({ onAllowed }: QueueStatusProps) {
  const { status, position, estimatedWaitTime } = useAppSelector((state) => state.queue);
  useQueuePolling(3000); // 3초마다 폴링

  useEffect(() => {
    if (status === 'ALLOWED') {
      onAllowed();
    }
  }, [status, onAllowed]);

  if (status === 'ALLOWED') {
    return (
      <div className="text-center p-8">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">입장 허용</h2>
        <p className="text-gray-600">곧 티켓 구매 페이지로 이동합니다...</p>
      </div>
    );
  }

  // 대기 시간을 분:초 형식으로 변환
  const minutes = Math.floor(estimatedWaitTime / 60);
  const seconds = estimatedWaitTime % 60;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">대기 중입니다</h2>
          <p className="text-gray-600">순서가 되면 자동으로 입장됩니다</p>
        </div>

        <div className="mb-8">
          <LoadingSpinner size="lg" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">현재 대기 순번</p>
            <p className="text-4xl font-bold text-blue-600">{position}</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">예상 대기 시간</p>
            <p className="text-4xl font-bold text-purple-600">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">유의사항</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 페이지를 새로고침하지 마세요</li>
            <li>• 입장 시 5분 내에 구매를 완료해주세요</li>
            <li>• 브라우저를 종료하면 대기 순번이 초기화됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
