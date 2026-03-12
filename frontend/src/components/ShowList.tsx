'use client';

import { useShows } from '@/hooks/useQueries';
import { LoadingSpinner } from './LoadingSpinner';
import { Show } from '@/types';

interface ShowListProps {
  onSelectShow: (show: Show) => void;
}

export function ShowList({ onSelectShow }: ShowListProps) {
  const { data, isLoading, error } = useShows({ status: 'available', limit: 20 });

  if (isLoading) return <LoadingSpinner text="공연 목록을 불러오는 중..." />;
  if (error) return <div className="text-red-600">공연 목록을 불러오는데 실패했습니다</div>;
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {data.shows.map((show) => (
        <div
          key={show.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onSelectShow(show)}
        >
          <img
            src={show.thumbnail}
            alt={show.title}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{show.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{show.venue}</p>
            <p className="text-sm text-gray-500 mb-3">
              {new Date(show.date).toLocaleDateString('ko-KR')}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-blue-600">
                {(() => {
                  const p = show.price;
                  // non_reserved: min/max 사용
                  if (p.min != null) return `${p.min.toLocaleString()}원~`;
                  // reserved: vip/r/s/a 중 가장 낮은 값
                  const values = [p.vip, p.r, p.s, p.a].filter((v): v is number => v != null);
                  if (values.length > 0) return `${Math.min(...values).toLocaleString()}원~`;
                  return '가격 미정';
                })()}
              </span>
              <span className={`text-sm ${show.availability.soldOut ? 'text-red-600' : 'text-green-600'}`}>
                {show.availability.soldOut ? '매진' : `${show.availability.remaining}석 남음`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
