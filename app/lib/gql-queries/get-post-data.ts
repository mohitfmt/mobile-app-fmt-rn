import axios from "axios";
import { gqlFetchAPI } from "./get-fetch-api";

/**
 * Custom function to check internet connectivity using axios HEAD request.
 */
async function checkInternetConnection(): Promise<boolean> {
  try {
    await axios.head("https://www.google.com", { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches post data from a GraphQL API using a given post ID.
 * Handles errors and network failures gracefully.
 *
 * @param postId - The ID or slug of the post to fetch.
 * @returns {Promise<{ post: any } | { error: string }>} - Returns structured post data or an error message.
 */
export async function getPostData(postId: string) {
  const query = `
    query GetPost($id: ID!, $idType: PostIdType!) {
      post(id: $id, idType: $idType) {
        databaseId
        id
        title
        content
        slug
        uri
        date
        author {
          node {
            name
            slug
            uri
          }
        }
        featuredImage {
          node {
            sourceUrl
          }
        }
        excerpt
        categories {
          edges {
            node {
              name
              slug
            }
          }
        }
        tags {
          edges {
            node {
              slug
              name
            }
          }
        }
      }
    }
  `;

  const variables = {
    id: postId,
    idType: "SLUG",
  };

  const online = await checkInternetConnection();
  if (!online) {
    return {
      error: "No internet connection. Please check your network and try again.",
    };
  }

  try {
    const data = await gqlFetchAPI(query, { variables });

    if (!data || !data.post) {
      return { error: "Post not found or unavailable at the moment." };
    }

    return { post: data.post };
  } catch (error) {
    console.error("Error fetching post data:", error);

    if ((error as Error).message.includes("Network request failed")) {
      return {
        error:
          "Network request failed. Please check your internet connection and try again.",
      };
    }

    return {
      error:
        "Something went wrong while fetching the post. Please try again later.",
    };
  }
}

//To avoid warning only: Default export to satisfy Expo Router
export default function Placeholder() {
  return null;
}
