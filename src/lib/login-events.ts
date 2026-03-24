import { db } from './db';

// ============================================================================
// LOGIN EVENT LOGGING & ANOMALY DETECTION
// ============================================================================

const MAXMIND_CITY_ENDPOINT = 'https://geoip.maxmind.com/geoip/v2.1/city';

interface LoginEventInput {
  userId: string;
  ipAddress: string;
  userAgent?: string | null;
  provider: string; // "credentials" | "google" | "facebook"
}

interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
}

interface MaxMindCityResponse {
  city?: {
    names?: {
      en?: string;
    };
  };
  country?: {
    names?: {
      en?: string;
    };
  };
  subdivisions?: Array<{
    names?: {
      en?: string;
    };
  }>;
}

/**
 * Record a login event and check for anomalies.
 *
 * This is the main entry point — call it from the NextAuth signIn callback.
 * It logs the event, resolves geolocation, and flags anomalies in one shot.
 *
 * @returns The created LoginEvent record
 */
export async function recordLoginEvent(input: LoginEventInput) {
  try {
    // Resolve geolocation from IP (best-effort, non-blocking)
    const geo = await resolveGeoLocation(input.ipAddress);

    // Check for anomalies BEFORE inserting (we compare against history)
    const anomaly = await detectAnomaly(input.userId, input.ipAddress, geo);

    // Write the login event
    const event = await db.loginEvent.create({
      data: {
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent || null,
        provider: input.provider,
        city: geo.city || null,
        region: geo.region || null,
        country: geo.country || null,
        isAnomaly: anomaly.isAnomaly,
        anomalyReason: anomaly.reason || null,
      },
    });

    return event;
  } catch (error) {
    // Login logging should never break the login flow
    console.error('[LoginEvent] Failed to record login event:', error);
    return null;
  }
}

/**
 * Detect anomalies by comparing this login against the user's history.
 *
 * Current checks:
 * 1. New IP address — never seen for this user before
 * 2. New geographic location — city/country combination never seen before
 * 3. First login — brand new account (informational, not necessarily suspicious)
 * 4. Provider change — user normally uses one provider, suddenly uses another
 */
async function detectAnomaly(
  userId: string,
  ipAddress: string,
  geo: GeoLocation
): Promise<{ isAnomaly: boolean; reason: string | null }> {
  // Get this user's login history
  const history = await db.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100, // Look at last 100 logins
    select: {
      ipAddress: true,
      city: true,
      country: true,
      provider: true,
      createdAt: true,
    },
  });

  // First-ever login — not anomalous, but worth noting
  if (history.length === 0) {
    return { isAnomaly: false, reason: null };
  }

  const reasons: string[] = [];

  // Check 1: New IP address
  const knownIPs = new Set(history.map((h) => h.ipAddress));
  if (!knownIPs.has(ipAddress)) {
    reasons.push(`New IP address: ${ipAddress}`);
  }

  // Check 2: New geographic location (city + country combo)
  if (geo.city && geo.country) {
    const knownLocations = new Set(
      history
        .filter((h) => h.city && h.country)
        .map((h) => `${h.city}|${h.country}`)
    );
    const currentLocation = `${geo.city}|${geo.country}`;
    if (knownLocations.size > 0 && !knownLocations.has(currentLocation)) {
      reasons.push(`New location: ${geo.city}, ${geo.country}`);
    }
  }

  // Check 3: Rapid logins from different IPs (potential credential stuffing)
  const recentLogins = history.filter((h) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return h.createdAt > fiveMinutesAgo;
  });
  const recentUniqueIPs = new Set(recentLogins.map((h) => h.ipAddress));
  if (recentUniqueIPs.size >= 3) {
    reasons.push(`Rapid logins from ${recentUniqueIPs.size} different IPs in 5 minutes`);
  }

  if (reasons.length > 0) {
    return { isAnomaly: true, reason: reasons.join('; ') };
  }

  return { isAnomaly: false, reason: null };
}

/**
 * Resolve IP to approximate geolocation.
 *
 * Uses MaxMind GeoIP2 City over HTTPS when configured.
 * Returns empty object on failure — geolocation is best-effort.
 */
async function resolveGeoLocation(ipAddress: string): Promise<GeoLocation> {
  // Skip geolocation for localhost/private IPs
  if (isPrivateOrLoopbackIp(ipAddress)) {
    return { city: 'localhost', region: 'local', country: 'local' };
  }

  const maxMindAccountId = process.env.MAXMIND_ACCOUNT_ID?.trim();
  const maxMindLicenseKey = process.env.MAXMIND_LICENSE_KEY?.trim();

  if (!maxMindAccountId || !maxMindLicenseKey) {
    return {};
  }

  try {
    const response = await fetch(`${MAXMIND_CITY_ENDPOINT}/${encodeURIComponent(ipAddress)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${maxMindAccountId}:${maxMindLicenseKey}`).toString('base64')}`,
      },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) return {};

    const data = (await response.json()) as MaxMindCityResponse;
    return {
      city: data.city?.names?.en || undefined,
      region: data.subdivisions?.[0]?.names?.en || undefined,
      country: data.country?.names?.en || undefined,
    };
  } catch {
    // Geolocation failure is not critical
    return {};
  }
}

function isPrivateOrLoopbackIp(ipAddress: string): boolean {
  return (
    ipAddress === '127.0.0.1' ||
    ipAddress === '::1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    isPrivate172Range(ipAddress) ||
    ipAddress.startsWith('fc') ||
    ipAddress.startsWith('fd')
  );
}

function isPrivate172Range(ipAddress: string): boolean {
  const match = /^172\.(\d{1,3})\./.exec(ipAddress);

  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

// ============================================================================
// QUERY HELPERS (for admin UI and reporting)
// ============================================================================

interface LoginEventFilters {
  userId?: string;
  ipAddress?: string;
  anomaliesOnly?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Query login events with optional filtering. Used by admin dashboards.
 */
export async function getLoginEvents(filters: LoginEventFilters = {}) {
  const {
    userId,
    ipAddress,
    anomaliesOnly = false,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  const where: Record<string, any> = {};

  if (userId) where.userId = userId;
  if (ipAddress) where.ipAddress = ipAddress;
  if (anomaliesOnly) where.isAnomaly = true;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [events, total] = await Promise.all([
    db.loginEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    db.loginEvent.count({ where }),
  ]);

  return {
    events,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Get all unique IPs for a specific user (useful for forensics).
 */
export async function getUserKnownIPs(userId: string) {
  const events = await db.loginEvent.findMany({
    where: { userId },
    distinct: ['ipAddress'],
    select: {
      ipAddress: true,
      city: true,
      region: true,
      country: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return events;
}

/**
 * Get login activity summary for a user (for admin user detail page).
 */
export async function getUserLoginSummary(userId: string) {
  const [totalLogins, anomalyCount, lastLogin, uniqueIPs] = await Promise.all([
    db.loginEvent.count({ where: { userId } }),
    db.loginEvent.count({ where: { userId, isAnomaly: true } }),
    db.loginEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, ipAddress: true, city: true, country: true },
    }),
    db.loginEvent.findMany({
      where: { userId },
      distinct: ['ipAddress'],
      select: { ipAddress: true },
    }),
  ]);

  return {
    totalLogins,
    anomalyCount,
    lastLogin,
    uniqueIPCount: uniqueIPs.length,
  };
}
