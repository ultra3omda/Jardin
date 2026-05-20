/**
 * Parses a short duration string like '15m', '30d', '12h' into milliseconds.
 * Supported units: s (seconds), m (minutes), h (hours), d (days), w (weeks).
 *
 * Throws on invalid format so misconfigured env vars fail fast at startup.
 */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhdw])$/.exec(duration);
  if (!match) {
    throw new Error(
      `Invalid duration "${duration}". Expected format: <number><s|m|h|d|w>, e.g. "15m" or "30d".`,
    );
  }
  const num = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return num * multipliers[unit]!;
}
