import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import InternalPageHeader from "@/components/shared/InternalPageHeader";
import PageHeaderAvatarDialog from "@/components/shared/PageHeaderAvatarDialog";
import StatusMessage from "@/components/shared/StatusMessage";
import AccountSettingsPanel from "./AccountSettingsPanel";
import ProfileTabs from "./ProfileTabs";
import VouchProfileButton from "./VouchProfileButton";
import VouchSection from "./VouchSection";

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: {
    tab?: string;
  };
}

async function getUserProfile(id: string) {
  const userProfileSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    bio: true,
    profilePhotoUrl: true,
    isDirectoryListed: true,
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
    loginEvents: {
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    },
    vouchesReceived: {
      select: { id: true },
    },
    _count: {
      select: {
        articles: true,
        eventsSubmitted: true,
        helpWantedPosts: true,
        marketplaceListings: true,
      },
    },
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
    eventsSubmitted: {
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        startDatetime: true,
      },
    },
    helpWantedPosts: {
      where: { status: { in: ["PUBLISHED", "FILLED", "CLOSED"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        createdAt: true,
        status: true,
      },
    },
  });

  const user = await db.user.findUnique({
    where: { id },
    select: userProfileSelect,
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

interface ProfileContentCardItem {
  id: string;
  title: string;
  href: string;
  meta: string;
}

interface ProfileContentCardProps {
  title: string;
  description: string;
  emptyMessage: string;
  items: ProfileContentCardItem[];
}

function ProfileContentCard({
  title,
  description,
  emptyMessage,
  items,
}: ProfileContentCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-5">
      <div className="mb-4 space-y-1">
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
              <Link href={item.href} className="font-semibold text-slate-900 hover:underline">
                {item.title}
              </Link>
              <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">{emptyMessage}</p>
      )}
    </section>
  );
}

interface ProfileOwnerCardProps {
  isOwnProfile: boolean;
  ownerTitle: string;
  ownerDescription: string;
  emptyMessage: string;
  items: ProfileContentCardItem[];
}

function ProfileOwnerCard({
  isOwnProfile,
  ownerTitle,
  ownerDescription,
  emptyMessage,
  items,
}: ProfileOwnerCardProps) {
  if (!isOwnProfile) {
    return null;
  }

  return (
    <ProfileContentCard
      title={ownerTitle}
      description={ownerDescription}
      emptyMessage={emptyMessage}
      items={items}
    />
  );
}

export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const profile = await getUserProfile(params.id);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = (session?.user as { id?: string } | undefined)?.id === profile.id;
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "SUPER_ADMIN";

  const community = profile.memberships?.[0]?.community?.name ?? null;
  const lastSeenAt = profile.loginEvents[0]?.createdAt ?? null;
  const headerDescriptionParts = [
    community,
    lastSeenAt ? `Last seen: ${new Date(lastSeenAt).toLocaleDateString()}` : null,
  ].filter(Boolean);
  const headerIcon = (
    <PageHeaderAvatarDialog
      firstName={profile.firstName}
      lastName={profile.lastName}
      profilePhotoUrl={profile.profilePhotoUrl}
      trustLevel={profile.trustLevel}
      className="h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]"
      imageClassName="border-2 border-white/25 shadow-[0_10px_24px_rgba(7,17,26,0.24)]"
      initialsClassName="border-2 border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(155,231,255,0.08))] text-cyan-50/90 text-xl md:text-2xl shadow-[0_10px_24px_rgba(7,17,26,0.24)]"
    />
  );
  const headerActions = (
    <>
      {!isOwnProfile ? (
        <button type="button" aria-label="Report user" title="Report user" className="page-header-action">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 1 1-12.728 0 9 9 0 0 1 12.728 0ZM12 8v4m0 4h.01"
            />
          </svg>
          <span className="page-header-action-label">Report User</span>
        </button>
      ) : null}
      {!isOwnProfile && profile.trustLevel === "REGISTERED" ? (
        <VouchProfileButton
          userId={profile.id}
          firstName={profile.firstName}
          lastName={profile.lastName}
          trustLevel={profile.trustLevel}
          hasDateOfBirth={!!profile.dateOfBirth}
          className="page-header-action"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span className="page-header-action-label">Vouch</span>
        </VouchProfileButton>
      ) : null}
    </>
  );

  const tabCardClass =
    "rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-8";
  const statusCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur";
  const experienceItems: ProfileContentCardItem[] = profile.eventsSubmitted.map((event) => ({
    id: event.id,
    title: event.title,
    href: `/events/${event.id}`,
    meta: new Date(event.startDatetime).toLocaleDateString(),
  }));
  const localLifeItems: ProfileContentCardItem[] = profile.articles.map((article) => ({
    id: article.id,
    title: article.title,
    href: `/local-life/${article.id}`,
    meta: timeAgo(new Date(article.createdAt)),
  }));
  const aboutTab = (
    <div className="space-y-6">
      {isOwnProfile && !profile.dateOfBirth ? (
        <section className={statusCardClass}>
          <StatusMessage
            variant="warning"
            title="Add your date of birth"
            className="rounded-[30px] border-0 shadow-none"
          >
            <p>
              Date of birth is not displayed publicly. It is optional here, but leaving it blank
              may restrict access to some features and it is required before a user can become
              trusted. Edit your profile to add it.
            </p>
          </StatusMessage>
        </section>
      ) : null}

      {profile.trustLevel === "REGISTERED" ? (
        <VouchSection
          userId={profile.id}
          firstName={profile.firstName}
          lastName={profile.lastName}
          trustLevel={profile.trustLevel}
          hasDateOfBirth={!!profile.dateOfBirth}
        />
      ) : null}

      <section className={tabCardClass}>
        <p className="text-gray-700">
          {profile.bio || "This user has not added a biography yet."}
        </p>
      </section>
    </div>
  );

  const eventsTab = (
    <section className={tabCardClass}>
      <div className="space-y-6">
        {isOwnProfile ? (
          <ProfileOwnerCard
            isOwnProfile={isOwnProfile}
            ownerTitle="Manage Events"
            ownerDescription="For now this mirrors your published events. Later this card can become an event management surface."
            emptyMessage="You have no published events yet."
            items={experienceItems}
          />
        ) : (
          <ProfileContentCard
            title={`${profile.firstName}'s Events`}
            description="Browse the events this member has shared."
            emptyMessage="No published events yet."
            items={experienceItems}
          />
        )}
      </div>
    </section>
  );

  const articlesTab = (
    <section className={tabCardClass}>
      <div className="space-y-6">
        {isOwnProfile ? (
          <ProfileOwnerCard
            isOwnProfile={isOwnProfile}
            ownerTitle="Manage Articles"
            ownerDescription="For now this mirrors your published Local Life posts. Later this card can become an editing and management surface."
            emptyMessage="You have no articles to manage yet."
            items={localLifeItems}
          />
        ) : (
          <ProfileContentCard
            title={`${profile.firstName}'s Articles`}
            description="Browse the articles this member has published."
            emptyMessage="No published articles yet."
            items={localLifeItems}
          />
        )}
      </div>
    </section>
  );

  const accountSettingsTab = isOwnProfile || isSuperAdmin ? (
    <section className={tabCardClass}>
      <AccountSettingsPanel
        initialDirectoryListed={profile.isDirectoryListed}
        targetUserId={isOwnProfile ? undefined : profile.id}
      />
    </section>
  ) : null;

  return (
    <div className="space-y-8">
      <InternalPageHeader
        icon={headerIcon}
        title={`${profile.firstName} ${profile.lastName}`}
        description={headerDescriptionParts.join(" • ")}
        mobileAlign="start"
        compactMobile
        className="px-[2px] py-[2px] md:px-[6px] md:py-[4px]"
        innerClassName="gap-[3px] md:gap-[4px]"
        mainClassName="gap-[6px] md:gap-[8px]"
        iconClassName="self-center"
        contentClassName="py-0"
        actionsClassName="gap-[4px]"
        actions={headerActions}
        titleClassName="text-white"
      />
      <ProfileTabs
        initialActiveTabId={searchParams?.tab}
        tabs={[
          { id: "account-settings", label: "Account Settings", content: accountSettingsTab },
          { id: "about", label: "About", content: isOwnProfile ? null : aboutTab },
          { id: "articles", label: "Articles", content: articlesTab },
          { id: "events", label: "Events", content: eventsTab },
        ]}
      />
    </div>
  );
}
