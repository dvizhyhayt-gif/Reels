/**
 * Lightweight runtime performance monitor.
 * Usage:
 *   const token = window.reelgramPerf.start('feed.load', { clear: true });
 *   ...
 *   window.reelgramPerf.end(token, { count: 8 });
 */
(function attachPerfMonitor(globalObject) {
    class ReelgramPerfMonitor {
        constructor(options = {}) {
            this.defaultWarnMs = Math.max(50, parseInt(options.defaultWarnMs, 10) || 550);
            this.warnThresholdByLabel = options.warnThresholdByLabel || {};
            this.maxSamples = Math.max(20, parseInt(options.maxSamples, 10) || 200);
            this.stats = new Map();
            this.samples = [];
        }

        now() {
            if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
                return performance.now();
            }
            return Date.now();
        }

        getThreshold(label) {
            const value = parseInt(this.warnThresholdByLabel[label], 10);
            if (Number.isFinite(value) && value > 0) return value;
            return this.defaultWarnMs;
        }

        start(label, meta = null) {
            return {
                label: String(label || 'unknown'),
                startedAt: this.now(),
                startedEpoch: Date.now(),
                meta: meta && typeof meta === 'object' ? meta : null
            };
        }

        end(token, meta = null) {
            if (!token || !token.label || !Number.isFinite(token.startedAt)) return null;

            const durationMs = Math.max(0, this.now() - token.startedAt);
            const label = String(token.label);
            const threshold = this.getThreshold(label);

            const current = this.stats.get(label) || {
                count: 0,
                totalMs: 0,
                maxMs: 0,
                avgMs: 0,
                slowCount: 0,
                lastMs: 0,
                lastAt: 0
            };

            current.count += 1;
            current.totalMs += durationMs;
            current.maxMs = Math.max(current.maxMs, durationMs);
            current.lastMs = durationMs;
            current.avgMs = current.totalMs / current.count;
            current.lastAt = Date.now();
            if (durationMs >= threshold) current.slowCount += 1;
            this.stats.set(label, current);

            const sample = {
                label,
                durationMs,
                at: Date.now(),
                meta: {
                    ...(token.meta || {}),
                    ...((meta && typeof meta === 'object') ? meta : {})
                }
            };
            this.samples.push(sample);
            if (this.samples.length > this.maxSamples) {
                this.samples.splice(0, this.samples.length - this.maxSamples);
            }

            if (durationMs >= threshold) {
                const rounded = Math.round(durationMs);
                console.warn(`[perf] ${label} took ${rounded}ms (threshold ${threshold}ms)`, sample.meta || {});
            }

            return durationMs;
        }

        async timeAsync(label, fn, meta = null) {
            const token = this.start(label, meta);
            try {
                return await fn();
            } finally {
                this.end(token);
            }
        }

        getReport(limit = 15) {
            const rows = Array.from(this.stats.entries()).map(([label, data]) => ({
                label,
                count: data.count,
                avgMs: Math.round(data.avgMs),
                maxMs: Math.round(data.maxMs),
                slowCount: data.slowCount,
                lastMs: Math.round(data.lastMs),
                lastAt: data.lastAt
            }));
            rows.sort((a, b) => b.avgMs - a.avgMs);
            return rows.slice(0, Math.max(1, parseInt(limit, 10) || 15));
        }

        getRecentSamples(limit = 30) {
            const safeLimit = Math.max(1, parseInt(limit, 10) || 30);
            return this.samples.slice(-safeLimit);
        }

        clear() {
            this.stats.clear();
            this.samples = [];
        }
    }

    const config = globalObject.ReelgramAppConfig || {};
    const perfConfig = config.perf || {};
    globalObject.ReelgramPerfMonitor = ReelgramPerfMonitor;
    if (!globalObject.reelgramPerf) {
        globalObject.reelgramPerf = new ReelgramPerfMonitor(perfConfig);
    }
})(typeof window !== 'undefined' ? window : globalThis);

