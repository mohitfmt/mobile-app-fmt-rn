// categorySlice.ts
//
// This Redux slice manages the currently selected category in the application.
// It allows users to change the category and updates the Redux state accordingly.
//
// Key responsibilities:
// - Store the selected category ID in Redux state
// - Provide an action to update the selected category
// - Default to the "Home" category (ID: 1)
//
// Usage: Import setSelectedCategory and the reducer to manage category selection in the app.
//
// -----------------------------------------------------------------------------

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// CategoryState: Defines the shape of the category state in Redux.
interface CategoryState {
  selectedCategory: number; // ID of the selected category
}

// initialState: Sets the default selected category.
const initialState: CategoryState = {
  selectedCategory: 1, // Defaults to the first category
};

// categorySlice: Redux slice with reducer for updating selected category.
const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    // setSelectedCategory: Action to update the selected category in state.
    setSelectedCategory(state, action: PayloadAction<number>) {
      state.selectedCategory = action.payload;
    },
  },
});

// Export actions and reducer for use in the Redux store.
export const { setSelectedCategory } = categorySlice.actions;
export default categorySlice.reducer;
