import { PrismaClient, PlaceType } from '@prisma/client';

type SeedPlaceInput = {
  name: string;
  displayName?: string;
  slug: string;
  type: PlaceType;
  countryCode?: string;
  admin1Code?: string;
  admin1Name?: string;
  admin2Name?: string;
  parentSlug?: string | null;
  aliases?: string[];
};

const PENNSYLVANIA_STATE: SeedPlaceInput = {
  name: 'Pennsylvania',
  displayName: 'Pennsylvania',
  slug: 'pa',
  type: PlaceType.STATE,
  countryCode: 'US',
  admin1Code: 'PA',
  admin1Name: 'Pennsylvania',
};

const PENNSYLVANIA_COUNTIES: SeedPlaceInput[] = [
  'Adams',
  'Allegheny',
  'Armstrong',
  'Beaver',
  'Bedford',
  'Berks',
  'Blair',
  'Bradford',
  'Bucks',
  'Butler',
  'Cambria',
  'Cameron',
  'Carbon',
  'Centre',
  'Chester',
  'Clarion',
  'Clearfield',
  'Clinton',
  'Columbia',
  'Crawford',
  'Cumberland',
  'Dauphin',
  'Delaware',
  'Elk',
  'Erie',
  'Fayette',
  'Forest',
  'Franklin',
  'Fulton',
  'Greene',
  'Huntingdon',
  'Indiana',
  'Jefferson',
  'Juniata',
  'Lackawanna',
  'Lancaster',
  'Lawrence',
  'Lebanon',
  'Lehigh',
  'Luzerne',
  'Lycoming',
  'McKean',
  'Mercer',
  'Mifflin',
  'Monroe',
  'Montgomery',
  'Montour',
  'Northampton',
  'Northumberland',
  'Perry',
  'Philadelphia',
  'Pike',
  'Potter',
  'Schuylkill',
  'Snyder',
  'Somerset',
  'Sullivan',
  'Susquehanna',
  'Tioga',
  'Union',
  'Venango',
  'Warren',
  'Washington',
  'Wayne',
  'Westmoreland',
  'Wyoming',
  'York',
].map((name) => ({
  name: `${name} County`,
  displayName: `${name} County, Pennsylvania`,
  slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-county-pa`,
  type: PlaceType.COUNTY,
  countryCode: 'US',
  admin1Code: 'PA',
  admin1Name: 'Pennsylvania',
  admin2Name: `${name} County`,
  parentSlug: 'pa',
}));

const INITIAL_PENNSYLVANIA_MUNICIPALITIES: SeedPlaceInput[] = [
  {
    name: 'Patton',
    displayName: 'Patton Borough, Pennsylvania',
    slug: 'patton-borough-pa',
    type: PlaceType.BOROUGH,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Cambria County',
    parentSlug: 'cambria-county-pa',
  },
  {
    name: 'Carrolltown',
    displayName: 'Carrolltown Borough, Pennsylvania',
    slug: 'carrolltown-borough-pa',
    type: PlaceType.BOROUGH,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Cambria County',
    parentSlug: 'cambria-county-pa',
  },
  {
    name: 'Hastings',
    displayName: 'Hastings Borough, Pennsylvania',
    slug: 'hastings-borough-pa',
    type: PlaceType.BOROUGH,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Cambria County',
    parentSlug: 'cambria-county-pa',
  },
  {
    name: 'Northern Cambria',
    displayName: 'Northern Cambria Borough, Pennsylvania',
    slug: 'northern-cambria-borough-pa',
    type: PlaceType.BOROUGH,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Cambria County',
    parentSlug: 'cambria-county-pa',
    aliases: ['Spangler'],
  },
  {
    name: 'Ebensburg',
    displayName: 'Ebensburg Borough, Pennsylvania',
    slug: 'ebensburg-borough-pa',
    type: PlaceType.BOROUGH,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Cambria County',
    parentSlug: 'cambria-county-pa',
  },
  {
    name: 'Johnstown',
    displayName: 'Johnstown, Pennsylvania',
    slug: 'johnstown-pa',
    type: PlaceType.CITY,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Cambria County',
    parentSlug: 'cambria-county-pa',
  },
  {
    name: 'Altoona',
    displayName: 'Altoona, Pennsylvania',
    slug: 'altoona-pa',
    type: PlaceType.CITY,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Blair County',
    parentSlug: 'blair-county-pa',
  },
  {
    name: 'Harrisburg',
    displayName: 'Harrisburg, Pennsylvania',
    slug: 'harrisburg-pa',
    type: PlaceType.CITY,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Dauphin County',
    parentSlug: 'dauphin-county-pa',
  },
  {
    name: 'Pittsburgh',
    displayName: 'Pittsburgh, Pennsylvania',
    slug: 'pittsburgh-pa',
    type: PlaceType.CITY,
    countryCode: 'US',
    admin1Code: 'PA',
    admin1Name: 'Pennsylvania',
    admin2Name: 'Allegheny County',
    parentSlug: 'allegheny-county-pa',
  },
];

async function upsertPlace(prisma: PrismaClient, input: SeedPlaceInput) {
  const parentPlaceId = input.parentSlug
    ? (
        await prisma.place.findUnique({
          where: { slug: input.parentSlug },
          select: { id: true },
        })
      )?.id ?? null
    : null;

  const place = await prisma.place.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      displayName: input.displayName || input.name,
      type: input.type,
      countryCode: input.countryCode || 'US',
      admin1Code: input.admin1Code || null,
      admin1Name: input.admin1Name || null,
      admin2Name: input.admin2Name || null,
      parentPlaceId,
      isSelectable: true,
      isActive: true,
    },
    create: {
      name: input.name,
      displayName: input.displayName || input.name,
      slug: input.slug,
      type: input.type,
      countryCode: input.countryCode || 'US',
      admin1Code: input.admin1Code || null,
      admin1Name: input.admin1Name || null,
      admin2Name: input.admin2Name || null,
      parentPlaceId,
      isSelectable: true,
      isActive: true,
    },
  });

  if (input.aliases?.length) {
    for (const alias of input.aliases) {
      await prisma.placeAlias.upsert({
        where: {
          placeId_alias: {
            placeId: place.id,
            alias,
          },
        },
        update: {
          isSearchable: true,
        },
        create: {
          placeId: place.id,
          alias,
          isSearchable: true,
        },
      });
    }
  }

  return place;
}

export async function seedPlaces(prisma: PrismaClient) {
  await upsertPlace(prisma, PENNSYLVANIA_STATE);

  for (const county of PENNSYLVANIA_COUNTIES) {
    await upsertPlace(prisma, county);
  }

  for (const municipality of INITIAL_PENNSYLVANIA_MUNICIPALITIES) {
    await upsertPlace(prisma, municipality);
  }

  return {
    countiesSeeded: PENNSYLVANIA_COUNTIES.length,
    municipalitiesSeeded: INITIAL_PENNSYLVANIA_MUNICIPALITIES.length,
  };
}
