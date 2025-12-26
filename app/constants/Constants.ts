export const HOME_FETCH_LIMIT = 10;
export const FEATURED_COUNT = 1;
export const REGULAR_COUNT = 5;
export const TOTAL_PER_SECTION = FEATURED_COUNT + REGULAR_COUNT;

// Property tab specific constants
export const PROPERTY_FETCH_LIMIT = 35;
export const PROPERTY_DISPLAY_LIMIT = 30;
export const PROPERTY_AD_INTERVAL = 5;

//load more
export const API_LIMIT_LOAD_MORE = 50;

export const CATEGORY_FETCH_PLAN = [
  { key: "topNewsPosts", slug: "top-news", retry: 10 },
  { key: "businessPosts", slug: "business", retry: 10 },
  { key: "opinionPosts", slug: "opinion", retry: 10 },
  { key: "worldPosts", slug: "world", retry: 8 },
  { key: "leisurePosts", slug: "leisure", retry: 8 },
  { key: "sportsPosts", slug: "sports", retry: 8 },
];

export const categoriesNavigation = [
  {
    path: "news",
    slug: "top-news",
    displayTitle: "News",
    subCategories: [
      {
        title: "Malaysia",
        slug: "nation",
        href: "/category/category/nation/",
      },
      {
        title: "Borneo+",
        slug: "sabahsarawak",
        href: "/category/category/nation/sabahsarawak/",
      },
      {
        title: "Southeast Asia",
        slug: "south-east-asia",
        href: "/category/category/south-east-asia/",
      },
      {
        title: "World",
        slug: "world",
        href: "/category/category/world/",
      },
    ],
    excluedSlugs: [
      {
        first: 5,
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["top-news"],
            },
          ],
          relation: "AND",
        },
      },
    ],
  },
  {
    path: "berita",
    slug: "top-bm",
    displayTitle: "Berita",
    subCategories: [
      {
        title: "Tempatan",
        slug: "tempatan",
        href: "/category/category/bahasa/tempatan/",
      },
      {
        title: "Pandangan",
        slug: "pandangan",
        href: "/category/category/bahasa/pandangan/",
      },
      {
        title: "Dunia",
        slug: "dunia",
        href: "/category/category/bahasa/dunia/",
      },
    ],
    excluedSlugs: [
      {
        first: 1,
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["super-bm"],
            },
          ],
        },
      },
      {
        first: 4,
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["top-bm"],
            },
          ],
        },
      },
    ],
  },
  {
    path: "business",
    slug: "top-business",
    displayTitle: "Business",
    subCategories: [
      {
        title: "World Business",
        slug: "world-business",
        href: "/category/category/business/world-business/",
      },
      {
        title: "Local Business",
        slug: "local-business",
        href: "/category/category/business/local-business/",
      },
    ],
    excluedSlugs: [
      {
        first: 1,
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["super-bm"],
            },
          ],
        },
      },
      {
        first: 5,
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["business"],
            },
          ],
        },
      },
    ],
  },
  {
    path: "lifestyle",
    slug: "top-lifestyle",
    displayTitle: "Lifestyle",
    subCategories: [
      {
        title: "Everyday Heroes",
        slug: "simple-stories",
        href: "/category/category/leisure/simple-stories/",
      },
      {
        title: "Food",
        slug: "food",
        href: "/category/category/leisure/food/",
      },
      {
        title: "Entertainment",
        slug: "entertainment",
        href: "/category/category/leisure/entertainment/",
      },
      {
        title: "Health & Family",
        slug: "health",
        href: "/category/category/leisure/health/",
      },
      {
        title: "Money",
        slug: "money",
        href: "/category/category/leisure/money/",
      },
      {
        title: "Travel",
        slug: "travel",
        href: "/category/category/leisure/travel/",
      },
      {
        title: "Tech",
        slug: "tech",
        href: "/category/category/leisure/tech/",
      },
      {
        title: "Pets",
        slug: "pets",
        href: "/category/category/leisure/pets/",
      },
    ],
    excluedSlugs: [
      {
        first: 1,
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["top-lifestyle"],
            },
          ],
          relation: "AND",
        },
      },
      {
        first: 4,
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["leisure"],
            },
          ],
          relation: "AND",
        },
      },
    ],
  },
  {
    path: "opinion",
    slug: "opinion",
    displayTitle: "Opinion",
    subCategories: [
      {
        title: "Behind the Bylines",
        slug: "editorial",
        href: "/category/category/opinion/editorial/",
      },
      {
        title: "Column",
        slug: "column",
        href: "/category/category/opinion/column/",
      },
      {
        title: "Letters",
        slug: "letters",
        href: "/category/category/opinion/letters/",
      },
    ],
    excluedSlugs: [
      {
        first: 5,
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["opinion"],
            },
          ],
          relation: "AND",
        },
      },
    ],
  },
  {
    path: "sports",
    slug: "sports",
    displayTitle: "Sports",
    subCategories: [
      {
        title: "Football",
        slug: "football",
        href: "/category/category/sports/football/",
      },
      {
        title: "Badminton",
        slug: "badminton",
        href: "/category/category/sports/badminton/",
      },
      {
        title: "Motorsports",
        slug: "motorsports",
        href: "/category/category/sports/motorsports/",
      },
      {
        title: "Tennis",
        slug: "tennis",
        href: "/category/category/sports/tennis/",
      },
    ],
    excluedSlugs: [
      {
        first: 5,
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["sports"],
            },
          ],
          relation: "AND",
        },
      },
    ],
  },
  {
    path: "world",
    slug: "world",
    displayTitle: "World",
    subCategories: [
      {
        title: "World",
        slug: "world",
        href: "/category/category/world/",
      },
      {
        title: "Southeast Asia",
        slug: "south-east-asia",
        href: "/category/category/south-east-asia/",
      },
    ],
    excluedSlugs: [
      {
        first: 5,
        status: "PUBLISH",
        taxQuery: {
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["world"],
            },
          ],
          relation: "AND",
        },
      },
    ],
  },
];
