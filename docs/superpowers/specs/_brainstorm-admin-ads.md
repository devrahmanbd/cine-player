# Brainstorming checklist — Admin ad controls (enable ads + ad type)

Source: obra/brainstorming skill. Update status as each item completes.

- [x] 1. Explore project context — findings: Ads tab exists (per-slot checkbox+textarea, 10 slots, all enabled=0); wiring: popunder/socialbar=global inject, native=Discover, banner_728=Board, banner_468=MetaDetails; DEAD: banner_300x250/160x600/160x300/320x50 + smartlink (getSmartlink exported, zero consumers); adblock wall already exists and fires regardless of ads-enabled (bug)
- [~] 2. Visual companion — SKIPPED: remaining questions are conceptual trade-offs, not visual (layout of a simple form doesn't need mockups)
- [x] 3. Clarifying questions (3 asked, all answered):
  - Q1 meaning → "Master switch + type picker (no raw HTML editing)"
  - Q2 types → "All the existing ads types should be there"
  - Q3 smartlink → "Smart system to avoid blocker, and get more monetization value - money"
- [x] 4. Propose 2-3 approaches — A layered (rec) / B +proxy / C campaign-system. **User chose A: "easiest and quickest method"** (B deferred)
- [x] 5. Present design — presented; smartlink debated → Adsterra's own format pages (user-supplied) confirm 5-format lineup parity → **keep smartlink + Board CTA**. User: "complete it" = approval + delegate the rest of the flow
- [ ] 6. Write design doc → docs/superpowers/specs/2026-10-29-admin-ad-controls-design.md, commit
- [ ] 6. Write design doc → docs/superpowers/specs/YYYY-MM-DD-admin-ad-controls-design.md, commit
- [ ] 7. Spec review loop (spec-document-reviewer subagent, max 5 iterations)
- [ ] 8. User reviews written spec
- [ ] 9. Invoke writing-plans skill (terminal state — no implementation skills before this)
