# The Last Emberwing

## 3D mobile platformer concept for Unreal Engine 5

**Genre:** Third-person action-platformer with exploration, light combat, environmental puzzles, and boss encounters  
**Tone:** Dark fairy tale  
**Platform target:** Mobile first, with a control scheme that can also work on PC and controller  
**Player character:** Ari, a young mantis warrior  
**Status:** Pre-production concept and vertical-slice plan

---

## One-sentence pitch

In a garden that has grown into a dying world, a young mantis warrior must carry the last living ember through roots, ruins, and hostile insect kingdoms before the spreading Glass Rot turns every memory of home into crystal.

## Creative pillars

1. **Small hero, enormous world** — a dew drop is a lake, a flower is a cathedral, and a discarded human object is an ancient ruin.
2. **Grace under pressure** — traversal should feel light, precise, and expressive; Ari survives through timing rather than raw strength.
3. **Beauty with a shadow** — every area is visually striking, but something in it is sick, abandoned, or quietly dangerous.
4. **Touch-first clarity** — actions are readable at a glance and comfortable with one hand or two thumbs.

## Story

### The premise

The Underbloom colony is kept alive by the **Emberheart**, a warm seed hidden beneath the oldest root. One night the Emberheart goes cold. In its place, translucent Glass Rot begins growing through the tunnels, preserving the shapes of dead insects while erasing their voices and memories.

Ari, an untested mantis sentinel, finds a surviving spark inside a cracked eggshell. The colony's elders believe it is the final Ember Seed. They send Ari upward to relight three ancient **Lantern Flowers**, the only things capable of reaching the Emberheart through the infected root system.

The journey reveals that the garden's ancient guardian, **The Pale Gardener**, did not abandon the colony. It sealed the Emberheart on purpose to contain something beneath the soil. The Glass Rot is not simply a disease; it is a memory made physical, feeding on the grief of the garden's inhabitants.

### Main characters

- **Ari** — a young mantis warrior who is quick, dutiful, and afraid of becoming the kind of hero who only knows how to obey.
- **Mora of the Thread** — a blind orb-weaver cartographer who remembers paths that no longer exist. She teaches Ari that a map can be a story, not just a route.
- **Pip** — a tiny firefly carrying a fading light. Pip acts as a companion and a soft navigation guide without becoming a combat pet.
- **The Pale Gardener** — an ancient stag beetle-like guardian encountered through visions, statues, and eventually in person.
- **The Glass Choir** — crystallized former insects that repeat fragments of memories and serve as recurring enemies.

### Story arc

1. **The Cold Burrow** — Ari leaves the Underbloom and learns the basic movement and combat language.
2. **The Drowned Root** — Ari follows a stream through flooded roots, lights the first Lantern Flower, and meets Mora.
3. **The Silk Cathedral** — a vertical web-filled garden ruin where Ari learns to redirect light and confronts a spider matriarch.
4. **The Red Canopy** — wind, falling petals, and rival mantis sentinels test Ari's loyalty to the colony.
5. **The Hollow Below** — Ari discovers the truth about the Pale Gardener and chooses whether to restore, transform, or release the Emberheart.

The first vertical slice should cover the opening of **The Drowned Root**, ending at its Lantern Flower shrine and a compact mini-boss encounter.

---

## Core gameplay loop

1. Explore a dense, readable garden space.
2. Find a route using movement abilities, light cues, and environmental landmarks.
3. Fight or evade small corrupted insects.
4. Collect **Pollen Shards** to restore Ari's light and unlock optional paths.
5. Solve a short environmental puzzle.
6. Reach a shrine, upgrade an ability, and continue deeper into the story.

## Movement and traversal

The first version should keep the move set focused and tactile:

- Run and jump
- Short wall-cling on marked surfaces
- Air slash that doubles as a small forward lunge
- **Wingleaf glide** unlocked early: a brief controlled fall, not unlimited flight
- Contextual ledge grab for forgiving mobile play
- Optional later abilities: root-burrow, light-dash, and silk swing

Traversal abilities should create shortcuts and secrets rather than block the main path with pixel-perfect jumps.

## Combat

Combat is intentionally readable on a phone screen:

- Automatic soft-target selection within a short forward cone
- Tap **Strike** for a quick needle-blade combo
- Hold **Guard** for a short, stamina-limited parry window
- Swipe toward a target for the air slash
- A charged **Ember Cut** becomes available after collecting enough Pollen Shards

The player should normally be able to avoid combat. Encounters are short, with clear silhouettes, strong hit reactions, and generous recovery after damage.

### Initial enemy set

- **Glass Mite** — small ground enemy; teaches spacing and basic strikes.
- **Thorn Hopper** — leaps in a predictable arc; teaches jumping and air attacks.
- **Mourning Wasp** — ranged enemy that forces movement and line-of-sight choices.
- **Rootbound Husk** — slow armored enemy; teaches guard, parry, and attacking from behind.

### Vertical-slice mini-boss

**The Bell-Eyed Water Strider** patrols the surface of the flooded root. It creates ripples that become temporary platforms, calls Glass Mites from the water, and exposes its glowing bell only after a failed charge. The fight is designed around movement and timing rather than a large health bar.

## Puzzles and exploration

- Rotate leaves and pieces of bark to redirect shafts of moonlight.
- Use water tension to float pollen seeds into blocked channels.
- Follow sound, glowing spores, and firefly trails when the path is not visible.
- Hide optional lore in abandoned nests, shed skins, and crystallized memory fragments.

No puzzle should require tiny touchscreen precision. Interactable objects should highlight when Ari is near them, with an optional tap-to-focus assist.

---

## Visual direction

### Look

Stylized realism with painterly materials: detailed insect anatomy and believable natural surfaces, but deliberately composed colors, silhouettes, and lighting. The world should feel like a dark fairy tale rather than a nature documentary.

### Palette by region

- **Underbloom:** warm amber, charcoal soil, muted violet fungus
- **Drowned Root:** moon blue, wet brown, turquoise bioluminescence
- **Silk Cathedral:** pearl white webbing, deep crimson petals, cold lavender shadows
- **Red Canopy:** copper leaves, black branches, sunset gold
- **Hollow Below:** pale crystal, near-black stone, a single ember-orange accent

### Camera and composition

- Third-person camera, slightly above and behind Ari
- Clear silhouette separation between Ari, hazards, and interactables
- Gentle camera framing during story beats and boss attacks
- No essential information communicated only through tiny texture detail

### Mobile performance rules

- Use Unreal Engine's mobile renderer as the baseline.
- Prefer baked or stationary lighting for the first slice; treat dynamic lights as special effects.
- Keep Niagara effects layered and budgeted: a few large hero effects rather than many particles.
- Use aggressive LODs, instancing, simple collision, and small readable arenas.
- Treat Nanite and Lumen as optional high-end paths, never as requirements for the mobile target.
- Build for stable frame pacing before adding visual complexity.

---

## Mobile controls

### Landscape two-thumb layout

- Left thumb: virtual movement stick
- Right thumb: jump, strike, guard, and contextual ability buttons
- Swipe upward: jump or glide extension
- Swipe toward a target: air slash when unlocked
- Optional assisted targeting and auto-facing for accessibility

A settings screen should include camera sensitivity, aim assist strength, vibration, left-handed layout, button scale, and reduced effects.

## First playable vertical slice

### Level: The Drowned Root

A 8–12 minute route from the Underbloom entrance to the first Lantern Flower shrine.

**Required beats:**

1. Short cinematic introduction in the dying colony.
2. Movement tutorial through a root tunnel.
3. First Glass Mite encounter.
4. A small branching area with one optional Pollen Shard cache.
5. Wall-cling and glide introduction.
6. Moonlight leaf-rotation puzzle.
7. First shrine and the Wingleaf Glide unlock.
8. Water Strider mini-boss arena.
9. Story reveal: a crystallized memory of the Pale Gardener.
10. Return-to-menu and save checkpoint.

### Success criteria

- A new player can understand movement without reading a manual.
- The first combat encounter is completable without taking damage.
- The player can reach the shrine in under ten minutes after learning the controls.
- The mini-boss is visually distinct, beatable in under three minutes, and readable on a small screen.
- The level runs with stable frame pacing on a mid-range Android device at the chosen performance target.

---

## Unreal project structure

The eventual Unreal project should separate reusable systems from the first level:

```text
Content/
  Emberwing/
    Blueprints/
      Characters/
      Enemies/
      Interactables/
      Pickups/
      UI/
    Maps/
      Prototype/
      DrownedRoot/
    Materials/
    Meshes/
    VFX/
    Audio/
    Data/
    Cinematics/
```

Recommended first systems:

- `BP_AriCharacter` — movement, health, combat state, traversal abilities
- `BP_EmberPlayerController` — touch input and camera behavior
- `BP_EnemyBase` — shared health, hit reaction, alert state, and damage interface
- `BPI_Damageable` — common damage contract for enemies and destructibles
- `BP_Shrine` — checkpoint, upgrade, and save interaction
- `BP_PollenShard` — pickup and ability meter contribution
- `BP_LanternFlower` — story objective and light puzzle target
- `WBP_MobileHUD` — touch controls, health, pollen meter, pause, and accessibility options
- `SG_Emberwing` — checkpoint, unlocked abilities, story flags, and settings

Blueprints are appropriate for the first playable prototype. C++ can be introduced later for platform services, save serialization, performance-critical movement, and reusable combat utilities.

## Production order

1. Lock the visual target and Unreal Engine version.
2. Create a graybox test room with the mobile input layout.
3. Implement Ari's run, jump, wall-cling, glide, and camera.
4. Add one enemy and the basic damage/health loop.
5. Build the Drowned Root graybox from start to shrine.
6. Add the moonlight puzzle and Water Strider boss prototype.
7. Replace graybox pieces with a cohesive art pass, lighting, VFX, and audio.
8. Add the opening cinematic, story prompts, save checkpoint, and mobile settings.
9. Test on real target devices and optimize before adding more content.

## Open decisions for the next design pass

- Final name and insect species details
- Exact age rating and intensity of the darker story moments
- Whether Ari speaks, uses subtitles only, or communicates through gesture and sound
- One-handed portrait mode versus landscape two-thumb mode
- Target mobile devices and frame-rate goal
- Whether progression is linear or uses a small interconnected map
