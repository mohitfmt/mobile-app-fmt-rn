// categories.ts
//
// This file defines the list of categories and subcategories used throughout the app.
// It exports both a flat list (categories) and a detailed list with subcategories (categoriesList).
//
// Key responsibilities:
// - Provide category and subcategory definitions for navigation and filtering
// - Export lists for use in tab navigation, sidebars, and filtering logic
//
// Usage: Import categories or categoriesList to display or work with app categories.
//
// -----------------------------------------------------------------------------

export const categoriesList = [
  {
    id: 1,
    title: "Home",
  },
  {
    id: 2,
    title: "News",
    items: [
      {
        id: 21,
        title: "Malaysia",
      },
      {
        id: 22,
        title: "Borneo+",
      },
    ],
  },
  {
    id: 3,
    title: "Berita",
    items: [
      {
        id: 31,
        title: "Tempatan",
      },
      {
        id: 32,
        title: "Pandangan",
      },
      {
        id: 33,
        title: "Dunia",
      },
    ],
  },
  {
    id: 4,
    title: "Opinion",
    items: [
      {
        id: 61,
        title: "Column",
      },
      {
        id: 62,
        title: "Behind the Bylines",
      },
      {
        id: 63,
        title: "Letters",
      },
      {
        id: 64,
        title: "FMT Worldviews",
      },
    ],
  },
  {
    id: 5,
    title: "World",
    items: [
      {
        id: 71,
        title: "Southeast Asia",
      },
    ],
  },
  {
    id: 6,
    title: "Business",
    items: [
      {
        id: 41,
        title: "Local Business",
      },
      {
        id: 42,
        title: "World Business",
      },
    ],
  },
  {
    id: 7,
    title: "Property",
  },
  {
    id: 8,
    title: "Sports",
    items: [
      {
        id: 81,
        title: "Football",
      },
      {
        id: 82,
        title: "Badminton",
      },
      {
        id: 83,
        title: "Motorsports",
      },
      {
        id: 84,
        title: "Tennis",
      },
    ],
  },
  {
    id: 9,
    title: "Lifestyle",
    items: [
      {
        id: 51,
        title: "Everyday Heroes",
      },
      {
        id: 52,
        title: "Travel",
      },
      {
        id: 53,
        title: "Food",
      },
      {
        id: 54,
        title: "Entertainment",
      },
      {
        id: 55,
        title: "Money",
      },
      {
        id: 56,
        title: "Health & Family",
      },
      {
        id: 57,
        title: "Pets",
      },
      {
        id: 58,
        title: "Tech",
      },
      {
        id: 59,
        title: "Automotive",
      },
    ],
  },
  {
    id: 10,
    title: "Videos",
  },
];

export const categories = [
  { id: 1, title: "Home" },
  { id: 2, title: "News" },
  { id: 3, title: "Berita" },
  { id: 4, title: "Opinion" },
  { id: 5, title: "World" },
  { id: 6, title: "Business" },
  { id: 7, title: "Property" },
  { id: 8, title: "Sports" },
  { id: 9, title: "Lifestyle" },
  { id: 10, title: "Videos" },
];

// Default export: Dummy function for Expo Router compatibility.
export default function Categories() {
  return null;
}
