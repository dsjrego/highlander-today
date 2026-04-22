import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import RecipePreview from '@/components/recipes/RecipePreview';
import { authOptions } from '@/lib/auth';
import {
  ADMIN_RECIPE_TABS,
  buildAdminRecipesQuery,
  parseAdminRecipeScope,
  parseAdminRecipeTab,
} from '@/lib/admin-recipes';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

interface AdminRecipeDetailPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    tab?: string;
    page?: string;
    scope?: string;
  };
}

function formatLongDateTime(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'Approved';
    case 'UNPUBLISHED':
      return 'Archived';
    case 'PENDING_REVIEW':
      return 'Pending Review';
    default:
      return 'Draft';
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'UNPUBLISHED':
      return 'bg-slate-200 text-slate-700';
    case 'PENDING_REVIEW':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export default async function AdminRecipeDetailPage({
  params,
  searchParams,
}: AdminRecipeDetailPageProps) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const activeTab = parseAdminRecipeTab(searchParams?.tab);
  const activeScope = parseAdminRecipeScope(searchParams?.scope, isSuperAdmin);

  const recipe = await db.recipe.findUnique({
    where: { id: params.id },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          trustLevel: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      ingredientSections: {
        include: {
          ingredients: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      instructionSteps: {
        orderBy: { sortOrder: 'asc' },
      },
      notes: {
        orderBy: { sortOrder: 'asc' },
      },
      media: {
        orderBy: [{ stepId: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  const canViewAcrossTenants = isSuperAdmin && activeScope === 'all';

  if (!canViewAcrossTenants && currentCommunity && recipe.communityId !== currentCommunity.id) {
    notFound();
  }

  const backQuery = buildAdminRecipesQuery({
    tab: activeTab,
    page: searchParams?.page ? Number.parseInt(searchParams.page, 10) : undefined,
    scope: activeScope,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href={`/admin/recipes?${backQuery}`}
            className="text-sm font-medium text-[var(--brand-primary)] transition hover:text-[var(--brand-accent)]"
          >
            Back to {ADMIN_RECIPE_TABS[activeTab].label}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{recipe.title}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(recipe.status)}`}>
              {getStatusLabel(recipe.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {recipe.community.name}
            {recipe.category ? ` • ${recipe.category.name}` : ''}
            {' • '}
            {recipe.slug}
          </p>
        </div>

        <Link
          href={`/recipes/${recipe.id}`}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          View Recipe Page
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Author</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {recipe.author.firstName} {recipe.author.lastName}
          </p>
          <p className="mt-1 text-xs text-slate-500">{recipe.author.trustLevel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Created</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatLongDateTime(recipe.createdAt)}</p>
          <p className="mt-1 text-xs text-slate-500">Updated {formatLongDateTime(recipe.updatedAt)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Published</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatLongDateTime(recipe.publishedAt)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {recipe.status === 'UNPUBLISHED' ? 'Archived recipe' : getStatusLabel(recipe.status)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recipe Meta</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {recipe.servings ? `${recipe.servings} servings` : recipe.yieldLabel || 'No yield set'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {recipe.totalMinutes ? `${recipe.totalMinutes} total minutes` : 'Timing not set'}
          </p>
        </div>
      </section>

      <RecipePreview
        title={recipe.title}
        excerpt={recipe.excerpt || undefined}
        introHtml={recipe.introHtml || undefined}
        featuredImageUrl={recipe.featuredImageUrl || undefined}
        featuredImageCaption={recipe.featuredImageCaption || undefined}
        categoryName={recipe.category?.name || 'Recipes & Food'}
        author={recipe.author}
        publishedLabel={
          recipe.publishedAt
            ? formatLongDateTime(recipe.publishedAt)
            : recipe.status === 'DRAFT'
              ? 'Draft preview'
              : getStatusLabel(recipe.status)
        }
        yieldLabel={recipe.yieldLabel || undefined}
        servings={recipe.servings || undefined}
        prepMinutes={recipe.prepMinutes || undefined}
        cookMinutes={recipe.cookMinutes || undefined}
        totalMinutes={recipe.totalMinutes || undefined}
        ingredientSections={recipe.ingredientSections.map((section) => ({
          title: section.title || undefined,
          items: section.ingredients.map((ingredient) => ({
            amount: ingredient.amount || undefined,
            unit: ingredient.unit || undefined,
            ingredientName: ingredient.ingredientName,
            preparationNote: ingredient.preparationNote || undefined,
            isOptional: ingredient.isOptional,
            substitutionNote: ingredient.substitutionNote || undefined,
          })),
        }))}
        steps={recipe.instructionSteps.map((step) => {
          const stepMedia = recipe.media.filter((item) => item.stepId === step.id);
          const image = stepMedia.find((item) => item.type === 'IMAGE');
          const video = stepMedia.find((item) => item.type === 'VIDEO_EMBED');

          return {
            title: step.title || undefined,
            body: step.body,
            timerMinutes: step.timerMinutes || undefined,
            imageUrl: image?.imageUrl || undefined,
            videoUrl: video?.embedUrl || undefined,
            mediaCaption: image?.caption || video?.caption || undefined,
          };
        })}
        notes={recipe.notes.map((note) => ({
          kind: note.kind,
          title: note.title || undefined,
          body: note.body,
        }))}
        media={recipe.media
          .filter((item) => item.stepId === null)
          .map((item) => ({
            type: item.type,
            imageUrl: item.imageUrl || undefined,
            embedUrl: item.embedUrl || undefined,
            caption: item.caption || undefined,
            altText: item.altText || undefined,
          }))}
        sourceName={recipe.sourceName || undefined}
        sourceUrl={recipe.sourceUrl || undefined}
      />
    </div>
  );
}
