# Design System: Idavoll (PlayHub System)

## 0. Design Read
> **Reading this as:** Multiplayer casual party gaming web & desktop platform for social players, friends, and families, with a Modern Playful and Tactile Softness visual language, rooted in PlayHub Design System tokens (Nunito Sans, #5B5BF0 primary indigo, #FF6B5E warm coral secondary, #2EC4A6 fresh mint tertiary, fluid spring motion, pill controls, reusable chat & audio dock).
>
> **The Three Dials:**
> - `DESIGN_VARIANCE: 7` (Playful cards, organic game boards, floating widgets)
> - `MOTION_INTENSITY: 7` (Spring physics, floating cards, subtle micro-interactions, smooth canvas)
> - `VISUAL_DENSITY: 5` (Balanced lobby, immersive touch-first canvas, collapsible multi-column desktop)

---

## 1. Visual Theme & Atmosphere
Idavoll delivers an approachable, joyful, and frictionless multiplayer social gaming experience.
The aesthetic blends **Modern Playful** with **Tactile Softness**:
- **Welcoming & Low-Pressure:** Interfaces prioritize clarity, reduced visual tension, and warm feedback. Defeat states and system errors are framed playfully without harsh reprimands.
- **Tactile & Organic:** Interactions feel responsive and physical — interactive elements depress smoothly (`scale(0.97)` on tap), cards float with soft ambient lighting (`0 8px 24px -4px rgba(91, 91, 240, 0.12)`).
- **Clutter-Free Socializing:** Room codes, invites, and chats remain omnipresent yet unobtrusive, letting drawing gameplay take center stage while preserving continuous social connection.

---

## 2. Color Palette & Roles

### Semantic Palette
- **Primary Indigo (`#5B5BF0`):** The primary interaction anchor for interactive buttons, primary badges, navigation indicators, and active player highlights.
- **Secondary Coral (`#FF6B5E`):** Callout moments, countdown timers, hot streaks, notifications, and alert states.
- **Tertiary Mint (`#2EC4A6`):** Positive reinforcement, "ready" checkmarks, active online statuses, correct guess celebrations.

### Surface Hierarchy
#### Light Mode (Default)
- **Canvas Base:** `#FBF8FF` / `#F7F8FC`
- **Elevated Card Surface:** `#FFFFFF`
- **Secondary Surface:** `#ECECFF` / `#F4F2FF`
- **Primary Text:** `#161A30` / `#1E2238`
- **Secondary Text:** `#464555` / `#676C89`
- **Borders & Dividers:** `rgba(199, 196, 215, 0.5)`

#### Dark Mode
- **Canvas Base:** `#0F1226`
- **Elevated Card Surface:** `#1A1E38`
- **Secondary Surface:** `#252B4D`
- **Primary Text:** `#F4F6FD`
- **Secondary Text:** `#A5A9C9`
- **Borders & Dividers:** `rgba(255, 255, 255, 0.08)`

---

## 3. Typography Architecture
- **Font Stack:** `Nunito Sans`, system-ui, -apple-system, sans-serif
- **Fallback for CJK:** `PingFang SC`, `Hiragino Sans`, `Noto Sans CJK SC`
- **Scale:**
  - `display-hero`: 48px / 56px (weight 800)
  - `headline-lg`: 32px / 40px (weight 800)
  - `headline-md`: 24px / 32px (weight 700)
  - `headline-sm`: 20px / 28px (weight 700)
  - `body-lg`: 18px / 26px (weight 400)
  - `body-md`: 16px / 24px (weight 400)
  - `body-sm`: 14px / 20px (weight 400)
  - `label-lg`: 16px / 24px (weight 700)
  - `label-md`: 14px / 20px (weight 700)
  - `label-sm`: 12px / 16px (weight 700)

---

## 4. Component Stylings & Interaction Rules
1. **Buttons:**
   - Pill-shaped (`rounded-full`), min-height 48px.
   - Spring active scale (`whileTap={{ scale: 0.97 }}`).
   - Primary: `#5B5BF0` background with white bold text.
   - Secondary: `#FF6B5E` or soft coral tint.
   - Ghost: Transparent pill with `#5B5BF0` hover tint.
2. **Cards:**
   - Soft rounded curves (`rounded-2xl` to `rounded-3xl`).
   - Ambient drop shadow (`0 4px 16px -2px rgba(30, 34, 56, 0.06)`).
3. **Avatars & Online Status:**
   - Circular avatars (`rounded-full`) with 12px status dot at bottom-right (`#2EC4A6` for online/ready, `#FF6B5E` for drawing/busy).
4. **Player Seats:**
   - Occupied state: Avatar centered, nickname below, green ready badge.
   - Empty state: Dashed 2px border in muted tone, `+` invite trigger.
5. **Draw & Guess Canvas:**
   - Native Canvas 2D powered by `perfect-freehand` for natural, pressure-sensitive organic strokes.
   - Floating tool dock with color swatches, brush size indicator, eraser, clear, and undo.
6. **Danmaku / Barrage:**
   - Fullscreen animated floating text layers with color-coded badges for guesses, correct guesses, and cheers.
7. **Reusable Chat & Voice Dock:**
   - Shared across all games.
   - Mobile: Slide-over bottom/side drawer.
   - Desktop: Persistent right-hand dock with real-time guess feed and voice status.

---

## 5. Motion Philosophy (Framer Motion)
- **Spring Physics:** `stiffness: 260, damping: 24` for snappy yet soft, friendly motion.
- **Page Transitions:** Staggered fade & slide up (`y: 12 → 0`, `opacity: 0 → 1`).
- **Score & Podium Celebrations:** Pop & bounce springs with confetti micro-effects.
- **Hardware Acceleration:** Animations confined to `transform` and `opacity`.

---

## 6. Anti-Patterns (Banned AI Tells)
- No AI purple/blue neon glows or oversaturated laser gradients.
- No generic centered empty-box heroes.
- No `Inter` or standard browser serif fonts.
- No raw black `#000000`.
- No unresponsive layouts or broken mobile overflow.
