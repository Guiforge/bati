#!/usr/bin/env bash
# PreToolUse hook for Bash, active only while the village-iso V1 agent team runs (registered in
# .claude/settings.local.json, next to the repo's own guard-bash.sh, which still runs).
#
# Why a hook and not permission rules: heavy.sh runs any command it is given, and a deny rule
# only sees the start of the command text, so `heavy.sh --gradle npm run android:release` would
# slip past `Bash(npm run android:release*)`. This hook scans the whole text, wrappers and
# `bash -c '…'` included. It reads the text before the shell expands it, so it cannot check
# the value of "$S": that is why adb and maestro only go through emu-adb.sh and emu-maestro.sh,
# which resolve the serial themselves and refuse anything that is not an emulator.
#
# Exit 2 cancels the call and sends the reason back to the agent. A false positive (the words
# `git push` inside an `rg` pattern, say) is the price: rephrase the search.

cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

block() {
  echo "BLOCKED by scripts/iso/team/guard-team.sh: $1" >&2
  exit 2
}

# What may precede a command word: start, blank, separator, subshell, quote, slash.
P='(^|[[:space:];&|(`"'"'"'/])'

# 1. Builds and scripts that install on "a" device, which may be the USB phone.
if grep -qE 'android:release|installRelease|installDebug|expo[[:space:]]+run|npm[[:space:]]+run[[:space:]]+(android|ios|release|maestro|screenshots|audit:shots|db:push)([[:space:]]|$)|scripts/(release|maestro|screenshots|audit-shots)\.sh' <<<"$cmd"; then
  block "this build or script installs on whatever device adb picks, possibly Guillaume's phone. Build with scripts/iso/team/gradle-perf.sh, install with scripts/iso/team/emu-adb.sh install -r <apk>."
fi

# 2. Raw adb and maestro: only through the wrappers, which pin an emulator.
while IFS= read -r sub; do
  [ -z "$sub" ] && continue
  case "$sub" in
    devices | version) ;;
    *) block "raw adb is off limits in team mode ('adb $sub'). Use scripts/iso/team/emu-adb.sh <args>: it claims the emulator and refuses any other device." ;;
  esac
done < <(grep -oE "${P}adb[[:space:]]+[^[:space:];&|)]+" <<<"$cmd" | awk '{print $NF}')
if grep -qE "${P}maestro([[:space:]]|$)" <<<"$cmd"; then
  block "raw maestro is off limits in team mode. Use scripts/iso/team/emu-maestro.sh test <flow>."
fi

# 3. Git: read-only subcommands only. Staging, committing and pushing go through commit.sh and
#    push.sh, which only the lead runs. Each occurrence is checked on its own, global options
#    (`--no-pager`, `-P`, `--git-dir=…`, `-C dir`, `-c k=v`) skipped, so neither a harmless
#    `git log` nor an option hides a second, writing git call.
check_git() {
  local -a w
  read -r -a w <<<"$1"
  local i=0 n=${#w[@]}
  local t
  while [ "$i" -lt "$n" ]; do
    t="${w[$i]##*/}"; t="${t#[^[:alnum:]]}"
    [ "$t" = git ] && break
    i=$((i + 1))
  done
  i=$((i + 1))
  while [ "$i" -lt "$n" ]; do
    case "${w[$i]}" in
      -C | -c) i=$((i + 2)) ;;
      -*) i=$((i + 1)) ;;
      *) break ;;
    esac
  done
  local sub="${w[$i]:-}" rest="${w[*]:$((i + 1))}"
  [ -z "$sub" ] && return 0
  case " $rest " in
    *" --output"* | *" -o "*) block "git $sub --output writes a file. Redirect nothing from git; read its output instead." ;;
  esac
  case "$sub" in
    status | diff | log | show | rev-parse | ls-files | ls-tree | rev-list | blame | merge-base | cat-file | check-ignore | describe | shortlog | grep | hash-object) ;;
    branch) [[ "$rest" =~ ^(--show-current|--list|-a|-v|-vv)?$ ]] || block "git branch $rest can delete or move branches. Use 'git branch --show-current'." ;;
    config) [[ "$rest" =~ ^(--get|--list|-l) ]] || block "git config $rest writes settings. Read with 'git config --get <key>'." ;;
    remote) [[ "$rest" =~ ^(-v|show)?([[:space:]].*)?$ ]] && [[ ! "$rest" =~ ^(add|remove|rm|set-url|rename) ]] || block "git remote $rest changes the remotes." ;;
    worktree) [[ "$rest" =~ ^list ]] || block "git worktree $rest changes worktrees." ;;
    stash) [[ "$rest" =~ ^(list|show) ]] || block "git stash $rest moves uncommitted work (yours and other teammates')." ;;
    *) block "git $sub changes the repository or the index. Only the lead stages, commits and pushes, through scripts/iso/team/commit.sh and push.sh." ;;
  esac
}
G="${P}git([[:space:]]+(-[Cc][[:space:]]+[^[:space:]]+|-[a-zA-Z]|--[a-z][a-z-]*(=[^[:space:]]*)?))*[[:space:]]+[a-z][a-z-]*[^;&|)]*"
while IFS= read -r occ; do
  [ -n "$occ" ] && check_git "$occ"
done < <(grep -oE "$G" <<<"$cmd")

# 3b. Scripts that are Guillaume's to run, or that rewrite other owners' files.
C='(^|[;&|(`][[:space:]]*|heavy\.sh[[:space:]]+(--gradle[[:space:]]+)?)'
if grep -qE "${C}((ba)?sh[[:space:]]+)?(\./)?scripts/iso/perf\.sh" <<<"$cmd"; then
  block "perf.sh is Guillaume's, for his phone. Check its syntax with 'bash -n scripts/iso/perf.sh'."
fi
if grep -qE 'npm[[:space:]]+run[[:space:]]+(check|format)([[:space:]]|$)|biome[[:space:]].*--write[[:space:]]+\.([[:space:]]|$)' <<<"$cmd"; then
  block "this rewrites every file in the repo, other teammates' included. Run biome on your own folders: npx biome check --write <your paths>."
fi

# 4. Frozen files: no shell write. The Edit and Write tools are denied on them in settings.
frozen='PROMPT-EQUIPE-V1\.md|CHECKLIST\.md|CRITERES-V1\.md|REVUE-PROMPT\.md|REVUE-UI-PROMPT\.md|VALIDATIONS\.md|iso_audit\.py|audit-thresholds\.json|scripts/iso/team/|settings(\.local)?\.json|\.claude/(hooks|agents)'
writer='(>{1,2}|[[:space:]]tee([[:space:]]+-a)?|sed[[:space:]]+-[a-zA-Z]*i|perl[[:space:]]+-[a-zA-Z]*i|(^|[[:space:]])(mv|cp|rm|truncate|chmod|ln|install|touch)[[:space:]]|dd[[:space:]].*of=)'
while IFS= read -r seg; do
  if grep -qE "${writer}[^;&|]*(${frozen})" <<<"$seg"; then
    block "this command could write a frozen file (checklist, criteria, review prompts, validations, frozen audit, team scripts, settings). Only Guillaume changes them, at a human gate."
  fi
  if grep -qE '(python3?|node)[[:space:]]+-(c|e)' <<<"$seg" && grep -qE "$frozen" <<<"$seg"; then
    block "inline code that names a frozen file. Read it with the Read tool; only Guillaume changes it."
  fi
done < <(sed -E 's/(&&|\|\||;|\|)/\n/g' <<<"$cmd")

# 5. Wide deletions.
if grep -qE '(^|[[:space:];&|])rm[[:space:]]+(-[a-zA-Z]*[[:space:]]+)*-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+(-[a-zA-Z]*[[:space:]]+)*(/|~|~/|\$HOME|\.|\.\.|\./|\*|\.git|android|node_modules|assets|docs|scripts|components|app)/?([[:space:];&|]|$)' <<<"$cmd"; then
  block "wide recursive delete. Delete the exact files you created, by path."
fi

exit 0
