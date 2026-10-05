# Gore Pot 🔫🍰

A cartoon run-and-gun in the spirit of *Guns, Gore & Cannoli*: Vinnie the mobster, a tommy gun, a city street, and waves of zombies. Plain HTML, CSS and JavaScript, no frameworks, no server logic.

## How to run

```bash
cd gore-pot
python3 -m http.server 8125
```

Then open http://localhost:8125.

## How to play

| Key | Action |
|---|---|
| `A` / `D` (or arrows) | Run |
| `W` / `Space` | Jump |
| `S` | Drop through a platform |
| Mouse | Aim; hold the left button to shoot |
| `1` `2` `3` / scroll wheel | Pistol (infinite), Tommy Gun, Shotgun |

- Zombies come from both sides of the street in waves. Clear a wave and the next one arrives a few seconds later.
- **Headshots** score double. Big brutes take a lot of bullets but often drop loot.
- Pick up **cannoli** to heal, and ammo boxes for the tommy gun and shotgun.
- Lose all your health and Vinnie gets whacked. Try to beat your score.

| Zombie | Notes |
|---|---|
| Shambler | Slow and plentiful. |
| Runner | Fast, fragile. |
| Cop | Tougher, still wearing the badge. |
| Brute | Huge, slow, hits hard. |

## Project layout

```
index.html        page, HUD and title screen
css/style.css     styling
js/config.js      all the numbers: weapons, zombies, waves
js/level.js       platforms, buildings, lamps
js/state.js       everything that changes while playing
js/player.js      Vinnie: running, jumping, shooting, getting bitten
js/enemies.js     zombies, waves, bullets hitting, pickups
js/particles.js   blood, gibs, shells, smoke, floating text
js/render.js      all drawing
js/audio.js       synthesised sound effects
js/main.js        input, camera, main loop
```
