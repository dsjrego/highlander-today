import { replaceHomepageHeroItem } from '@/lib/homepage-curation';
import type { HomepageBoxData, HomepageContentItem } from '@/lib/homepage';

function article(contentId: string): HomepageContentItem {
  return { contentType: 'ARTICLE', contentId, title: contentId, url: `/local-life/${contentId}` };
}

const previousHero = article('previous-hero');
const nextHero = article('next-hero');
const firstLink = article('first-link');
const secondLink = article('second-link');

function articleBox(overrides: Partial<HomepageBoxData> = {}): HomepageBoxData {
  return {
    id: 'article-box',
    boxType: 'ARTICLES',
    title: 'Local Life',
    description: '',
    contentType: 'ARTICLE',
    sortOrder: 1,
    isVisible: true,
    maxLinks: 5,
    heroItem: previousHero,
    linkItems: [firstLink, secondLink],
    pinnedItems: [],
    availableItems: [],
    ...overrides,
  };
}

describe('homepage article hero replacement', () => {
  it('puts the previous hero first and preserves the remaining link order without mutating the box', () => {
    const box = articleBox();
    const updated = replaceHomepageHeroItem(box, nextHero);

    expect(updated.heroItem).toEqual(nextHero);
    expect(updated.linkItems).toEqual([previousHero, firstLink, secondLink]);
    expect(box.heroItem).toEqual(previousHero);
    expect(box.linkItems).toEqual([firstLink, secondLink]);
  });

  it('drops only the last supporting link when the list is full', () => {
    const links = Array.from({ length: 5 }, (_, index) => article(`link-${index}`));
    const updated = replaceHomepageHeroItem(articleBox({ linkItems: links }), nextHero);

    expect(updated.linkItems).toEqual([previousHero, ...links.slice(0, 4)]);
  });

  it('removes a promoted supporting article and moves an existing previous-hero link to the top once', () => {
    const updated = replaceHomepageHeroItem(
      articleBox({ linkItems: [firstLink, nextHero, previousHero, secondLink] }),
      nextHero
    );

    expect(updated.linkItems).toEqual([previousHero, firstLink, secondLink]);
  });

  it('keeps successive replaced heroes in most-recent-first order before saving', () => {
    const updated = replaceHomepageHeroItem(
      replaceHomepageHeroItem(articleBox(), nextHero),
      article('third-hero')
    );

    expect(updated.linkItems).toEqual([nextHero, previousHero, firstLink, secondLink]);
  });

  it('sets the first hero without adding an empty supporting link', () => {
    const updated = replaceHomepageHeroItem(articleBox({ heroItem: null, linkItems: [] }), nextHero);

    expect(updated.heroItem).toEqual(nextHero);
    expect(updated.linkItems).toEqual([]);
  });

  it('leaves the list alone when the same hero is selected again', () => {
    const box = articleBox();
    expect(replaceHomepageHeroItem(box, { ...previousHero })).toBe(box);
  });

  it('respects a configured supporting-link limit', () => {
    expect(replaceHomepageHeroItem(articleBox({ maxLinks: 1 }), nextHero).linkItems).toEqual([
      previousHero,
    ]);
    expect(replaceHomepageHeroItem(articleBox({ maxLinks: 0 }), nextHero).linkItems).toEqual([]);
  });

  it('preserves replacement behavior for other content boxes', () => {
    const oldRecipe = { ...previousHero, contentType: 'RECIPE' as const };
    const newRecipe = { ...nextHero, contentType: 'RECIPE' as const };
    const recipeLink = { ...firstLink, contentType: 'RECIPE' as const };
    const box = articleBox({
      boxType: 'RECIPES',
      contentType: 'RECIPE',
      heroItem: oldRecipe,
      linkItems: [newRecipe, recipeLink],
    });

    expect(replaceHomepageHeroItem(box, newRecipe).linkItems).toEqual([recipeLink]);
  });
});
