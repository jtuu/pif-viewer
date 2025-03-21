const standard_types = [
    "NORMAL",
    "FIRE",
    "WATER",
    "ELECTRIC",
    "GRASS",
    "ICE",
    "FIGHTING",
    "POISON",
    "GROUND",
    "FLYING",
    "PSYCHIC",
    "BUG",
    "ROCK",
    "GHOST",
    "DRAGON",
    "DARK",
    "STEEL",
    "FAIRY",
];

const expert_move_names = ["ATTACKORDER", "POLLENPUFF", "LUNGE", "DEFENDORDER", "HEALORDER", "POWDER", "TAILGLOW", "DARKESTLARIAT", "PARTINGSHOT", "TOPSYTURVY", "ZINGZAP", "PARABOLICCHARGE", "ELECTRIFY", "AROMATICMIST", "FLORALHEALING", "MATBLOCK", "MINDBLOWN", "SHELLTRAP", "HEATCRASH", "SHADOWBONE", "SPIRITSHACKLE", "TRICKORTREAT", "TROPKICK", "STRENGTHSAP", "ICEHAMMER", "MULTIATTACK", "INSTRUCT", "PSYCHICTERRAIN", "MISTYTERRAIN", "SPEEDSWAP", "SPARKLINGARIA", "HYPERSPACEFURY", "COREENFORCER", "PLASMAFISTS", "LIGHTOFRUIN", "FLEURCANNON", "NATURESMADNESS", "GEOMANCY", "VCREATE", "MAGMASTORM", "SEARINGSHOT", "OBLIVIONWING", "MOONGEISTBEAM", "SPECTRALTHIEF", "SEEDFLARE", "LANDSWRATH", "THOUSANDARROWS", "THOUSANDWAVES", "FREEZESHOCK", "ICEBURN", "HAPPYHOUR", "HOLDHANDS", "SUNSTEELSTRIKE", "DOUBLEIRONBASH", "STEAMERUPTION", "SECRETSWORD"];

const global_data = {};

function make_lookup_maps(game_data) {
    global_data.type_name_map = {};
    for (const tp of Object.values(game_data.types)) {
        global_data.type_name_map[tp.name.toUpperCase()] = tp.id;
    }

    global_data.move_name_map = {};
    for (const move of Object.values(game_data.moves)) {
        const name = move.name.toUpperCase().replace(/[^A-Z]/g, "");
        global_data.move_name_map[name] = move.id;
    }

    global_data.expert_moves = new Set(expert_move_names.map(name => global_data.move_name_map[name]));
}

self.onmessage = ({ data }) => {
    switch (data.topic) {
        case "init":
            global_data.game_data = data.game_data;
            global_data.sprites_metadata = data.sprites_metadata;
            global_data.poke_name_map = data.poke_name_map;
            make_lookup_maps(global_data.game_data);
            break;
        case "filter":
            const result = filter(data.filter_state);
            // Only transfer indices instead of full pokemon data because it's much faster
            const indices_only = new Uint32Array(result.map(poke => poke.index));
            postMessage(indices_only, [indices_only.buffer]);
            break;
        default:
            console.warn("Invalid topic sent to worker: " + data.topic);
            break;
    }
};

function condition(a, b, cond) {
    switch (cond) {
        case "=":
            return a === b;
        case "!=":
            return a !== b;
        case "<":
            return a < b;
        case ">":
            return a > b;
        case "<=":
            return a <= b;
        case ">=":
            return a >= b;
    }
    return false;
}

function calculate_type_effectiveness(types, defender_type, attacker_type) {
    const t = types[defender_type];
    if (t.weaknesses.includes(attacker_type)) {
        return 2;
    } else if (t.resistances.includes(attacker_type)) {
        return 0.5;
    } else if (t.immunities.includes(attacker_type)) {
        return 0;
    }
    return 1;
}

function get_resistance_value(types, poke, attacker_type) {
    let effectiveness = 1;
    for (const tp of poke.types) {
        effectiveness *= calculate_type_effectiveness(types, tp, attacker_type);
    }
    return effectiveness;
}

function can_learn_move(poke, moves, move_id) {
    const poke_id_match = id => id === poke.head_id || id === poke.body_id;
    if (moves[move_id].learners.some(poke_id_match)) return true;
    if (moves[move_id].tutor_learners.some(poke_id_match)) return true;
    if (moves[move_id].egg_learners.some(poke_id_match)) return true;
    return false;
};

function get_expert_moves(poke, moves, poke_name_map, type_name_map, move_name_map) {
    const is_fusion_of = names => {
        for (const name of names) {
            const id = poke_name_map[name];
            if (poke.triple_fusion_ids) {
                if (poke.triple_fusion_ids.includes(id)) {
                    return true;
                }
            } else if (poke.head_id === id || poke.body_id === id) {
                return true;
            }
        }
        return false;
    };
    const hasType = type_name => {
        const id = type_name_map[type_name];
        return poke.types.includes(id);
    };
    const canLearnMove = move_name => {
        if (!(move_name in move_name_map)) return false;
        const move_id = move_name_map[move_name];
        return can_learn_move(poke, moves, move_id);
    };

    const move_names = [];

    // Code generated by parse-expert-moves-code.sh
    if (is_fusion_of(["BEEDRILL"])) { move_names.push("ATTACKORDER"); }
    if (is_fusion_of(["BUTTERFREE", "CELEBI", "VILEPLUME", "PARASECT", "BRELOOM"])) { move_names.push("POLLENPUFF"); }
    if (is_fusion_of(["SPINARAK", "ARIADOS", "JOLTIK", "GALVANTULA", "VENOMOTH", "VOLCARONA", "PINSIR", "PARASECT", "LEDIAN", "DODUO", "DODRIO", "STANTLER"])) { move_names.push("LUNGE"); }
    if (is_fusion_of(["BEEDRILL"])) { move_names.push("DEFENDORDER"); }
    if (is_fusion_of(["BEEDRILL"])) { move_names.push("HEALORDER"); }
    if (is_fusion_of(["BUTTERFREE", "VENOMOTH", "VOLCARONA", "PARASECT", "BRELOOM"])) { move_names.push("POWDER"); }
    if (is_fusion_of(["MAREEP", "FLAAFFY", "AMPHAROS", "LANTURN", "ZEKROM", "RESHIRAM"])) { move_names.push("TAILGLOW"); }
    if (is_fusion_of(["SNORLAX", "REGIGIGAS", "POLIWRATH", "MACHAMP", "ELECTIVIRE", "DUSKNOIR", "SWAMPERT", "KROOKODILE", "GOLURK"])) { move_names.push("DARKESTLARIAT"); }
    if (is_fusion_of(["MEOWTH", "PERSIAN", "SANDILE", "KROKOROK", "KROOKODILE", "UMBREON"])) { move_names.push("PARTINGSHOT"); }
    if (is_fusion_of(["HITMONTOP", "WOBBUFFET"])) { move_names.push("TOPSYTURVY"); }
    if (is_fusion_of(["PICHU", "PIKACHU", "RAICHU", "VOLTORB", "ELECTRODE"]) || (is_fusion_of(["SANDSLASH", "GOLEM"]) && hasType("ELECTRIC"))) { move_names.push("ZINGZAP"); }
    if (is_fusion_of(["PICHU", "PIKACHU", "RAICHU", "MAGNEMITE", "MAGNETON", "MAGNEZONE", "MAREEP", "FLAAFFY", "AMPHAROS", "ELEKID", "ELECTABUZZ", "ELECTIVIRE", "ZAPDOS", "CHINCHOU", "LANTURN", "RAIKOU", "KLINK", "KLANG", "KLINKLANG", "ROTOM", "STUNFISK"])) { move_names.push("PARABOLICCHARGE"); }
    if (is_fusion_of(["KLINK", "KLANG", "KLINKLANG"]) || hasType("ELECTRIC")) { move_names.push("ELECTRIFY"); }
    if (is_fusion_of(["WEEZING", "BULBASAUR", "IVYSAUR", "VENUSAUR", "CHIKORITA", "BAYLEEF", "MEGANIUM", "GLOOM", "VILEPLUME", "BELLOSSOM", "ROSELIA", "ROSERADE"])) { move_names.push("AROMATICMIST"); }
    if (is_fusion_of(["SUNFLORA", "BELLOSSOM", "ROSELIA", "ROSERADE"])) { move_names.push("FLORALHEALING"); }
    if (is_fusion_of(["MACHOP", "MACHOKE", "MACHAMP", "TYROGUE", "HITMONLEE", "HITMONCHAN", "HITMONTOP"])) { move_names.push("MATBLOCK"); }
    if (is_fusion_of(["VOLTORB", "ELECTRODE", "EXEGGUTOR"])) { move_names.push("MINDBLOWN"); }
    if (is_fusion_of(["MAGCARGO", "FORRETRESS"])) { move_names.push("SHELLTRAP"); }
    if (is_fusion_of(["BLAZIKEN", "RESHIRAM", "GROUDON", "CHARIZARD", "GOLURK", "REGIGIGAS", "RHYDON", "RHYPERIOR", "SNORLAX"])) { move_names.push("HEATCRASH"); }
    if (is_fusion_of(["MAROWAK"]) && hasType("GHOST")) { move_names.push("SHADOWBONE"); }
    if (is_fusion_of(["BANETTE", "SPIRITOMB", "DUSKNOIR", "SHEDINJA", "COFAGRIGUS"])) { move_names.push("SPIRITSHACKLE"); }
    if ((hasType("GRASS") && hasType("GHOST")) || is_fusion_of(["GASTLY", "HAUNTER", "GENGAR", "MIMIKYU", "ZORUA", "ZOROARK"])) { move_names.push("TRICKORTREAT"); }
    if (is_fusion_of(["HITMONLEE", "HITMONTOP", "ROSERADE"]) || (hasType("GRASS") && hasType("FIGHTING"))) { move_names.push("TROPKICK"); }
    if (is_fusion_of(["ODDISH", "GLOOM", "VILEPLUME", "BELLOSSOM", "HOPPIP", "SKIPLOOM", "JUMPLUFF", "BELLSPROUT", "WEEPINBELL", "VICTREEBEL", "PARAS", "PARASECT", "DRIFBLIM", "BRELOOM"])) { move_names.push("STRENGTHSAP"); }
    if ((canLearnMove("CRABHAMMER") || canLearnMove("GRASSHAMMER") || canLearnMove("HAMMERARM")) && hasType("ICE")) { move_names.push("ICEHAMMER"); }
    if (is_fusion_of(["ARCEUS", "MEW", "GENESECT"])) { move_names.push("MULTIATTACK"); }
    if (is_fusion_of(["CHIMCHAR", "MONFERNO", "INFERNAPE", "KADABRA", "ALAKAZAM", "SLOWKING"])) { move_names.push("INSTRUCT"); }
    if (hasType("PSYCHIC")) { move_names.push("PSYCHICTERRAIN"); }
    if (hasType("FAIRY")) { move_names.push("MISTYTERRAIN"); }
    if (is_fusion_of(["PIKACHU", "RAICHU", "ABRA", "KADABRA", "ALAKAZAM", "PORYGON", "PORYGON2", "PORYGONZ", "MEWTWO", "MEW", "JOLTIK", "GALVANTULA"])) { move_names.push("SPEEDSWAP"); }
    if ((is_fusion_of(["JYNX", "JIGGLYPUFF", "WIGGLYTUFF"]) && hasType("WATER")) || is_fusion_of(["LAPRAS"])) { move_names.push("SPARKLINGARIA"); }
    if (is_fusion_of(["GIRATINA", "PALKIA", "DIALGA", "ARCEUS"])) { move_names.push("HYPERSPACEFURY"); }
    if (is_fusion_of(["GIRATINA", "PALKIA", "DIALGA", "RAYQUAZA"])) { move_names.push("COREENFORCER"); }
    if (is_fusion_of(["ELECTABUZZ", "ELECTIVIRE", "ZEKROM"]) || (is_fusion_of(["ROTOM"]) && canLearnMove("THUNDERPUNCH"))) { move_names.push("PLASMAFISTS"); }
    if (is_fusion_of(["ARCEUS", "MEW", "CELEBI", "JIRACHI"])) { move_names.push("LIGHTOFRUIN"); }
    if (is_fusion_of(["GARDEVOIR", "GALLADE", "SYLVEON", "WIGGLYTUFF"])) { move_names.push("FLEURCANNON"); }
    if (is_fusion_of(["CELEBI", "KYOGRE", "GROUDON", "ABSOL"])) { move_names.push("NATURESMADNESS"); }
    if (is_fusion_of(["CELEBI"])) { move_names.push("GEOMANCY"); }
    if (is_fusion_of(["ENTEI", "HOOH", "TYPHLOSION"])) { move_names.push("VCREATE"); }
    if (is_fusion_of(["MAGCARGO", "TYPHLOSION", "MAGMORTAR", "MAGMAR", "ENTEI", "GROUDON"]) || canLearnMove("ERUPTION")) { move_names.push("MAGMASTORM"); }
    if (is_fusion_of(["MAGMORTAR"])) { move_names.push("SEARINGSHOT"); }
    if (is_fusion_of(["MURKROW", "HONCHKROW"]) || (hasType("DARK") && hasType("FLYING"))) { move_names.push("OBLIVIONWING"); }
    if ((is_fusion_of(["CLEFFA", "CLEFAIRY", "CLEFABLE"]) && hasType("DARK")) || is_fusion_of(["DARKRAI", "MISDREAVUS", "MISMAGIUS"])) { move_names.push("MOONGEISTBEAM"); }
    if (is_fusion_of(["HAUNTER", "GENGAR", "BANETTE", "GIRATINA", "HONEDGE", "DOUBLADE", "AEGISLASH"])) { move_names.push("SPECTRALTHIEF"); }
    if (is_fusion_of(["JUMPLUFF", "SUNFLORA"])) { move_names.push("SEEDFLARE"); }
    if (is_fusion_of(["GROUDON"])) { move_names.push("LANDSWRATH"); }
    if (is_fusion_of(["SANDSLASH", "JOLTEON", "FERROTHORN"]) && hasType("GROUND")) { move_names.push("THOUSANDARROWS"); }
    if (is_fusion_of(["STUNFISK", "QUAGSIRE", "SWAMPERT"])) { move_names.push("THOUSANDWAVES"); }
    if (is_fusion_of(["KYUREM", "ARTICUNO"]) && hasType("ELECTRIC")) { move_names.push("FREEZESHOCK"); }
    if (is_fusion_of(["KYUREM", "ARTICUNO"]) && hasType("FIRE")) { move_names.push("ICEBURN"); }
    if (is_fusion_of(["MEOWTH", "JIRACHI", "DELIBIRD", "MUNCHLAX", "SNORLAX", "PIKACHU", "RAICHU"])) { move_names.push("HAPPYHOUR"); }
    if (is_fusion_of(["CHARMANDER", "BULBASAUR", "SQUIRTLE", "PIKACHU", "TOGEPI"])) { move_names.push("HOLDHANDS"); }
    if (is_fusion_of(["CHARIZARD", "VOLCARONA", "FLAREON", "NINETALES", "ENTEI", "HOOH", "RAPIDASH"]) && hasType("STEEL")) { move_names.push("SUNSTEELSTRIKE"); }
    if (canLearnMove("DOUBLESLAP") && hasType("STEEL")) { move_names.push("DOUBLEIRONBASH"); }
    if (canLearnMove("ERUPTION") && hasType("WATER")) { move_names.push("STEAMERUPTION"); }
    if (is_fusion_of(["HONEDGE", "DOUBLADE", "AEGISLASH", "GALLADE", "FARFETCHD", "ABSOL", "BISHARP"])) { move_names.push("SECRETSWORD"); }
    // End of generated code

    return move_names.map(name => move_name_map[name]);
}

function filter(filter_state) {
    const { game_data, sprites_metadata, type_name_map, poke_name_map, move_name_map, expert_moves } = global_data;

    const min_stat_keys = Object.keys(filter_state.stat_minimum_filter).filter(k => filter_state.stat_minimum_filter[k]);

    const enabled_resistance_filters = Object.entries(filter_state.resistance_filter).map(([name, filter]) => {
        if (filter.value !== null) {
            filter.type_id = type_name_map[name];
            return filter;
        }
    }).filter(x => x);

    const filtered_pokemon = game_data.pokemon.filter(poke => {
        const resistance_filter_passed = enabled_resistance_filters.length === 0 || enabled_resistance_filters.every(filter => {
            const resist = get_resistance_value(game_data.types, poke, filter.type_id);
            return condition(resist, filter.value, filter.condition);
        });
        if (!resistance_filter_passed) {
            return false;
        }

        if (filter_state.resistance_count_filter.Weaknesses !== null || filter_state.resistance_count_filter.Resistances !== null || filter_state.resistance_count_filter.Immunities !== null) {
            if (!Object.hasOwn(poke, "resistance_counts")) {
                // Cache resistance counts
                const resistance_counts = {
                    "0": 0,
                    "0.25": 0,
                    "0.5": 0,
                    "1": 0,
                    "2": 0,
                    "4": 0
                };
                for (const type_name of standard_types) {
                    const type_id = type_name_map[type_name];
                    const resist = get_resistance_value(game_data.types, poke, type_id);
                    resistance_counts[resist] += 1;
                }
                poke.resistance_counts = resistance_counts;
            }
            if (filter_state.resistance_count_filter.Weaknesses !== null && filter_state.resistance_count_filter.Weaknesses < poke.resistance_counts["2"] + poke.resistance_counts["4"] * 2) {
                return false;
            } else if (filter_state.resistance_count_filter.Resistances !== null && filter_state.resistance_count_filter.Resistances > poke.resistance_counts["0.5"] + poke.resistance_counts["0.25"] * 2 + poke.resistance_counts["0"] * 3) {
                return false;
            } else if (filter_state.resistance_count_filter.Immunities !== null && filter_state.resistance_count_filter.Immunities > poke.resistance_counts["0"]) {
                return false;
            }
        }

        const self_fusion_filter_passed = !filter_state.self_fusion_filter || poke.head_id !== poke.body_id || !!poke.triple_fusion_ids;
        if (!self_fusion_filter_passed) {
            return false;
        }

        const ability_filter_passed = filter_state.ability_filter.size === 0 ||
            (poke.abilities.some(ab => filter_state.ability_filter.has(ab)) || poke.hidden_abilities.some(ab => filter_state.ability_filter.has(ab)));
        if (!ability_filter_passed) {
            return false;
        }

        const exclusive_name_whitelist_filter_passed = (!filter_state.exclusive_name_whitelist || filter_state.name_whitelist.size === 0) ||
            (filter_state.name_whitelist.has(poke.head_id) && filter_state.name_whitelist.has(poke.body_id)) ||
            (poke.triple_fusion_ids && poke.triple_fusion_ids.every(id => filter_state.name_whitelist.has(id)));
        if (!exclusive_name_whitelist_filter_passed) {
            return false;
        }

        const name_whitelist_filter_passed = (filter_state.exclusive_name_whitelist || filter_state.name_whitelist.size === 0) ||
            (filter_state.name_whitelist.has(poke.head_id) || filter_state.name_whitelist.has(poke.body_id)) ||
            (poke.triple_fusion_ids && poke.triple_fusion_ids.some(id => filter_state.name_whitelist.has(id)));
        if (!name_whitelist_filter_passed) {
            return false;
        }

        const highlighted_names_filter_passed = filter_state.highlighted_names.size === 0 ||
            (filter_state.highlighted_names.has(poke.head_id) || filter_state.highlighted_names.has(poke.body_id)) ||
            (poke.triple_fusion_ids && poke.triple_fusion_ids.some(id => filter_state.name_whitelist.has(id)));
        if (!highlighted_names_filter_passed) {
            return false;
        }

        const minimum_stat_filter_passed = min_stat_keys.every(key => {
            if (key === "max(ATK, SPA)") {
                return filter_state.stat_minimum_filter[key] < Math.max(poke.atk, poke.spa);
            }
            return filter_state.stat_minimum_filter[key] < poke[key.toLowerCase()];
        });
        if (!minimum_stat_filter_passed) {
            return false;
        }

        const type_filter_passed = !filter_state.type_filter_enabled || (filter_state.type_filter_condition
            ? poke.types.every(tp => filter_state.type_filter.has(tp))
            : poke.types.some(tp => filter_state.type_filter.has(tp)));
        if (!type_filter_passed) {
            return false;
        }

        const sprite_key = poke.is_fused ? `${poke.head_id}.${poke.body_id}` : String(poke.head_id);
        const sprites_info = sprites_metadata.sprites[sprite_key];

        const customless_filter_passed = filter_state.only_show_customless
            ? !sprites_info || !sprites_info.has_main
            : (filter_state.show_customless || (sprites_info && (sprites_info.has_main || sprites_info.alt_count > 0)));
        if (!customless_filter_passed) {
            return false;
        }

        const triple_fusions_filter_passed = filter_state.only_show_triple_fusions
            ? !!poke.triple_fusion_ids
            : filter_state.show_triple_fusions || !poke.triple_fusion_ids;
        if (!triple_fusions_filter_passed) {
            return false;
        }

        const head_evolutions = game_data.evolutions[poke.head_id];
        const body_evolutions = game_data.evolutions[poke.body_id];

        let evolution_level_range_filter_passed = !filter_state.evolution_level_range_filter_enabled;
        if (filter_state.evolution_level_range_filter_enabled) {
            const evo_level_range_checker = evo => {
                const kind = evo.kind;
                if ("Level" in kind) {
                    return kind.Level >= filter_state.evolution_level_range_filter_min
                        && kind.Level <= filter_state.evolution_level_range_filter_max;
                }
                // Allow other kinds of evos
                return true;
            };

            const head_evo_level_range_filter_passed = head_evolutions.length === 0
                || head_evolutions.some(evo_level_range_checker);
            const body_evo_level_range_filter_passed = body_evolutions.length === 0
                || body_evolutions.some(evo_level_range_checker);

            evolution_level_range_filter_passed = filter_state.evolution_level_range_filter_condition
                ? head_evo_level_range_filter_passed && body_evo_level_range_filter_passed
                : head_evo_level_range_filter_passed || body_evo_level_range_filter_passed;
        }

        let evolution_item_filter_passed = !filter_state.evolution_item_filter_enabled;
        if (filter_state.evolution_item_filter_enabled) {
            const evo_item_checker = evo => {
                return evo.is_preevo && "Item" in evo.kind;
            };

            const head_evo_item_filter_passed = filter_state.evolution_item_filter_required
                ? head_evolutions.some(evo_item_checker)
                : !head_evolutions.some(evo_item_checker);
            const body_evo_item_filter_passed = filter_state.evolution_item_filter_required
                ? body_evolutions.some(evo_item_checker)
                : !body_evolutions.some(evo_item_checker);

            evolution_item_filter_passed = filter_state.evolution_item_filter_condition
                ? head_evo_item_filter_passed && body_evo_item_filter_passed
                : head_evo_item_filter_passed || body_evo_item_filter_passed;
        }

        if (filter_state.evolution_filters_condition) {
            if (filter_state.evolution_level_range_filter_enabled && !evolution_level_range_filter_passed) {
                return false;
            }
            if (filter_state.evolution_item_filter_enabled && !evolution_item_filter_passed) {
                return false;
            }
        } else {
            const none_enabled = !filter_state.evolution_level_range_filter_enabled && !filter_state.evolution_item_filter_enabled;
            if (!none_enabled) {
                let passed = false;
                if (filter_state.evolution_level_range_filter_enabled && evolution_level_range_filter_passed) {
                    passed = true;
                }
                if (filter_state.evolution_item_filter_enabled && evolution_item_filter_passed) {
                    passed = true;
                }
                if (!passed) {
                    return false;
                }
            }
        }

        const move_filter_passed = filter_state.move_filter.size === 0 ||
            Array.from(filter_state.move_filter).some(move_id => can_learn_move(poke, game_data.moves, move_id)) ||
            expert_moves.intersection(filter_state.move_filter).size > 0 &&
            get_expert_moves(poke, game_data.moves, poke_name_map, type_name_map, move_name_map).some(move_id => filter_state.move_filter.has(move_id));
        if (!move_filter_passed) {
            return false;
        }

        if (poke.triple_fusion_ids) {
            if (filter_state.name_blacklist_half_only) {
                return !(poke.triple_fusion_ids.every(id => filter_state.name_blacklist.has(id)));
            } else {
                return !(poke.triple_fusion_ids.some(id => filter_state.name_blacklist.has(id)));
            }
        } else if (poke.is_fused) {
            if (filter_state.name_blacklist_half_only) {
                return !(filter_state.name_blacklist.has(poke.head_id) && filter_state.name_blacklist.has(poke.body_id));
            } else {
                return !(filter_state.name_blacklist.has(poke.head_id) || filter_state.name_blacklist.has(poke.body_id));
            }
        } else {
            return !filter_state.name_blacklist.has(poke.head_id);
        }
    });

    return filtered_pokemon;
}
