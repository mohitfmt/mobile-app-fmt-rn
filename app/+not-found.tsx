// +not-found.tsx
//
// This file defines the NotFoundScreen component, which is shown when a user navigates
// to a route that does not exist in the app (404 page). It provides a friendly message
// and a button to return to the home screen. Used by Expo Router for unmatched routes.
//
// Key responsibilities:
// - Display a 404/Not Found message for invalid routes
// - Provide a button to navigate back to the home screen
// - Style the message and button for a user-friendly experience
//
// Usage: This file is automatically used by Expo Router for any route that is not found.
//
// -----------------------------------------------------------------------------

import { Link, Stack } from "expo-router";
import React from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.message}>This screen doesn't exist.</Text>
        <Link href="/" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go to home screen!</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 15,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
