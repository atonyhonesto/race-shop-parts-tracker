# Notes for Claude

Project overview, layout, commands, conventions, remaining work and gotchas live in
[PROJECT_STATUS.md](PROJECT_STATUS.md). Human-facing setup and standards are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Final-phase mode

- Read PROJECT_STATUS.md at session start; treat it as the source of truth. Do not re-scan the codebase.
- Read only files the current task touches; use Grep to locate before opening; read line ranges, not whole files.
- No refactoring or reformatting outside task scope.
- Run only tests relevant to the change.
- Show edits/diffs only; finish each task with "Done: <one line>".
- When a remaining-work item is finished, check it off in PROJECT_STATUS.md.

## Standing rules

- Never run `az` commands that create or change Azure resources; give them to the user.
- Ask before adding any NuGet or npm package.
- Changes go through a branch and PR (`main` is protected); merge only when the user says so.
- Commit messages: Conventional Commits, header ≤ 72 chars, lowercase subject.
