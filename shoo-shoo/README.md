# Shoo Shoo 🎯

A fake-3D first-person shooter in the spirit of CS2, built as a classic raycaster (the Wolfenstein 3D trick) in plain HTML, CSS and JavaScript. Textured walls, sprite enemies, rounds, and a bomb to defuse. No frameworks, no assets, no server logic.

## How to run

```bash
cd shoo-shoo
python3 -m http.server 8127
```

Open http://localhost:8127 and click **Play**. The mouse is captured while you play; press `Esc` to release it.

## How to play

You are the lone Counter-Terrorist on **de_banana**. Each round, five Terrorist bots spawn on the far side with a bomb. Stop them.

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move (`Shift` to walk quietly) |
| Mouse | Look and shoot |
| `1` / `2` / `3` | Knife / USP-S pistol / AK-47 (after buying one) |
| `R` | Reload |
| `E` (hold) | Defuse the bomb when standing next to it |
| `B` | Buy menu (first 15 seconds of a round) |

- **Win a round** by eliminating every bot, defusing the bomb, or running the clock down before they plant.
- **Lose a round** if you die or the bomb explodes 40 seconds after being planted.
- First to **5 rounds** wins the match.
- Headshots do 4× damage, so aim high. Pitch matters: shoot over a bot's head and you miss.
- Money: $300 per kill, $3250 for a round win, $1400 for a loss. Buy an AK-47, kevlar, a defuse kit (defuses twice as fast) or ammo.
- The radar top-left shows walls, the bomb and bots you can see or hear.

## Project layout

```
index.html        page, HUD, title screen, buy menu
css/style.css     styling
js/config.js      all the numbers: weapons, bots, timers, prices
js/map.js         the map grid, spawns, bomb sites, line of sight, pathfinding
js/textures.js    procedurally painted wall textures and sprites
js/raycast.js     the fake-3D renderer: walls by DDA, billboard sprites with a depth buffer
js/player.js      movement, mouse look, hitscan shooting, taking damage
js/bots.js        terrorist AI: patrol, fight, plant the bomb
js/game.js        rounds, bomb timer, defusing, money, buying
js/hud.js         DOM HUD, kill feed, overlays
js/audio.js       synthesised sounds
js/main.js        input, pointer lock, viewmodel, crosshair, radar, main loop
```
