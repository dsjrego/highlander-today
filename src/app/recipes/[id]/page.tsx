import RecipeDetailClient from './RecipeDetailClient';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RecipeDetailPage(props: PageProps) {
  const params = await props.params;
  return <RecipeDetailClient recipeId={params.id} />;
}
