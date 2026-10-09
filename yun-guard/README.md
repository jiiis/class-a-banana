# Yun Guard 🐉

A Kingdom Rush style tower defense game in plain HTML, CSS and JavaScript. No frameworks, no build step.

## How to run

The game uses JavaScript modules, so it needs a tiny local web server (opening the file directly won't work).

```bash
cd yun-guard
python3 -m http.server 8123
```

Then open http://localhost:8123 in your browser.

## How to play

- Every game starts on a brand new random map. Roads can enter and leave from any edge of the map, not just left to right. Most maps have two routes: a side road that forks off and rejoins, a second entrance that merges in, a fork that leads to its own exit, or a completely separate road with its own entrance and exit. Monsters pick a route when they appear, so cover both. When the routes leave by different exits, each exit has its own castle to defend (a grey stone keep and a sandstone palace). The map number is shown in the top bar; add `?seed=NUMBER` to the URL (for example `http://localhost:8123/?seed=234833`) to play that same map again.
- Click a stone build spot to place a tower. Click a tower to upgrade or sell it. Towers go up to level 3 normally; at level 3 you choose one of two **level 4 abilities** that change how the tower fights (see the table).
- Each round starts by choosing one of five heroes (or add `?hero=april`, `?hero=avril`, `?hero=ember`, `?hero=willow` or `?hero=meilin` to the URL). Press `1` (or click her) to select her, then click anywhere to send her there. She is deselected after the order; clicking her again or pressing `Esc` also deselects.
  - **Lady April** is a knight: sword and shield, tough, and her dog Max follows her and bites anything that gets close.
  - **Princess Avril** is an archer princess: she shoots frost arrows that slow monsters from a distance, fights only weakly up close, and slowly heals friends standing near her. Her eagle Sky circles above her and dives on nearby monsters, including flying ones.
  - **Ember** is a young fire mage: fragile, but her fireballs splash and set everything they catch ablaze. Her baby dragon Cinder hovers above her and spits little fireballs of his own.
  - **Willow** is a forest druid: every few seconds her vines burst from the ground and root every monster near her. Her bear Bramble is big and tough and holds monsters in place.
  - **寒 Hán** is a cool, elegant warrior in frost-white hanfu: every sword strike also cleaves into the monsters beside her target. Her loong Yun 云, a serpentine Chinese dragon, coils in the sky and every few seconds sweeps down the road, striking everything in its path.
  - Kills earn a hero experience: each level makes her stronger and tougher (and Avril's frost colder). Click an animal while a hero is selected and she will hunt it down for a couple of gold: April runs it down with her sword, Avril picks it off with her bow.
- Click a Barracks and choose **Move rally point**, then click the map to choose where its soldiers stand (within the barracks' range).
- Monsters walk the road from the signpost to the castle. Each one that gets through costs lives.
- Killing monsters earns gold. The next wave counts down as soon as the current one has finished appearing, and calling it early earns bonus gold.
- Survive all 15 waves to win.

| Tower | Good for |
|---|---|
| Archer | Fast, cheap damage. Weak against armoured orcs. |
| Mage | Magic ignores armour. |
| Cannon | Slow, but hits a whole group. |
| Barracks | Soldiers stand on the road and hold monsters in place. |
| Lightning Spire | Chain lightning leaps from monster to monster (one more hop per level). Reaches flyers. |

| Tower | Level 4 ability A | Level 4 ability B |
|---|---|---|
| Archer | **Rapid Volley**: two arrows per shot. | **Venom Arrows**: poison over time that ignores armour and slows. |
| Mage | **Arcane Storm**: bolts burst and hit the whole crowd. | **Curse**: cursed monsters take 40% more damage from everything. |
| Cannon | **Cluster Bombs**: three bomblets scatter from every shell. | **Napalm**: shells leave burning ground. |
| Barracks | **Paladins**: tougher, armoured soldiers who heal in battle. | **Berserkers**: harder, faster hits that cleave nearby monsters. |
| Lightning Spire | **Overcharge**: three more hops, longer leaps. | **Static Field**: everything in range is slowed and zapped. |

| Monster | What makes it different |
|---|---|
| Goblin | Weak and plentiful. |
| Wolf | Very fast. |
| Bat | Flies over soldiers, heroes and cannon fire. Only archers, mages and the eagle can hit it. |
| Orc | Armoured: arrows and cannonballs do less. |
| Skeleton | Heavily armoured but crumbles to magic. Can't be chilled. |
| Shaman | Heals the monsters around it. Kill it first. |
| Golem | Slow, enormous armour, immune to frost. Magic works best. |
| Troll | The boss: huge health, crushing attacks. |
| Slime | Bursts into two bouncy slimelings when killed. |
| Thief | Very fast. Costs no lives, but runs off with 25 gold if it reaches the castle. Drops good loot when caught. |
| Necromancer | Every few seconds raises a skeleton from a nearby fallen monster. Clear the bodies with fire or kill it fast. |
| Wyvern | A big flying dragon: tough, armoured, and only archers, mages, spires and the hero's flyer can touch it. |

## Project layout

```
index.html            page skeleton
css/style.css         HUD, menu and overlay styling
js/config.js          ALL the game settings: towers, monsters, waves, grid size
js/map.js             random map generator: roads, rivers, ponds, build spots, scenery, animal homes
js/state.js           everything that changes while playing
js/update.js          one step of the game (spawning, walking, shooting)
js/waves.js           wave building and spawning
js/soldiers.js        barracks soldiers: moving, blocking, fighting
js/combat.js          damage, gold, little effects
js/towers.js          tower stats and creation
js/ui.js              HUD, build menu, game over screen, window scaling
js/util.js            maths helpers
js/render/            all the drawing: background, towers, creatures, soldiers
js/main.js            wires it together and runs the loop
```

## Ideas to try next

- Change numbers in `js/config.js`: tower costs, monster speed, how many waves.
- Change how maps are generated in `js/map.js`: longer roads, more build spots, more trees.
- Add a new monster: stats in `config.js`, a drawing in `js/render/creatures.js`, and add it to `makeWave`.
- Add a hero unit, boss waves, sound effects, or a high score saved in localStorage.
