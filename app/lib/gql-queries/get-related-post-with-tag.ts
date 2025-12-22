/**
 * getRelatedPostsWithTag.ts
 *
 * Fetches related posts based on a given tag while excluding a specific post.
 * Uses GraphQL to query posts with matching tags from the CMS.
 *
 * Features:
 * - Queries posts related to the given tag.
 * - Excludes the current post from results.
 * - Fetches the title, date, excerpt, and featured image.
 *
 * @author FMT Developers
 */

import { TagData } from "@/app/types/tag";
import { gqlFetchAPI } from "./get-fetch-api";

export async function getRelatedPostsWithTag(tag: TagData, databaseId: string) {
  const tags = tag?.edges?.map((edge) => edge.node.slug) || [];

  const query = `
    query GetPosts($first: Int, $where: RootQueryToPostConnectionWhereArgs) {
      posts(first: $first, where: $where) {
        edges {
          node {
            id
            databaseId
            title
            slug
            uri
            date
            dateGmt
            featuredImage {
              node {
                sourceUrl
              }
            }
            excerpt
          }
        }
      }
    }
  `;

  const variables = {
    first: 4,
    where: {
      notIn: [databaseId],
      taxQuery: {
        taxArray: [
          {
            taxonomy: "TAG",
            operator: "IN",
            terms: tags,
            field: "SLUG",
          },
        ],
        relation: "AND",
      },
    },
  };

  try {
    const data = await gqlFetchAPI(query, { variables });
    return data?.posts || { edges: [] };
  } catch (error) {
    console.error("Error fetching post data related:", error);
    return { edges: [] };
  }
}

//To avoid warning only: Default export to satisfy Expo Router
export default function Placeholder() {
  return null;
}
