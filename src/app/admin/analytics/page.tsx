import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  authorizeAnalytics,
  AnalyticsAccessError,
} from "@/lib/analytics/access";
import { db } from "@/lib/db";
import AnalyticsDashboard from "./AnalyticsDashboard";

export const dynamic = "force-dynamic";
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ community?: string }>;
}) {
  try {
    const params = await searchParams;
    if (
      params.community &&
      !z.string().uuid().safeParse(params.community).success
    )
      redirect("/");
    const access = await authorizeAnalytics(await headers(), params.community);
    const communities = access.isPlatformAdmin
      ? await db.community.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: 200,
        })
      : [access.community];
    return (
      <AdminPage title="Analytics">
        <AnalyticsDashboard
          community={access.community}
          communities={communities}
        />
      </AdminPage>
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) redirect("/");
    throw error;
  }
}
