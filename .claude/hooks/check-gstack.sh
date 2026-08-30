#!/bin/bash
# Block skill usage when gstack is not installed globally.
#
# Resolve the install root the way gstack skill preambles do: the GSTACK_ROOT
# env var first, then every host's global install location, then the migrated
# repo location. Block only when NONE exist (#2500 — hardcoding
# ~/.claude/skills/gstack false-blocked Codex-host and migrated-repo installs).
_GSTACK_ROOT=""
for _D in "${GSTACK_ROOT:-}" "$HOME/.claude/skills/gstack" "$HOME/.codex/skills/gstack" "$HOME/.factory/skills/gstack" "$HOME/.kiro/skills/gstack" "$HOME/.config/opencode/skills/gstack" "$HOME/.slate/skills/gstack" "$HOME/.cursor/skills/gstack" "$HOME/.openclaw/skills/gstack" "$HOME/.hermes/skills/gstack" "$HOME/.gbrain/skills/gstack" "$HOME/.gstack/repos/gstack"; do
  [ -z "$_GSTACK_ROOT" ] && [ -n "$_D" ] && [ -d "$_D/bin" ] && _GSTACK_ROOT="$_D"
done

if [ -z "$_GSTACK_ROOT" ]; then
  cat >&2 <<'MSG'
BLOCKED: gstack is not installed globally.

gstack is required for AI-assisted work in this repo.

Install it:
  git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
  cd ~/.claude/skills/gstack && ./setup --team

Then restart your AI coding tool.
MSG
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"gstack is required but not installed. See stderr for install instructions."}}'
  exit 2
fi

echo '{}'
