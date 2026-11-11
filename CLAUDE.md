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

## Session history

- Past session exports are in session-text/.
- Do NOT read these files by default.
- Only when a question involves an earlier decision, discussion, or
  "why" something was done, use Grep to search the logs for relevant
  keywords and read only the matching sections (a few lines around
  each hit).
- Prefer docs/DECISIONS.md first; check the raw logs only if it
  doesn't answer the question.

  ## Session mode: Final-phase maintenance (project ~96% complete)

The architecture, conventions, and most features are done and stable.
Work in this session is narrow: finishing the remaining items, fixing bugs,
and making small refinements. Use as few tokens as possible.

### Context rules

- Do NOT re-scan, re-read, or summarize the whole codebase or earlier
  conversation after each prompt. Assume everything outside the task
  works as built.
- Read only the files the current task directly touches. Use Grep/Glob
  to find the exact spot before opening anything, and read line ranges
  rather than whole files when possible.
- Do not re-read a file you just edited to "verify" it.
- Do not explore neighboring modules, tests, or docs unless the task
  needs them or a change could break them.
- If you need context you don't have, ask me one short question rather
  than reading broadly to find it.

### Remaining work

<list the remaining 4% here, e.g.>

1. ...
2. ...
3. ...

### Output rules

- No restating my request, no plans for trivial changes, no recaps of
  what you did beyond 1-2 lines.
- Show diffs/edits only, not full file contents.
- Run only the tests relevant to the change, not the full suite,
  unless I ask.
- When a task is done, say "Done: <one line>" and stop.

### Stability

- Do not refactor, rename, reformat, or "improve" code outside the
  task scope.
- Follow existing patterns in the file you're editing.
- Flag (don't fix) any unrelated issue you happen to notice.
