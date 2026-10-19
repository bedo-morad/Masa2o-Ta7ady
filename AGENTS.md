## Agent skills

### Issue tracker

Issues live in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

### Owner's refactoring priorities

Follow `docs/CODE_STANDARDS.md`, especially its refactoring quality goals. The
owner prioritizes readable, manageable, maintainable, robust, reliable code and,
above all, containment: related decisions stay together, with little duplication
or dependency leakage. Do not replace spaghetti with different spaghetti, move a
large component wholesale into another large component, or fragment a coherent
flow merely to reduce line counts. Prefer practical improvements over perfection.
Structural refactors must preserve each game's distinct rules and scoring;
shared mechanics do not imply shared game policy. Reuse behavior tests and add
characterization only for gaps before moving logic. These priorities draw on
IBM's code-quality guidance: https://www.ibm.com/think/topics/code-quality.

V4.5 is currently planning only. Ignore `docs/SPECV5.md` entirely; the owner will
edit it later. Individual implementation tickets require approval of their
breakdown before publication.
