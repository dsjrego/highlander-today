import RecipeDetailClient from './RecipeDetailClient';

interface PageProps {
  params: {
    id: string;
  };
}

export default function RecipeDetailPage({ params }: PageProps) {
  return <RecipeDetailClient recipeId={params.id} />;
}
