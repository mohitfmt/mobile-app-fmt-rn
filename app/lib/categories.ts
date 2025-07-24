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
  { id: 1, title: "Home" },
  { id: 2, title: "News", subcategories: ["Malaysia", "Borneo+"] },
  { id: 3, title: "Berita", subcategories: ["Tempatan", "Pandangan", "Dunia"] },
  {
    id: 4,
    title: "Opinion",
    subcategories: ["All Opinions", "Column", "Editorial", "Letters"],
  },
  { id: 5, title: "World", subcategories: ["South East Asia"] },
  {
    id: 6,
    title: "Business",
    subcategories: ["All Business", "Local Business", "World Business"],
  },
  { id: 7, title: "Property", subcategories: ["All Property"] },
  {
    id: 8,
    title: "Sports",
    subcategories: [
      "All Sports",
      "Football",
      "Badminton",
      "MotorSports",
      "Tennis",
    ],
  },
  {
    id: 9,
    title: "Lifestyle",
    subcategories: [
      "All Lifestyle",
      "Simple Stories",
      "Travel",
      "Food",
      "Entertainment",
      "Money",
      "Health & Family",
      "Pets",
      "Automotive",
    ],
  },
  {
    id: 10,
    title: "Videos",
    subcategories: [
      "Fmt News",
      "Fmt Lifestyle",
      "Fmt Exclusive",
      "Fmt News Capsule",
    ],
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
