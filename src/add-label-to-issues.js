import { octokit } from "./lib.js";

async function main() {
  const labelToAdd = process.env["ISSUE_LABEL"];
  const query = process.env["ISSUE_QUERY"];

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const q = `${query} -label:"${labelToAdd}" created:>${twoHoursAgo.toISOString()}`;

  console.log(`Searching issues:\n${q}`);
  const issues = await octokit.paginate(
    octokit.rest.search.issuesAndPullRequests,
    {
      q,
    },
  );
  console.log(`> Found ${issues.length} issues.`);

  if (issues.length) {
    console.log();
    console.log(`Adding label to issues:`);
    for (const issue of issues) {
      const urlParts = issue.html_url.split("/");
      const owner = urlParts[3];
      const repo = urlParts[4];
      const issue_number = issue.number;
      console.log(`> - ${issue.html_url}`);
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [labelToAdd],
      });
    }
  }
}

await main();
