import { gqlFetchAPI } from "./get-fetch-api";

export const fetchSearchPosts = async (
  term: string,
  category: string | null = null,
  size: number = 6,
  offset: number = 0
) => {
  // `fetchSearchPosts called with offset: ${offset}, size: ${size}`;

  const variables = {
    where: {
      search: term,
      offsetPagination: {
        offset: offset,
        size: size,
      },
    },
  };

  const query = `
    query Search($where: RootQueryToPostConnectionWhereArgs) {
      posts(where: $where) {
        edges {
          node {
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
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  try {
    const data = await gqlFetchAPI(query, { variables });

    return data?.posts || null;
  } catch (error) {
    console.error("Error fetching search posts:", error);
    throw error;
  }
};

//To avoid warning only: Default export to satisfy Expo Router
export default function Placeholder() {
  return null;
}
