import { addIssueToProject, getProjectId, octokit } from "./lib.js";

async function main() {
  const projectOwner = process.env["ISSUE_PROJECT_OWNER"];
  const projectNumber = Number(process.env["ISSUE_PROJECT_NUMBER"]);

  // Only add issues older than 5 days.
  const createdBefore = new Date();
  createdBefore.setDate(createdBefore.getDate() - 5);

  const q = `org:${projectOwner} is:issue ${
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
