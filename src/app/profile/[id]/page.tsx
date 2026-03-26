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
import ProfileTabs from "./ProfileTabs";
import VouchProfileButton from "./VouchProfileButton";
import VouchSection from "./VouchSection";

interface PageProps {
  params: {
    id: string;
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

export default async function UserProfilePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const profile = await getUserProfile(params.id);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = (session?.user as { id?: string } | undefined)?.id === profile.id;

  const community = profile.memberships?.[0]?.community?.name ?? null;
  const headerDescriptionParts = [
    community ? `Community: ${community}` : null,
    `Joined ${new Date(profile.createdAt).toLocaleDateString()}`,
  ].filter(Boolean);
  const headerIcon = (
    <PageHeaderAvatarDialog
      firstName={profile.firstName}
      lastName={profile.lastName}
      profilePhotoUrl={profile.profilePhotoUrl}
      trustLevel={profile.trustLevel}
      className="h-20 w-20"
      imageClassName="border-2 border-white/25 shadow-[0_10px_24px_rgba(7,17,26,0.24)]"
      initialsClassName="border-2 border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(155,231,255,0.08))] text-cyan-50/90 text-2xl shadow-[0_10px_24px_rgba(7,17,26,0.24)]"
    />
  );
  const headerActions = (
    <>
      {isOwnProfile ? (
        <Link href="/profile/edit" className="page-header-action">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
          Edit Profile
        </Link>
      ) : null}
      {!isOwnProfile ? (
        <button type="button" className="page-header-action">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 1 1-12.728 0 9 9 0 0 1 12.728 0ZM12 8v4m0 4h.01"
            />
          </svg>
          Report User
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
          Vouch
        </VouchProfileButton>
      ) : null}
    </>
  );

  const tabCardClass =
    "rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-8";
  const statusCardClass =
    "overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur";
  const marketplaceItems: ProfileContentCardItem[] = profile.marketplaceListings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    href: `/marketplace/${listing.id}`,
    meta: timeAgo(new Date(listing.createdAt)),
  }));
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
  const helpWantedItems: ProfileContentCardItem[] = profile.helpWantedPosts.map((post) => ({
    id: post.id,
    title: post.title,
    href: `/help-wanted/${post.id}`,
    meta:
      post.status === "PUBLISHED"
        ? `Open • ${timeAgo(new Date(post.createdAt))}`
        : post.status === "FILLED"
          ? `Filled • ${timeAgo(new Date(post.createdAt))}`
          : `Closed • ${timeAgo(new Date(post.createdAt))}`,
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

  const marketplaceTab = (
    <section className={tabCardClass}>
      <div className="space-y-6">
        {isOwnProfile ? (
          <ProfileOwnerCard
            isOwnProfile={isOwnProfile}
            ownerTitle="Manage Marketplace"
            ownerDescription="For now this mirrors your listings. Later this card can become store and inventory management."
            emptyMessage="You have no marketplace listings to manage yet."
            items={marketplaceItems}
          />
        ) : (
          <ProfileContentCard
            title={`What ${profile.firstName} Is Selling`}
            description="Browse the marketplace listings currently shown on this member's profile."
            emptyMessage="No active listings yet."
            items={marketplaceItems}
          />
        )}
      </div>
    </section>
  );

  const experiencesTab = (
    <section className={tabCardClass}>
      <div className="space-y-6">
        {isOwnProfile ? (
          <ProfileOwnerCard
            isOwnProfile={isOwnProfile}
            ownerTitle="Manage Experiences"
            ownerDescription="For now this mirrors your shared experiences. Later this card can become an experiences management surface."
            emptyMessage="You have no experiences to manage yet."
            items={experienceItems}
          />
        ) : (
          <ProfileContentCard
            title={`${profile.firstName}'s Experiences`}
            description="Browse the experiences this member has shared."
            emptyMessage="No approved experiences yet."
            items={experienceItems}
          />
        )}
      </div>
    </section>
  );

  const localLifeTab = (
    <section className={tabCardClass}>
      <div className="space-y-6">
        {isOwnProfile ? (
          <ProfileOwnerCard
            isOwnProfile={isOwnProfile}
            ownerTitle="Manage Local Life"
            ownerDescription="For now this mirrors your published Local Life posts. Later this card can become an editing and management surface."
            emptyMessage="You have no Local Life posts to manage yet."
            items={localLifeItems}
          />
        ) : (
          <ProfileContentCard
            title={`${profile.firstName}'s Local Life`}
            description="Browse the Local Life posts this member has published."
            emptyMessage="No published Local Life articles yet."
            items={localLifeItems}
          />
        )}
      </div>
    </section>
  );

  const helpWantedTab = (
    <section className={tabCardClass}>
      <div className="space-y-6">
        {isOwnProfile ? (
          <ProfileOwnerCard
            isOwnProfile={isOwnProfile}
            ownerTitle="Manage Help Wanted"
            ownerDescription="For now this mirrors your Help Wanted posts. Later this card can become a hiring and response management surface."
            emptyMessage="You have no Help Wanted posts to manage yet."
            items={helpWantedItems}
          />
        ) : (
          <ProfileContentCard
            title={`${profile.firstName}'s Help Wanted`}
            description="Browse the Help Wanted posts this member has shared."
            emptyMessage="No Help Wanted posts are visible yet."
            items={helpWantedItems}
          />
        )}
      </div>
    </section>
  );

  const accountSettingsTab = isOwnProfile ? (
    <section className={tabCardClass}>
      <h2 className="mb-4 text-2xl font-bold">Account Settings</h2>
      <div className="space-y-4">
        <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
          Change Password
        </button>
        <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
          Email Preferences
        </button>
        <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-red-600 transition hover:bg-slate-50">
          Deactivate Account
        </button>
      </div>
    </section>
  ) : null;

  return (
    <div className="space-y-8">
      <InternalPageHeader
        icon={headerIcon}
        title={`${profile.firstName} ${profile.lastName}`}
        description={headerDescriptionParts.join(" • ")}
        className="px-[4px] py-[4px] md:px-[6px] md:py-[4px]"
        innerClassName="gap-[4px] md:gap-[4px]"
        mainClassName="gap-[4px]"
        iconClassName="self-center"
        contentClassName="py-[1px]"
        actionsClassName="gap-[4px]"
        actions={headerActions}
        titleClassName="text-white"
      />
      <ProfileTabs
        tabs={[
          { id: "about", label: "About", content: aboutTab },
          { id: "marketplace", label: "Marketplace", content: marketplaceTab },
          { id: "experiences", label: "Experiences", content: experiencesTab },
          { id: "local-life", label: "Local Life", content: localLifeTab },
          { id: "help-wanted", label: "Help Wanted", content: helpWantedTab },
          { id: "account-settings", label: "Account Settings", content: accountSettingsTab },
        ]}
      />
    </div>
  );
}
