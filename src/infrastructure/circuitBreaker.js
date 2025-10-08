/**
 * Circuit Breaker implementation for reliability patterns
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 */

export class CircuitBreaker {
  constructor({ 
    threshold = 5, 
    timeout = 30000, 
    resetTimeout = 60000,
    name = 'circuit-breaker'
  } = {}) {
    this.name = name;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.threshold,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
  }
}

// Pre-configured circuit breakers for different services
export const prismaBreaker = new CircuitBreaker({
  name: 'prisma',
  threshold: 3,
  timeout: 5000,
  resetTimeout: 30000,
});

export const redisBreaker = new CircuitBreaker({
  name: 'redis',
  threshold: 5,
  timeout: 2000,
  resetTimeout: 15000,
});

export const externalApiBreaker = new CircuitBreaker({
  name: 'external-api',
  threshold: 3,
  timeout: 10000,
  resetTimeout: 60000,
});
