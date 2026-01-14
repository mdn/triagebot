import {
  addIssueToProject,
  getProjectId,
  getWorkingDaysAgo,
  octokit,
  redactPrivateRepoUrl,
} from "./lib.js";

async function main() {
  const projectOwner = process.env["ISSUE_PROJECT_OWNER"];
  const projectNumber = Number(process.env["ISSUE_PROJECT_NUMBER"]);
  const projectDelay = Number(process.env["ISSUE_PROJECT_DELAY"]) || 0;
  const queries = process.env.ISSUE_PROJECT_QUERY.trim()
    .split("\n")
    .filter(Boolean);

  const createdBefore = getWorkingDaysAgo(projectDelay);

  for (const query of queries) {
    const q = `${query} -project:${projectOwner}/${projectNumber} created:<${createdBefore.toISOString()}`;

    console.log(`Searching issues:\n${q}`);
    const issues = await octokit.paginate(
      octokit.rest.search.issuesAndPullRequests,
      {
        q,
        advanced_search: true,
      },
    );
    console.log(`> Found ${issues.length} issues.`);

    if (issues.length) {
      console.log();
      const projectId = await getProjectId(projectOwner, projectNumber);
      console.log(
        `Adding issues to project https://github.com/orgs/${projectOwner}/projects/${projectNumber} (${projectId}):`,
      );
      for (const issue of issues) {
        const displayUrl = issue.repository?.private
          ? redactPrivateRepoUrl(issue.html_url)
          : issue.html_url;
        console.log(`> - ${displayUrl}`);
        await addIssueToProject(projectId, issue.node_id);
      }
    }
    console.log();
  }
}

await main();
