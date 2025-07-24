import { Post } from "@/app/types/tag";
import { gqlFetchAPI } from "./get-fetch-api";

export async function getRelatedTagPosts(
  tag: string,
  after: string | null = null,
  first: number = 6
): Promise<{
  posts: Post[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  if (!tag || tag.length === 0) {
    // console.warn("No tag provided.");
    return { posts: [], hasNextPage: false, endCursor: null };
  }

  const query = `
    query GetRelatedPosts($first: Int, $after: String, $tagSlug: [String]) {
      posts(first: $first, after: $after, where: { tagSlugIn: $tagSlug }) {
        edges {
          cursor
          node {
            databaseId
            id
            title
            content
            slug
            uri
            date
            dateGmt
            excerpt
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const variables = {
    first,
    after,
    tagSlug: [tag],
  };

  try {
    const data = await gqlFetchAPI(query, { variables });

    const edges = data?.posts?.edges || [];
    const posts = edges.map((edge: any) => edge.node);
    const pageInfo = data?.posts?.pageInfo;

    return {
      posts,
      hasNextPage: pageInfo?.hasNextPage || false,
      endCursor: pageInfo?.endCursor || null,
    };
  } catch (error) {
    console.error(" Error fetching related tag posts:", error);
    return { posts: [], hasNextPage: false, endCursor: null };
  }
}

//To avoid warning only: Default export to satisfy Expo Router
export default function Placeholder() {
  return null;
}