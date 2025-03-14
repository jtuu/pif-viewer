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

const global_data = {};

self.onmessage = ({ data }) => {
    switch (data.topic) {
        case "init":
            global_data.game_data = data.game_data;
            global_data.sprites_metadata = data.sprites_metadata;
            break;
        case "filter":
            const result = filter(global_data.game_data, global_data.sprites_metadata, data.filter_state);
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

function filter(game_data, sprites_metadata, filter_state) {
    const min_stat_keys = Object.keys(filter_state.stat_minimum_filter).filter(k => filter_state.stat_minimum_filter[k]);

    if (!game_data.type_id_map) {
        game_data.type_id_map = {};
        for (const tp of Object.values(game_data.types)) {
            game_data.type_id_map[tp.name.toUpperCase()] = tp.id;
        }
    }

    const enabled_resistance_filters = Object.entries(filter_state.resistance_filter).map(([name, filter]) => {
        if (filter.value !== null) {
            filter.type_id = game_data.type_id_map[name];
            return filter;
        }
    }).filter(x => x);

    const filtered_pokemon = game_data.pokemon.filter(poke => {
        let i = 0;
        if (poke.triple_fusion_ids) {
            i = 1;
        }

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
                    const type_id = game_data.type_id_map[type_name];
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
            (filter_state.name_whitelist.has(poke.head_id) && filter_state.name_whitelist.has(poke.body_id));
        if (!exclusive_name_whitelist_filter_passed) {
            return false;
        }

        const name_whitelist_filter_passed = (filter_state.exclusive_name_whitelist || filter_state.name_whitelist.size === 0) ||
            (filter_state.name_whitelist.has(poke.head_id) || filter_state.name_whitelist.has(poke.body_id));
        if (!name_whitelist_filter_passed) {
            return false;
        }

        const highlighted_names_filter_passed = filter_state.highlighted_names.size === 0 ||
            filter_state.highlighted_names.has(poke.head_id) || filter_state.highlighted_names.has(poke.body_id);
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

        if (poke.is_fused) {
            return !(filter_state.name_blacklist.has(poke.head_id) || filter_state.name_blacklist.has(poke.body_id));
        } else {
            return !filter_state.name_blacklist.has(poke.head_id);
        }
    });

    return filtered_pokemon;
}
