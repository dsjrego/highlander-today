import type { HomepageBoxData, HomepageContentItem } from './homepage';

function isSameItem(left: HomepageContentItem, right: HomepageContentItem) {
  return left.contentType === right.contentType && left.contentId === right.contentId;
}

export function replaceHomepageHeroItem(
  box: HomepageBoxData,
  item: HomepageContentItem
): HomepageBoxData {
  if (box.heroItem && isSameItem(box.heroItem, item)) {
    return box;
  }

  let linkItems = box.linkItems.filter((linkItem) => !isSameItem(linkItem, item));

  if (box.boxType === 'ARTICLES' && box.heroItem) {
    const previousHero = box.heroItem;
    linkItems = [
      previousHero,
      ...linkItems.filter((linkItem) => !isSameItem(linkItem, previousHero)),
    ].slice(0, box.maxLinks);
  }

  return { ...box, heroItem: item, linkItems };
}
