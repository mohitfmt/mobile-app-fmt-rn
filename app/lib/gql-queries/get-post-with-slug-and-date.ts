/**
 * getPostWithSlugAndDate.ts
 *
 * Fetches post data from a GraphQL API using a slug and date.
 *
 * Features:
 * - Queries the CMS GraphQL API for a specific post.
 * - Returns post details including author, categories, tags, and featured image.
 * - Handles API errors gracefully.
 *
 * @author FMT Developers
 */

import { gqlFetchAPI } from "./get-fetch-api";

export async function getPostWithSlugAndDate(
  postSlug: string,
  postDate: string
) {
  const query = `
    query PostWithSlugAndDate($slug: String!, $date: String!) {
      postBySlugAndDate(slug: $slug,date: $date) {
        id
        databaseId
        title
        content
        slug
        uri
        date
        dateGmt
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
              name
              slug
            }
          }
        }
      }
    }
  `;

  const variables = {
    slug: postSlug,
    date: postDate,
  };

  try {
    const data = await gqlFetchAPI(query, { variables });

    return data?.post ? { post: data.post } : null;
  } catch (error) {
    console.error("Error fetching post data:", error);
    return null;
  }
}

//To avoid warning only: Default export to satisfy Expo Router
export default function Placeholder() {
  return null;
}