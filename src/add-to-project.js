import {
  addIssueToProject,
  getProjectId,
  getWorkingDaysAgo,
  octokit,
} from "./lib.js";

async function main() {
  const projectOwner = process.env["ISSUE_PROJECT_OWNER"];
  const projectNumber = Number(process.env["ISSUE_PROJECT_NUMBER"]);
  const projectDelay = Number(process.env["ISSUE_PROJECT_DELAY"]) || 0;

  const createdBefore = getWorkingDaysAgo(projectDelay);

  const q = `${
    process.env.ISSUE_PROJECT_QUERY
  } -project:${projectOwner}/${projectNumber} created:<${createdBefore.toISOString()}`;

  console.log(`Searching issues:\n${q}`);
  const issues = await octokit.paginate(
    octokit.rest.search.issuesAndPullRequests,
    {
      q,
    },
  );
  console.log(`> Found ${issues.length} issues.`);

  if (issues.length) {
    const projectId = await getProjectId(projectOwner, projectNumber);
    console.log(
      `> Adding issues to project ${projectOwner}/${projectNumber} (${projectId}):`,
    );
    for (const issue of issues) {
      console.log(`> - ${issue.html_url}`);
      await addIssueToProject(projectId, issue.node_id);
    }
  }
}

await main();
