import * as github from "@actions/github";
import * as dotenv from "dotenv";

dotenv.config();

export const octokit = github.getOctokit(process.env["GH_TOKEN"]);

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
