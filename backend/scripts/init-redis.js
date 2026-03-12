const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

async function initializeData() {
  console.log('🔧 Redis 초기 데이터 설정 중...');

  try {
    // 공연별 초기 재고 설정
    await redis.set('stock:show_123', 5000);
    await redis.set('stock:show_456', 3000);
    await redis.set('stock:show_789', 10000);

    console.log('✅ 초기 재고 설정 완료');
    console.log('   - show_123: 5000장');
    console.log('   - show_456: 3000장');
    console.log('   - show_789: 10000장');

    await redis.quit();
    console.log('\n✨ 초기화 완료!');
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    await redis.quit();
    process.exit(1);
  }
}

initializeData();
