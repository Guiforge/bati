@AGENTS.md

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
_GS=""
for _D in "${GSTACK_ROOT:-}" "$HOME/.claude/skills/gstack" "$HOME/.codex/skills/gstack" "$HOME/.factory/skills/gstack" "$HOME/.kiro/skills/gstack" "$HOME/.config/opencode/skills/gstack" "$HOME/.slate/skills/gstack" "$HOME/.cursor/skills/gstack" "$HOME/.openclaw/skills/gstack" "$HOME/.hermes/skills/gstack" "$HOME/.gbrain/skills/gstack" "$HOME/.gstack/repos/gstack"; do
  [ -z "$_GS" ] && [ -n "$_D" ] && [ -d "$_D/bin" ] && _GS="$_D"
done
[ -n "$_GS" ] && echo "GSTACK_OK: $_GS" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use the resolved install path above for gstack file paths
(default: ~/.claude/skills/gstack).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

## Machine limits

- Search with `rg` (`rtk rg`), never `grep -r` or `/usr/bin/grep -r` across the repo: it walks
  `node_modules/` and `android/`.
- At most 2 heavy commands at a time (full jest, tsc, Gradle, Blender Cycles), and only one Gradle. Outside agent-team mode that means at most 2 subagents in parallel. In agent-team mode (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), every heavy command goes through `scripts/iso/team/heavy.sh`, which enforces it.
- After any Gradle build (`npx expo run:android`, `npm run android:release`, `./gradlew …`), run
  `cd android && ./gradlew --stop`, so the Gradle (2 GB) and Kotlin (1 GB) daemons don't sit
  idle in memory.
