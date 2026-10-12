# Homepage design research

Checked 10 October 2026. Scope: public homepage designs in `design.pen`, Romanian and English, desktop and mobile.

## What the research suggests

These are design judgments informed by the sources below, not usability-test results or representative survey findings. Reddit feedback is anecdotal; comments that explicitly promote the author's own product were not used as independent endorsements.

| Source | Observation | Applied change |
| --- | --- | --- |
| [Bridebook homepage](https://bridebook.com/uk) | Names the product category immediately and presents checklist, budget, and guest-list tools explicitly. | Hero says this is an online wedding organizer; a row names the four available planning areas. |
| [Zola homepage](https://www.zola.com/) | Explains its offer through concrete jobs and dedicated product sections. | Separate checklist, budget, and guest previews show recognizable planning work. |
| [Joy guest-list page](https://withjoy.com/guest-list/) | Demonstrates household organization, RSVPs, and collaboration, with explanations of the workflow. | Guest preview includes household responses; a dedicated section explains shared planning. |
| [A Practical Wedding planning resources](https://apracticalwedding.com/planner/) | Encourages priorities before details and offers flexible budgets, guest lists, and supplier records. | Added a simple starting sequence and emphasized editable tasks and custom supplier lists. |
| [Reddit: wedding planning app](https://www.reddit.com/r/weddingplanning/comments/1pyg05s/wedding_planning_app/) | The original poster asks for a visual dashboard; other participants describe combining spreadsheets and planning tools. | Made the planning tools visible before sign-in, with readable illustrative examples. |
| [Reddit: wedding checklist](https://www.reddit.com/r/Weddingsunder10k/comments/1u2zpun/8k_free_wedding_planning_checklist/) | Participants value checklists but also describe removing irrelevant items and tracking estimated versus actual costs. | Emphasized adding personal tasks, marking completed work, and comparing costs. |
| [Reddit: Joy website experience](https://www.reddit.com/r/weddingplanning/comments/1r6cfmg/withjoycom_is_a_horrible_web_design_tool_for/) | The discussion includes complaints about confusing navigation and mobile usability. | Used plain section labels and a single-column mobile layout with complete explanations. |

## Product grounding

Messaging was checked against `src/screens/Guests.tsx`, `src/screens/Pages.tsx`, `src/domain/permissions.ts`, `src/lib/paths.ts`, the translation files, and the bundled task templates.

- Checklist: 61 starting tasks, wedding-date deadlines, personal tasks, and responsibility assignment.
- Budget: fixed and per-guest costs, up to four guest scenarios, payments, lei/euro display, estimated cash gifts, and break-even calculation.
- Guests: households, RSVP links, adults/children, and dietary preferences.
- Collaboration: partner, planner, and helper access with different editing rights.
- Custom pages: lists the couple builds for supplier details, quotes, and other records.
- Access: free/open source, currently invitation-only. The FAQ states this restriction.

The design does not claim a vendor marketplace, seating-chart builder, registry, automated reminder service, or public wedding-website builder.

## Content and visual decisions

The page now follows: explicit product promise → named planning areas → illustrative tool previews → three starting steps → guest-count budget comparison → collaboration and custom lists → FAQ → planning call to action.

Photography supports the wedding context. The reception photo accompanies a concrete cost decision; wedding-specific interface examples do most of the work explaining the portal.

All names and figures in product previews are illustrative. The budget example is internally consistent: 30,000 RON fixed costs plus 450 RON per guest gives 84,000 RON for 120 guests and 97,500 RON for 150 guests. The 13,500 RON difference is not a market-price estimate.

No fabricated testimonials, usage numbers, or third-party endorsement badges were added.

## Validation

Reviewed screenshots of the hero, tool cards, starting steps, budget comparison, collaboration section, FAQ, closing CTA, and mobile sections. Checked the canvas for clipping and layout problems across both desktop languages and both mobile languages.

The initial deliverable was the canvas design; production application code was not changed at that stage.

## Implementation — 12 October 2026

Implemented the approved design in `src/screens/Landing.tsx`, with messages in the existing Romanian and English translation files. Images are optimized local assets, the hero image loads eagerly, and supporting images load lazily. Existing session-aware calls to action, sign-in routes, language controls, and theme controls are preserved. Section shortcuts navigate to the relevant previews.

Production build and lint checks pass, as do all 5,861 tests. Browser checks covered Romanian and English, light and dark appearances, working section anchors, and navigation to the existing sign-in page. No horizontal overflow was found at widths of 320, 390, 768, 1024, and 1440 pixels.

Local web-server listening is blocked in this environment. Browser verification used a temporary, self-contained build with an in-memory router. That preview is outside the repository; the production app retains its normal browser routing.
