# Agent Notes (Feature Flags Library)

- This is a first-party package; it can be modified to add/improve reusable feature-flag code. Keep code files ≤500 lines each.
- Maintain `CHANGELOG.md` in this folder for every change. Bump the package version (patch/minor as appropriate) and publish a GitHub release with `gh release create` when updating.
- Keep docs/usage examples up to date (`README.md`, `docs/` if present). Update types and exports alongside code changes.
- Favor small, composable helpers; avoid duplicating logic that exists in other libraries.
- Tests or minimal examples are required for new behaviors.
