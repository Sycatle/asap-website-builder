# Redis Public Portfolio Caching - Implementation Guide

## Overview

This implementation adds Redis-based caching for public portfolio retrieval, significantly reducing database load and improving response times for the most frequently accessed data.

## Architecture

### Components

1. **CacheService** (`apps/api/src/cache.rs`)
   - Low-level Redis operations
   - TTL management
   - Connection pooling with ConnectionManager
   - Health checks and error handling

2. **PortfolioCacheService** (`apps/api/src/portfolio_cache.rs`)
   - High-level caching logic for portfolios
   - Cache key generation (`portfolio:public:{slug}`)
   - Serialization/deserialization handling
   - Cache invalidation strategies

3. **Integration in main.rs**
   - Redis connection initialization (optional)
   - Graceful fallback if Redis unavailable
   - Health check integration

## Features

### 1. Automatic Caching
- **Cache Key Format**: `portfolio:public:{slug}`
- **Default TTL**: 1 hour (3600 seconds)
- **Serialization**: JSON for easy debugging and compatibility

### 2. Cache Invalidation
- **On Publish**: Automatically invalidates cache when portfolio is published
- **Bulk Operations**: Support for invalidating multiple portfolios
- **Manual Control**: Can invalidate specific slugs or all cache

### 3. Fallback Mechanism
- If Redis unavailable, API continues to work with direct DB queries
- Graceful degradation - no breaking changes
- Logging for monitoring availability

### 4. Performance Benefits
- **Cache Hit**: ~1-5ms response time (Redis)
- **Cache Miss**: ~50-200ms response time (Database + network + compression)
- **Typical Hit Rate**: 70-90% for public portfolios
- **Impact**: 10-20x faster responses for cached data

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost/dbname
JWT_SECRET=your-secret-key

# Optional - Redis caching
REDIS_URL=redis://localhost:6379/0
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    
  postgres:
    # ... existing postgres configuration

volumes:
  redis_data:
```

## Usage

### For Public Portfolio Access

```rust
// Route handler with caching
pub async fn get_public_portfolio_cached(
    Extension(cache_service): Extension<std::sync::Arc<PortfolioCacheService>>,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    // Service handles cache logic transparently
    match cache_service.get_public_portfolio(&slug).await {
        Ok(Some(portfolio)) => (StatusCode::OK, Json(portfolio)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, ...).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, ...).into_response(),
    }
}
```

### Cache Invalidation on Portfolio Publish

```rust
// When publishing a portfolio
let slug = portfolio.slug.clone();

// ... update portfolio status ...

// Invalidate cache
if let Err(e) = cache_service.invalidate_portfolio(&slug).await {
    tracing::warn!("Cache invalidation failed: {}", e);
    // Continue anyway - cache will expire naturally
}
```

## Monitoring & Debugging

### Enable Detailed Logging

```bash
RUST_LOG=asap_api=debug cargo run
```

### Key Log Messages

- `Cache HIT: portfolio:public:{slug}` - Successful cache retrieval
- `Cache MISS: portfolio:public:{slug}` - Cache miss, fetching from DB
- `Cache SET: portfolio:public:{slug} (TTL: 3600 secs)` - Cache stored
- `Cache invalidated for portfolio: {slug}` - Cache cleared on publish
- `Redis cache initialized` - Startup success
- `REDIS_URL not set. Caching disabled.` - Running without Redis

### Redis CLI Inspection

```bash
# Connect to Redis
redis-cli

# View all portfolio cache keys
KEYS "portfolio:public:*"

# Get cached portfolio data
GET "portfolio:public:my-portfolio"

# Monitor cache operations
MONITOR

# Check memory usage
INFO memory
```

## Performance Metrics

### Expected Improvements

| Metric | Without Cache | With Cache | Improvement |
|--------|---------------|-----------|------------|
| 50th percentile latency | 150ms | 5ms | **30x faster** |
| 95th percentile latency | 300ms | 20ms | **15x faster** |
| Database load | 100% | 10-15% | **85-90% reduction** |
| Memory (Redis) | 0 | ~100KB per portfolio | Negligible |

### Assumptions
- 1000 active public portfolios
- 10 requests/second average traffic
- 80% cache hit rate
- Each portfolio data ~10KB average

## Limitations & Trade-offs

### Limitations

1. **Eventual Consistency**: Cached data is 1 hour stale max
2. **Memory**: Each cached portfolio ~10-50KB in Redis
3. **Cold Starts**: Initial requests after cache restart miss cache
4. **Multi-Instance**: Requires shared Redis (not in-process)

### When to Consider Alternative Approaches

1. **Instant Updates Required**: Use write-through cache or event-driven invalidation
2. **Complex Cache Logic**: May need cache warming or LRU policies
3. **High Cardinality Data**: Consider cache patterns like scan-based invalidation

## Future Enhancements

### Short-term

- [ ] Cache warming on startup
- [ ] Configurable TTL per portfolio
- [ ] Cache statistics endpoint
- [ ] Redis cluster support

### Medium-term

- [ ] Write-through cache for portfolio updates
- [ ] Event-driven cache invalidation
- [ ] Cache-aside pattern for related data (portfolio_data, metadata)
- [ ] Cache preloading for popular portfolios

### Long-term

- [ ] Redis Streams for cache invalidation events
- [ ] Distributed cache with multiple replicas
- [ ] CDN integration for static portfolio content
- [ ] GraphQL query caching layer

## Troubleshooting

### Issue: Redis connection refused

**Symptom**: `REDIS_URL not set. Caching disabled.`

**Solution**: 
```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Set REDIS_URL
export REDIS_URL=redis://localhost:6379/0
```

### Issue: Cache not working after portfolio update

**Cause**: Cache TTL not expired yet

**Solution**:
```bash
# Manual cache clear
redis-cli DEL "portfolio:public:my-slug"

# Or wait 1 hour for automatic expiration
```

### Issue: Memory usage growing

**Cause**: Too many cache entries or TTL too high

**Solution**:
- Monitor `KEYS "portfolio:public:*" | wc -l` 
- Reduce TTL if needed
- Implement cache size limits with eviction policy

## Testing

### Unit Tests

```bash
# Test cache service
cargo test --package asap-api cache

# Test portfolio cache service
cargo test --package asap-api portfolio_cache
```

### Integration Tests

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run with caching enabled
REDIS_URL=redis://localhost:6379/0 cargo test --test integration
```

### Manual Testing

```bash
# 1. Start API with Redis
REDIS_URL=redis://localhost:6379/0 cargo run

# 2. Request public portfolio (cache miss)
curl http://localhost:3000/api/public/portfolios/my-portfolio
# Response time: ~150ms

# 3. Request again (cache hit)
curl http://localhost:3000/api/public/portfolios/my-portfolio
# Response time: ~5ms

# 4. Verify in Redis
redis-cli GET "portfolio:public:my-portfolio"
```

## References

- [Redis Rust Client](https://github.com/redis-rs/redis-rs)
- [Axum Caching Pattern](https://docs.rs/axum/latest/axum/)
- [TTL Best Practices](https://redis.io/docs/manual/data-types/strings/#setting-timeouts)
