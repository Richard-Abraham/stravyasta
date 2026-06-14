export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime?: number;
}

export interface ReadinessStatus extends HealthStatus {
  db: 'ok' | 'fail';
  redis?: 'ok' | 'fail' | 'skipped';
}
