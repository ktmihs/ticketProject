const Redis = require('ioredis');

const redis = new Redis({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	password: process.env.REDIS_PASSWORD || undefined,
});

async function initializeData() {
	try {
		// 공연별 초기 재고 설정
		await redis.set('stock:show_123', 5000, 'NX');
		await redis.set('stock:show_456', 3000, 'NX');
		await redis.set('stock:show_789', 10000, 'NX');

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
