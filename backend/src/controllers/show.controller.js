const { createSuccessResponse, Errors } = require('../utils/response.util');

// Mock 데이터 (실제로는 DB에서 조회)
const mockShows = [
  {
    id: 'show_123',
    title: '2026 K-POP 콘서트',
    description: '최고의 K-POP 아티스트들이 한자리에',
    date: '2026-03-15T19:00:00Z',
    venue: '올림픽공원',
    seatType: 'reserved', // 'reserved' | 'non_reserved'
    price: {
      vip: 150000,
      r: 100000,
      s: 50000,
    },
    availability: {
      total: 5000,
      remaining: 1234,
      soldOut: false,
    },
    saleStartAt: '2026-01-22T10:00:00Z',
    saleEndAt: '2026-03-15T18:00:00Z',
    thumbnail: 'https://cdn.example.com/show123.jpg',
    images: [
      'https://cdn.example.com/show123_1.jpg',
      'https://cdn.example.com/show123_2.jpg',
    ],
    metadata: {
      ageLimit: 12,
      duration: 120,
      genre: 'K-POP',
    },
  },
  {
    id: 'show_456',
    title: '뮤지컬 레미제라블',
    description: '영원한 명작 뮤지컬',
    date: '2026-04-20T14:00:00Z',
    venue: '세종문화회관',
    seatType: 'reserved',
    price: {
      vip: 200000,
      r: 150000,
      s: 80000,
    },
    availability: {
      total: 3000,
      remaining: 890,
      soldOut: false,
    },
    saleStartAt: '2026-02-01T10:00:00Z',
    saleEndAt: '2026-04-20T13:00:00Z',
    thumbnail: 'https://cdn.example.com/show456.jpg',
    images: ['https://cdn.example.com/show456_1.jpg'],
    metadata: {
      ageLimit: 8,
      duration: 180,
      genre: 'Musical',
    },
  },
  {
    id: 'show_789',
    title: '페스티벌 2026',
    description: '여름 야외 음악 페스티벌',
    date: '2026-07-10T18:00:00Z',
    venue: '난지한강공원',
    seatType: 'non_reserved', // 좌석 미지정
    price: {
      min: 80000,
      max: 80000,
    },
    availability: {
      total: 10000,
      remaining: 4567,
      soldOut: false,
    },
    saleStartAt: '2026-05-01T10:00:00Z',
    saleEndAt: '2026-07-10T17:00:00Z',
    thumbnail: 'https://cdn.example.com/show789.jpg',
    images: ['https://cdn.example.com/show789_1.jpg'],
    metadata: {
      ageLimit: 19,
      duration: 240,
      genre: 'Festival',
    },
  },
];

/**
 * GET /shows
 * 공연 목록 조회
 */
async function getShows(req, res, next) {
  try {
    const { status = 'available', limit = 20, offset = 0 } = req.query;
    
    // 쿼리 파라미터 검증
    const parsedLimit = parseInt(limit);
    const parsedOffset = parseInt(offset);
    
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw Errors.INVALID_REQUEST({ field: 'limit', value: limit });
    }
    
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw Errors.INVALID_REQUEST({ field: 'offset', value: offset });
    }
    
    // 필터링
    let filteredShows = mockShows;
    if (status === 'sold_out') {
      filteredShows = mockShows.filter(show => show.availability.soldOut);
    } else if (status === 'available') {
      filteredShows = mockShows.filter(show => !show.availability.soldOut);
    }
    
    // 페이지네이션
    const total = filteredShows.length;
    const paginatedShows = filteredShows.slice(parsedOffset, parsedOffset + parsedLimit);
    
    const response = createSuccessResponse({
      shows: paginatedShows,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasNext: parsedOffset + parsedLimit < total,
      },
    });
    
    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /shows/:showId
 * 공연 상세 조회
 */
async function getShowById(req, res, next) {
  try {
    const { showId } = req.params;
    
    const show = mockShows.find(s => s.id === showId);
    
    if (!show) {
      throw Errors.SHOW_NOT_FOUND(showId);
    }
    
    const response = createSuccessResponse(show);
    res.json(response);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getShows,
  getShowById,
};
