import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditProfileButton from "./EditProfileButton";
import ProfileInteractionControls from "./ProfileInteractionControls";
import VouchSection from "./VouchSection";

interface PageProps {
  params: {
    id: string;
  };
}

async function getUserProfile(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      bio: true,
      profilePhotoUrl: true,
      trustLevel: true,
      dateOfBirth: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          community: {
            select: { name: true },
          },
        },
      },
      vouchesReceived: {
        select: { id: true },
      },
      _count: {
        select: {
          articles: true,
          eventsSubmitted: true,
          marketplaceListings: true,
        },
      },
      // Recent articles for activity feed
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
        },
      },
      // Recent marketplace listings
      marketplaceListings: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
    },
  });

  return user;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await getUserProfile(params.id);
  if (!user) {
    return { title: "User Not Found" };
  }

  return {
    title: `${user.firstName} ${user.lastName}'s Profile`,
    description: `Community member profile - ${user.firstName} ${user.lastName}`,
  };
}

const getTrustBadgeColor = (level: string) => {
  switch (level) {
    case "TRUSTED":
      return "text-green-600 bg-green-50";
    case "REGISTERED":
      return "text-blue-600 bg-blue-50";
    case "SUSPENDED":
      return "text-orange-600 bg-orange-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

const getTrustLabel = (level: string) => {
  switch (level) {
    case "TRUSTED":
      return "\u2713 Trusted Member";
    case "REGISTERED":
      return "Registered";
    case "SUSPENDED":
      return "Suspended";
    default:
      return "Anonymous";
  }
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? "s" : ""} ago`;
}

export default async function UserProfilePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const profile = await getUserProfile(params.id);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = (session?.user as { id?: string } | undefined)?.id === profile.id;

  const community = profile.memberships?.[0]?.community?.name ?? null;
  const totalPosts =
    profile._count.articles +
    profile._count.eventsSubmitted +
    profile._count.marketplaceListings;

  // Build activity feed from real data
  const activities: { label: string; title: string; date: Date; href?: string }[] = [];

  for (const article of profile.articles) {
    activities.push({
      label: "Posted a news article",
      title: article.title,
      date: new Date(article.createdAt),
      href: `/local-life/${article.id}`,
    });
  }
  for (const listing of profile.marketplaceListings) {
    activities.push({
      label: "Created a marketplace listing",
      title: listing.title,
      date: new Date(listing.createdAt),
    });
  }

  // Sort by date descending, take top 5
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  const recentActivities = activities.slice(0, 5);

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <div className="flex items-start gap-8 mb-6">
          {profile.profilePhotoUrl ? (
            <img
              src={profile.profilePhotoUrl}
              alt={`${profile.firstName} ${profile.lastName}`}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0"
              style={{ backgroundColor: "#A51E30" }}
            >
              {profile.firstName.charAt(0)}
              {profile.lastName.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">
              {profile.firstName} {profile.lastName}
            </h1>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`px-4 py-1 rounded-full text-sm font-semibold ${getTrustBadgeColor(
                  profile.trustLevel
                )}`}
              >
                {getTrustLabel(profile.trustLevel)}
              </span>
              <EditProfileButton profileUserId={profile.id} />
            </div>
            <p className="text-gray-600 mb-4">
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            {community && (
              <p className="text-gray-600">
                <strong>Community:</strong> {community}
              </p>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="border-t pt-6">
            <h2 className="font-bold text-lg mb-2">About</h2>
            <p className="text-gray-700">{profile.bio}</p>
          </div>
        )}
      </div>

      {isOwnProfile && !profile.dateOfBirth && (
        <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 shadow-sm">
          <h2 className="text-lg font-semibold">Add your date of birth</h2>
          <p className="mt-2 text-sm leading-6">
            Date of birth is not displayed publicly. It is optional here, but leaving it blank may
            restrict access to some features and it is required before a user can become trusted.
          </p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-flex rounded-full bg-[#8f1d2c] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#7d1927]"
          >
            Update Profile
          </Link>
        </section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-3xl font-bold text-[#46A8CC]">
            {profile.vouchesReceived.length}
          </p>
          <p className="text-sm text-gray-600">Vouches Received</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-3xl font-bold text-[#46A8CC]">{totalPosts}</p>
          <p className="text-sm text-gray-600">Posts</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-3xl font-bold text-[#46A8CC]">
            {profile._count.articles}
          </p>
          <p className="text-sm text-gray-600">News Articles</p>
        </div>
      </div>

      {/* Vouch Section */}
      {profile.trustLevel !== "TRUSTED" && profile.trustLevel !== "SUSPENDED" && (
        <VouchSection
          userId={profile.id}
          firstName={profile.firstName}
          lastName={profile.lastName}
          hasDateOfBirth={!!profile.dateOfBirth}
        />
      )}

      {/* Recent Activity */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>

        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity, idx) => (
              <div
                key={idx}
                className="border-l-4 pl-4 py-2"
                style={{ borderColor: "#A51E30" }}
              >
                <p className="font-semibold">{activity.label}</p>
                <p className="text-sm text-gray-600">
                  {activity.href ? (
                    <Link href={activity.href} className="hover:underline">
                      &ldquo;{activity.title}&rdquo;
                    </Link>
                  ) : (
                    <>&ldquo;{activity.title}&rdquo;</>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {timeAgo(activity.date)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent activity yet.</p>
        )}
      </section>

      <ProfileInteractionControls profileUserId={profile.id} />
    </div>
  );
}
