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
- [x] 6. Design doc written → docs/superpowers/specs/2026-10-29-admin-ad-controls-design.md, committed (ad8b5566)
- [x] 7. Spec review loop — iteration 1: PASS w/ 8 minors (all fixed); iteration 2: PASS (1 stale-phrase fix, 06c06227)
- [~] 8. User spec review — user instructed "complete it" (delegated); spec committed for their reference, proceeding on that authority
- [x] 9. writing-plans skill invoked → plan written + self-reviewed → docs/superpowers/plans/2026-10-29-admin-ad-controls.md (6 tasks). Execution method: user's "complete it" = native in-session (executing-plans)
