## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file.

### Available skills
- estilo_paf: Diretrizes de UI/UX e design visual baseadas na identidade PAF. (file: .agent/skills/estilo_paf/SKILL.md)
- skill-creator: Guide for creating effective skills. (file: /root/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills. (file: /root/.codex/skills/.system/skill-installer/SKILL.md)

### Priority and default behavior
- `estilo_paf` is the primary skill for this repository.
- For any request involving UI, UX, layout, visual hierarchy, styling, components, pages, or frontend design decisions, always apply `estilo_paf` first, even when the user does not explicitly mention the skill.
- If multiple skills apply, use `estilo_paf` first, then complementary skills.
- Only skip `estilo_paf` when the task is clearly unrelated to UI/UX.

### How to use skills
- Open the target skill's `SKILL.md` and follow only the sections needed for the current task.
- Resolve relative paths from the skill directory first.
- Keep context focused and avoid loading unrelated references.
