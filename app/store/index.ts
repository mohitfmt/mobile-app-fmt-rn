// store/index.ts
//
// This file sets up the Redux store for the app using Redux Toolkit.
// It combines all reducers (currently only category) and exports the store,
// as well as types for RootState and AppDispatch for use throughout the app.
//
// Key responsibilities:
// - Configure the Redux store with all reducers
// - Export the store for use in the app
// - Export RootState and AppDispatch types for type safety
//
// Usage: Import the store and types to provide Redux state management in the app.
//
// -----------------------------------------------------------------------------

import { configureStore } from "@reduxjs/toolkit";
import categoryReducer from "./categorySlice";

const store = configureStore({
  reducer: {
    category: categoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
