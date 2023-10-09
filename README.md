# mdn-triagebot

Supports the MDN core team with triaging tasks.

## Quickstart

1. Copy the `.env.dist` to `.env`.
2. Set `GH_TOKEN` in `.env` to a personal access token.

### Task: Issue project management

Setup:

1. Set `ISSUE_PROJECT_NUMBER` to the number of the target project.
2. Adjust `ISSUE_PROJECT_QUERY`, if necessary.

Run `npm run add-to-project` to add all issues matching the query to the project.

## Acknowledgement

Parts of the code are based on the [actions/add-to-project](https://github.com/actions/add-to-project) GitHub action.

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
