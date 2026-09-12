---
name: apple-design-skill
description: "Design, implement, and review Apple-style web interfaces, with particular attention to consistent dropdown triggers and expanded menus. Also use for drag, swipe, sheet, and spring interactions needing direct tracking, velocity handoff, or interruption fixes. Apply gesture guidance only to motion work."
---

# Apple Design

Build responsive, coherent interfaces using the project's design system. User requirements take precedence over stylistic defaults. This is web adaptation guidance informed by Apple resources, not an official Apple specification. Instructions are consolidated here; apply the sections relevant to the task.

## Agent hosts

These instructions are portable across Agent Skills hosts, including Codex, Claude Code and Cursor. Use the host's available tools and the project's existing stack; references to browser inspection describe capabilities, not mandatory vendor-specific APIs. If a required verification capability is unavailable, say what remains unverified instead of inventing evidence.

**Dropdown priority:** When dropdown appearance is in scope, style and verify both the closed control and the expanded menu. A polished trigger with a mismatched or unverified popup is incomplete. Keep this requirement when refining or shortening this skill.

## Workflow

1. Inspect affected components, shared tokens, installed dependencies, and actual behavior. Identify the primary task, input methods, states, and affected variants. For a review, report findings without unsolicited edits.
2. Prioritize correct operation, semantics, focus, and recovery; then continuity and visual consistency; then optional effects. Fix shared components or purposeful variants within scope.
3. Reuse accessible primitives and existing tools. CSS usually suffices for hover, press, and simple visibility changes; playback control may use Web Animations. Dragging and velocity handoff need readable presentation values, cancellation, and retargeting. Preserve native scrolling and suitable scroll snap; do not add a framework just to apply this skill.
4. Complete the requested implementation or review, inspect the affected pages as a whole, and verify relevant states and input paths before delivery. Follow the verification and handoff guidance below. Review findings should give location, trigger, impact, evidence, and a minimal correction.

## Dropdowns — required when affected

### Choose a mechanism that meets the visual requirement

- Inspect every affected variant closed and open. Identify whether options come from an OS/browser picker, customizable native picker, or DOM popup; locate mismatches in the trigger, surface, rows, states, or anchoring.
- Traditional native popup styling is limited: `appearance: none`, a chevron, or CSS on `option` does not establish control over the expanded surface. For a cohesive Apple-style page or a reported menu mismatch, matching that surface is part of the task.
- Reuse the project's accessible select/combobox primitive, or a small shared accessible component. Keep native controls when intentional to the product or when popup styling is outside scope. Do not silently switch to a mismatched native picker on narrow screens; make an intentional platform fallback and its visual consequence explicit.
- Use customizable native selects only after verifying target support and actual open/closed behavior. A feature query alone is insufficient; unsupported targets that matter need a coherent accessible fallback.
- Choose semantics by purpose: value selection, searchable input, listbox, and action menu require their respective keyboard/focus patterns. Do not assign `role="menu"` to every dropdown.

### Keep the complete control visually consistent

Use shared tokens and documented variants across affected screens; avoid isolated overrides.

| Part | Format requirements |
| --- | --- |
| Trigger | Consistent control-height scale, typography, padding, border, radius, background, placeholder, and label alignment; chevron size and position follow the icon system. |
| Expanded surface | Matching colors, border, radius, elevation, padding, width/alignment policy, and restrained opening/closing motion. Accommodate content and viewport constraints. |
| Option rows | Consistent typography, density, spacing, icons, checkmarks, groups, and separators. Keep active/focused, selected, and disabled options distinguishable. |
| States | Shared default, hover, pressed, focus-visible, open, selected, disabled, and invalid treatment where applicable; handle loading/empty results only when supported. |
| Placement and theme | Preserve tokens in portals/top-layer popups, dialogs, toolbars, and supported themes. Align to the trigger, flip above when needed, constrain height, scroll active rows into view, and avoid clipping or incorrect stacking within the actual viewport/iframe. |

### Preserve selection, focus, and application state

- Keep one committed value; separate the active navigation option when the chosen pattern requires it. Define consistent commit/cancel behavior for selection, blur, and outside dismissal. Follow the corresponding [W3C patterns](#sources), including the select-only example when applicable.
- Keep accessible naming, expanded state, popup ownership, active option, selected value, and disabled state synchronized. A backing native select and custom trigger must not become duplicate accessible/tabbable controls.
- Preserve real values, input/change behavior, programmatic updates, form reset, and disabled changes. Application logic must read the committed value, not a decorative label.
- Opening another picker, disabling a field, changing views, or unmounting must close or safely transfer the popup without stale focus or listeners. Standard value-list popups are non-modal: do not add a focus trap, blocking full-screen scrim, or page scroll lock. Respect any enclosing dialog's focus boundary.
- Reduced motion must retain placement, selection, dismissal, and focus without depending on animation completion callbacks.

### Verify the expanded menu

- Inspect each affected variant beside surrounding controls, closed and open, including selected and distinct active/hovered rows where supported. Cover long options, many results, relevant themes, the narrowest target viewport, and containing dialogs/iframes.
- **For visual dropdown work, directly inspect the actual expanded popup** in a live browser view or a temporary screenshot. An “expanded” accessibility state, successful selection, or screenshot omitting the OS menu cannot establish visual integration. Retaining an image is not required. If visual inspection is unavailable, report appearance as unverified.
- Exercise pattern-appropriate keyboard navigation and selection. For a select-only combobox, include arrows, Home/End, typeahead, Enter/Space, Escape cancellation, and Tab/Shift+Tab exit. Check pointer selection, outside dismissal, focus return/exit, disabled behavior, and one relevant interruption; read back the real value or resulting application behavior.

## Visual design and accessibility

- Establish content hierarchy, primary action, location, and exit paths before effects. Keep useful labels and accessible names. Transitions should explain origin and hierarchy without changing the component's interaction model.
- Share typography, colors, spacing, geometry, icons, elevation, and state feedback across equivalent controls. Preserve purposeful semantic, density, and platform variants; report unrelated inconsistencies without broadening a focused task.
- Prefer the project's typeface or a system stack. Tune size, weight, line height, and spacing together; assess Chinese and mixed scripts separately from Latin headings. Use flexible layouts and content-driven heights; preserve essential labels under long text, enlargement, and reflow. Do not disable zoom. Web rem units are not native Dynamic Type.
- Use semantic colors and readable surfaces in supported themes and busy backgrounds. Glass, blur, bounce, sound, and haptics are optional. Provide solid/high-opacity material fallbacks; do not make every content card glass or claim CSS filters reproduce native Liquid Glass. Measure costly filters/layers when performance is affected.
- Use native elements or verified accessible primitives with visible focus, correct roles, names, and states. Give immediate press feedback while preserving semantic click/keyboard/assistive activation. Provide click and keyboard alternatives to dragging; a role alone does not implement behavior.
- Modals need suitable initial focus, focus containment, background inertness, naming, explicit dismissal, pattern-appropriate Escape, and focus restoration to the trigger or a logical destination. Coordinate exit animation and removal so invisible layers cannot remain interactive. `aria-modal` alone is insufficient; keep non-modal panels non-modal.
- Handle reduced motion, reduced transparency, and increased contrast separately, checking target support. Reduce large movement and oscillation, increase opacity or boundaries as appropriate, and retain necessary direct-manipulation feedback. Keep the base interface usable without preference detection.
- Reduced motion must preserve positioning, open/closed state, and operability. Do not globally clear positioning transforms. Handle CSS and JavaScript animation, runtime preference changes, and immediate completion without requiring callbacks to remove content, return focus, or unlock interaction.
- Sound/haptics need visual and semantic equivalents and must tolerate unavailable capabilities. Web vibration is not native Apple haptics or a guarantee of synchronized presentation.

## Motion and gestures

Use for dragging, swiping, inertia, directly manipulated sheets, and spring handoffs. Static styling does not require gesture machinery.

### Ownership and lifecycle

- Give each animated value one owner. New input starts at the current on-screen position with the grab offset preserved; a logical target is not the presentation value. Capture browser-owned presentation before cancellation removes animated styles, then stop the old writer.
- On press, validate the pointer/button and record position, offset, and monotonic time. Set local `touch-action` before tracking and arbitrate with nested scrolling. Adjust the baseline when crossing an activation threshold to avoid a jump; do not globally disable scrolling or zoom.
- Track directly rather than easing each pointer update. Use pointer capture where needed; keep pointer, element, and snap coordinates consistent under scrolling, scaling, and transforms. Avoid per-move layout read/write loops.
- On release, choose a valid snap target from position, velocity, bounds, and semantics, then settle. Cancellation is not submission. Handle `pointercancel`, lost capture, external dismissal, and unmounting with idempotent cleanup; intentional release of capture must not undo a completed action. Suppress the following click only for an actual drag.
- Preserve position on interruption and velocity when handing off automatic motion. During direct manipulation, current input takes priority over old velocity. Refresh stale geometry/time after resize or resume.

### Velocity and spring constraints

- Estimate velocity from recent timestamped samples, account for a pause before release, and convert units once. Hand off the animated property's velocity, including resistance/scale mapping. Sampling windows are tunable heuristics, not Apple constants.
- Verify installed API semantics and units. Physical damping coefficient `c` differs from damping ratio `ζ`: `c = 2 × ζ × sqrt(k × m)`. Do not copy Apple's ratio into Motion's `damping` or equate response, duration, and natural frequency.
- In Motion, physical `stiffness`/`damping`/`mass` springs support velocity handoff; verify whether the controller inherits velocity or needs an explicit value. Duration/`bounce` springs do not incorporate existing gesture/animation velocity. Do not mix parameter groups to approximate a handoff.
- Use normalized velocity `propertyVelocity / (target - current)` only if the API specifies that convention; guard near-zero distance against NaN/Infinity. Critical damping does not guarantee no overshoot with a large initial velocity; enforce required bounds.
- Projection chooses a candidate destination, not a permitted business state. Favor position at low speed; use flick intent, hysteresis, allowed snap points, and boundaries rather than velocity sign alone. Apply continuous resistance only to overshoot and settle within valid bounds; guard zero/unavailable geometry.
- Use elapsed time with `requestAnimationFrame` for custom updates. Prefer transform/opacity without assuming they are free. Use `will-change` only when beneficial, and clean up animation resources and listeners.

## Verification and delivery

Select checks for the affected behavior; spacing changes do not require the gesture suite. Use existing project checks and browser interactions. Add tests for meaningful state/input defects, not wording or animation constants.

### Whole-page visual inspection

- For interface changes and visual reviews, inspect the actual rendered affected pages as a whole in a live browser view or temporary screenshots. Review the overall composition, then scroll through the full page at a readable scale to check navigation, content hierarchy, typography, spacing, alignment, surface consistency, and clipping or overlap. A component crop or the first viewport alone is insufficient.
- Check the supported desktop and narrow layouts and relevant themes. View affected controls and expanded overlays in their page context, including their relationship to surrounding content. When shared components or tokens change, inspect representative affected pages and distinct layout variants for consistency.
- Code review, DOM assertions, and successful interactions do not replace visual inspection. If the page cannot be rendered or visually inspected, identify the unverified pages or states in the final response. After visual corrections, recheck the affected page as a whole. Report unrelated findings without expanding the implementation scope.

### Behavior and state checks

| Change | Relevant checks |
| --- | --- |
| Visual/layout | Equivalent affected controls, supported themes, long/localized labels, enlarged text, narrow viewports, contrast, and material fallbacks. |
| Dropdown | Complete [expanded-menu verification](#verify-the-expanded-menu), including actual-value checks and appearance evidence. |
| Gesture/motion | Continuous drag, slow release, fast/reverse flick, pause before release, takeover mid-animation, cancellation/lost capture, nested scrolling, and relevant unmount/resize paths. Check jumps, competing writers, stale velocity, invalid targets, and stuck input. |
| Accessibility | Primary task by keyboard, focus/naming/states, relevant modal dismissal, reduced motion at startup and during motion, and immediate completion. |
| Performance | When affected, inspect sustained input, long tasks, layout/paint, and expensive filters before tuning effects. |

Distinguish runtime observations, automated checks, static risks, and unverified conditions. Screenshots show appearance; interaction checks show behavior. DOM assertions or emulation do not establish real-device, actual browser zoom, OS-preference, or screen-reader coverage.

### Completion and handoff

- Deliver the requested project changes or review, with applicable checks completed. In the final response, concisely explain the change or findings, observable result, checks performed, and remaining limitations. Include browser/device, key operations, outcomes, and simulation limits when relevant to interpreting the checks. State unavailable checks explicitly; do not claim unverified behavior passed.
- **Do not create or retain extra delivery artifacts by default.** Unless requested, do not generate standalone reports, checklists, design documents, demo pages, screenshots, recordings, or output folders solely to document completion. The requested implementation and the final response are sufficient; saved evidence is not a completion requirement.
- Use temporary captures only as needed for verification and clean up task-created temporary files afterward. Preserve existing project assets and any deliverables the user explicitly requested.

## Sources

Apple resources inform feedback, direct manipulation, spatial relationships, and materials. Component consistency rules and web implementation/verification procedures are this skill's adaptations. Consult relevant official documentation for unfamiliar APIs, attribution, and target compatibility; examples require target-environment testing.

- Apple: [Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/), [Principles of great design](https://developer.apple.com/videos/play/wwdc2026/250/), [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials).
- Dropdowns: [Select styling](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select#styling_with_css), W3C [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [Select-only example](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/), [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/).
- Motion/input: [Motion animate](https://motion.dev/docs/animate), [spring](https://motion.dev/docs/spring), [CSS reversal](https://www.w3.org/TR/css-transitions-1/#reversing), [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API), [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action), [pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event). Playback control alone does not provide gesture velocity inheritance.
- Accessibility: [W3C Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [Web Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API).
