import { recomputeAnalyticsRollupsForRange } from '@/lib/analytics/rollups';

function parseDateArg(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return parsed;
}

async function main() {
  const args = new Map(
    process.argv.slice(2).map((entry) => {
      const [key, value] = entry.split('=');
      return [key.replace(/^--/, ''), value ?? ''];
    })
  );

  const today = new Date();
  const yesterday = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 1
  ));

  const start = args.get('start')
    ? parseDateArg(args.get('start') as string)
    : args.get('date')
      ? parseDateArg(args.get('date') as string)
      : yesterday;

  const end = args.get('end')
    ? parseDateArg(args.get('end') as string)
    : start;

  const results = await recomputeAnalyticsRollupsForRange(start, end);

  for (const result of results) {
    console.log(
      [
        result.date.toISOString().slice(0, 10),
        `content=${result.contentRows}`,
        `category=${result.categoryRows}`,
        `homepageSlots=${result.homepageSlotRows}`,
      ].join(' ')
    );
  }
}

main().catch((error) => {
  console.error('aggregate-analytics error:', error);
  process.exit(1);
});
