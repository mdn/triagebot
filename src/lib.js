import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";

import "dotenv/config";

const CustomOctokit = Octokit.plugin(
  paginateRest,
  restEndpointMethods,
  retry,
  throttling,
);

const RETRY_COUNT = 10;

export const octokit = new CustomOctokit({
  auth: process.env["GH_TOKEN"],
  throttle: {
    onRateLimit: (retryAfter, options, octokit, retryCount) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`,
      );

      if (retryCount < RETRY_COUNT) {
        octokit.log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onSecondaryRateLimit: (retryAfter, options, octokit, retryCount) => {
      octokit.log.warn(
        `SecondaryRateLimit detected for request ${options.method} ${options.url}`,
      );

      if (retryCount < RETRY_COUNT) {
        octokit.log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
  },
});

export async function getProjectId(owner, number) {
  const ownerTypeQuery = "organization";

  // Based on: https://github.com/actions/add-to-project/blob/d8e41a41861baa4c7af88a39f7692681e89f6668/src/add-to-project.ts#L94-L109
  const res = await (
    await octokit.graphql
  )(
    `query getProject($projectOwnerName: String!, $projectNumber: Int!) {
          ${ownerTypeQuery}(login: $projectOwnerName) {
          projectV2(number: $projectNumber) {
            id
          }
        }
      }`,
    {
      projectOwnerName: owner,
      projectNumber: number,
    },
  );

  const projectId = res[ownerTypeQuery]?.projectV2.id;

  return projectId;
}

export async function addIssueToProject(projectId, contentId) {
  // Based on: https://github.com/actions/add-to-project/blob/d8e41a41861baa4c7af88a39f7692681e89f6668/src/add-to-project.ts#L140-L157
  const res = await octokit.graphql(
    `mutation addIssueToProject($input: AddProjectV2ItemByIdInput!) {
        addProjectV2ItemById(input: $input) {
          item {
            id
          }
        }
      }`,
    {
      input: {
        projectId,
        contentId,
      },
    },
  );

  return res.addProjectV2ItemById.item.id;
}

export function getWorkingDaysAgo(daysAgo) {
  const date = new Date();

  for (let i = 0; i < daysAgo; i++) {
    do {
      date.setDate(date.getDate() - 1);
    } while ([0, 6].includes(date.getDay()));
  }

  return date;
}

/**
 * @param {string} orgName
 * @param {number} projectNumber
 * @returns {object}
 */
export async function getProjectFields(orgName, projectNumber) {
  const res = await octokit.graphql(
    `query($orgName: String!, $projectNumber: Int!) {
            organization(login: $orgName) {
                projectV2(number: $projectNumber) {
                    fields (first: 100) {
                        nodes {
                            __typename,
                            ... on ProjectV2FieldCommon {
                                createdAt,
                                dataType,
                                id
                                name,
                                updatedAt
                            }
                            ... on ProjectV2IterationField {
                              id
                            }
                            ... on ProjectV2SingleSelectField {
                                options {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }`,
    {
      orgName,
      projectNumber,
    },
  );

  return res.organization.projectV2.fields.nodes;
}

/**
 * @param {string} org
 * @param {number} projectId
 * @param {number} itemId
 * @param {string} fieldName
 * @param {string} textValue
 * @returns {string}
 */
export async function setProjectItemFieldValue(
  projectId,
  itemId,
  fieldId,
  value,
) {
  const res = await octokit.graphql(
    `mutation($input: UpdateProjectV2ItemFieldValueInput!) {
            updateProjectV2ItemFieldValue(input: $input) {
              projectV2Item {
                id
              }
            }
          }`,
    {
      input: {
        projectId,
        itemId,
        fieldId,
        value,
      },
    },
  );

  return res.updateProjectV2ItemFieldValue.projectV2Item.id;
}

/**
 * @param {string} orgName
 * @param {number} projectNumber
 */
export async function* iterateProjectItems(orgName, projectNumber) {
  let cursor = "";
  let pageInfo = null;
  do {
    const res = await octokit.graphql(
      `query ($orgName: String!, $projectNumber: Int!, $cursor: String) {
        organization(login: $orgName) {
          projectV2(number: $projectNumber) {
            items(after: $cursor, first: 100) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                cursor
                node {
                  createdAt
                  id
                  updatedAt
                  fieldValues(first: 100) {
                    nodes {
                      __typename
                      ... on ProjectV2ItemFieldValueCommon {
                        createdAt
                        creator {
                          login
                        }
                        field {
                          __typename
                          ... on ProjectV2FieldCommon {
                            createdAt
                            dataType
                            name
                            updatedAt
                          }
                          ... on ProjectV2IterationField {
                            id
                          }
                          ... on ProjectV2SingleSelectField {
                            options {
                              id
                              name
                            }
                          }
                        }
                        id
                        updatedAt
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        optionId
                      }
                      ... on ProjectV2ItemFieldTextValue {
                        text
                      }
                    }
                  }
                  content {
                    __typename
                    ... on Node {
                      id
                    }
                    ... on DraftIssue {
                      createdAt
                      creator {
                        login
                      }
                      updatedAt
                    }
                    ... on Issue {
                      author {
                        login
                      }
                      createdAt
                      updatedAt
                      closedAt
                      comments(last: 1) {
                        nodes {
                          author {
                            login
                          }
                        }
                      }
                    }
                    ... on PullRequest {
                      author {
                        login
                      }
                      createdAt
                      mergedAt
                      mergedBy {
                        login
                      }
                      updatedAt
                      closedAt
                      comments(last: 1) {
                        nodes {
                          author {
                            login
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      {
        orgName,
        projectNumber,
        cursor,
      },
    );
    const { projectV2 } = res.organization;
    const { items } = projectV2;
    pageInfo = items.pageInfo;
    for (const edge of items.edges) {
      yield edge.node;
    }
    cursor = pageInfo.endCursor;
  } while (pageInfo.hasNextPage);
}

export function extractISODate(dateValue) {
  if (!dateValue) {
    return dateValue;
  }
  return new Date(dateValue).toISOString().split("T")[0];
}

/**
 * Redacts the repository name in a URL for private repositories.
 * @param {string} url - The original URL
 * @returns {string} The URL with redacted repo name
 */
export function redactPrivateRepoUrl(url) {
  // Parse the URL to extract and redact the repo name
  // Format: https://github.com/owner/repo/issues/123
  const match = url.match(
    /^(https:\/\/github\.com\/[^\/]+\/)([^\/])([^\/]*?)([^\/])?(\/.*)/,
  );
  if (!match) return url;

  const [, prefix, first, middle, last, suffix] = match;

  // For 1-2 character names, redact completely
  if (!last || middle === "") {
    return `${prefix}${"*".repeat(last ? 2 : 1)}${suffix}`;
  }

  // Keep first and last char, replace alphanumeric chars with *, keep dots and dashes
  const redacted = `${first}${middle.replace(/[a-zA-Z0-9]/g, "*")}${last}`;
  return `${prefix}${redacted}${suffix}`;
}
