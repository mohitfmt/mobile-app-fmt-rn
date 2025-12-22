export const HOME_FETCH_LIMIT = 10;
export const FEATURED_COUNT = 1;
export const REGULAR_COUNT = 5;
export const TOTAL_PER_SECTION = FEATURED_COUNT + REGULAR_COUNT;

// Property tab specific constants
export const PROPERTY_FETCH_LIMIT = 35;
export const PROPERTY_DISPLAY_LIMIT = 30;
export const PROPERTY_AD_INTERVAL = 5;

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
  },
  {
    path: "berita",
    slug: "top-bm",
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
  },
  {
    path: "business",
    slug: "top-business",
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
  },
  {
    path: "lifestyle",
    slug: "top-lifestyle",
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
  },
  {
    path: "opinion",
    slug: "opinion",
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
  },
  {
    path: "sports",
    slug: "sports",
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
  },
  {
    path: "world",
    slug: "world",
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
  },
];
