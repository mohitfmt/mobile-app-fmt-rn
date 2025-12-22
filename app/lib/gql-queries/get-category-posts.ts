import { PostsVariables } from "@/app/types/mainPage";
import { gqlFetchAPI } from "./get-fetch-api";

const GET_POSTS_HOME = `
  query GetPosts($category: String!, $offset: Int!, $size: Int!) {
    posts(
      where: {
        categoryName: $category
        offsetPagination: { offset: $offset, size: $size }
        excludeQuery: [
          {
            status: PUBLISH
            first: 1
            taxQuery: {
              relation: AND
              taxArray: [
                {
                  field: SLUG
                  operator: AND
                  taxonomy: CATEGORY
                  terms: ["super-highlight"]
                }
              ]
            }
          }
        ]
      }
    ) {
      edges {
        node {
          databaseId
          id
          title
          excerpt
          slug
          uri
          content
          date
          featuredImage {
            node {
              sourceUrl
            }
          }
          categories {
            edges {
              node {
                databaseId
                slug
                name
                id
              }
            }
          }
            tags {
                  edges {
                    node {
                      databaseId
                      slug
                      name
                      id
                    }
                  }
                }
          author {
            node {
              databaseId
              slug
              name
              firstName
              lastName
              avatar {
                url
              }
            }
          }
        }
      }
      pageInfo {
        offsetPagination {
          total
        }
      }
    }
  }
`;

export const GET_POSTS = `
  query GetPosts(
    $first: Int
    $where: RootQueryToPostConnectionWhereArgs
  ) {
    posts(
      first: $first
      where: $where
    ) {
      edges {
        node {
          id
          databaseId
          title
          excerpt
          uri
          date
          dateGmt
          slug
          databaseId
          content
          categories {
            edges {
              node {
                slug
                name
              }
            }
          }
          author {
            node {
              databaseId
              uri
              name
              avatar
              {
                url
              }
            }
          }
          tags(first: 100) {
            edges {
              node {
                id
                databaseId
                name
                slug
                count
                description
              }
            }
          }
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  }
`;

export async function rawGetCategoryPosts(
  category: string,
  offset: number,
  size: number
) {
  try {
    const data = await gqlFetchAPI(GET_POSTS_HOME, {
      variables: {
        category,
        offset,
        size,
      },
    });

    return {
      posts: data?.posts?.edges?.map((e: any) => e.node) || [],
      total: data?.posts?.pageInfo?.offsetPagination?.total || 0,
    };
  } catch (error) {
    console.error(`Error fetching posts for category ${category}`, error);
    return { posts: [], total: 0 };
  }
}

export async function rawGetCategoryPostsExceptHome(variables: PostsVariables) {
  try {
    const data = await gqlFetchAPI(GET_POSTS, {
      variables,
    });
    return {
      posts: data?.posts?.edges?.map((e: any) => e.node) || [],
      total: data?.posts?.pageInfo?.offsetPagination?.total || 0,
    };
  } catch (error) {
    console.error(`Error fetching posts for category`, error);
    return { posts: [], total: 0 };
  }
}
