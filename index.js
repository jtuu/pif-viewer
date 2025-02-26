import { PokeCard, poke_key } from "./PokeCard.js";
import { StatFilter } from "./StatFilter.js";
import { NameFilter } from "./NameFilter.js";
import { TypeFilter, standard_types } from "./TypeFilter.js";
import { AbilityFilter } from "./AbilityFilter.js";
import { ResistanceFilter } from "./ResistanceFilter.js";

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

function get_resistance_value(types, poke, attacker_type_name) {
    const attacker_type = Object.values(types).find(tp => tp.name.toLowerCase() === attacker_type_name.toLowerCase()).id;
    let effectiveness = 1;
    const type1 = types[poke.type1];
    if (type1.weaknesses.includes(attacker_type)) {
        effectiveness *= 2;
    } else if (type1.resistances.includes(attacker_type)) {
        effectiveness *= 0.5;
    } else if (type1.immunities.includes(attacker_type)) {
        effectiveness *= 0;
    }
    if (effectiveness > 0 && poke.type1 !== poke.type2) {
        const type2 = types[poke.type2];
        if (type2.weaknesses.includes(attacker_type)) {
            effectiveness *= 2;
        } else if (type2.resistances.includes(attacker_type)) {
            effectiveness *= 0.5;
        } else if (type2.immunities.includes(attacker_type)) {
            effectiveness *= 0;
        }
    }
    return effectiveness;
}

function sort_and_filter(game_data, sprites_metadata, filter_state) {
    // Filter by name and type
    const type_filter_array = Array.from(filter_state.type_filter);
    const min_stat_keys = Object.keys(filter_state.stat_minimum_filter);

    const filtered_pokemon = game_data.pokemon.filter(poke => {
        const resistance_filter_passed = Object.keys(filter_state.resistance_filter).every(tp => {
            const filter = filter_state.resistance_filter[tp];
            if (filter.value !== null) {
                const resist = get_resistance_value(game_data.types, poke, tp);
                return condition(resist, filter.value, filter.condition);
            }
            return true;
        });
        if (!resistance_filter_passed) {
            return false;
        }

        if (filter_state.resistance_count_filter.Weaknesses !== null || filter_state.resistance_count_filter.Resistances !== null || filter_state.resistance_count_filter.Immunities !== null) {
            if (!Object.hasOwn(poke, "resistance_counts")) {
                const resistance_counts = {
                    "0": 0,
                    "0.25": 0,
                    "0.5": 0,
                    "1": 0,
                    "2": 0,
                    "4": 0
                };
                for (const type of standard_types) {
                    const resist = get_resistance_value(game_data.types, poke, type);
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

        const self_fusion_filter_passed = !filter_state.self_fusion_filter || poke.head_id !== poke.body_id;
        if (!self_fusion_filter_passed) {
            return false;
        }

        const ability_filter_passed = filter_state.ability_filter.size === 0 ||
            (filter_state.ability_filter.intersection(poke.abilities).size > 0 || filter_state.ability_filter.intersection(poke.hidden_abilities).size > 0);
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

        const type1_name = game_data.types[poke.type1].name.toUpperCase();
        const type2_name = game_data.types[poke.type2].name.toUpperCase();

        const type_filter_every_passed = !filter_state.type_filter_condition || type_filter_array.every(tp => type1_name === tp || type2_name === tp);
        if (!type_filter_every_passed) {
            return false;
        }

        const type_filter_some_passed = filter_state.type_filter_condition || (filter_state.type_filter.has(type1_name) || filter_state.type_filter.has(type2_name));
        if (!type_filter_some_passed) {
            return false;
        }

        const sprite_key = poke_key(poke);
        const sprites_info = sprites_metadata.sprites[sprite_key];

        const customless_filter_passed = filter_state.only_show_customless
            ? !sprites_info || !sprites_info.has_main
            : (filter_state.show_customless || (sprites_info && (sprites_info.has_main || sprites_info.alt_count > 0)));
        if (!customless_filter_passed) {
            return false;
        }

        if (poke.is_fused) {
            return !(filter_state.name_blacklist.has(poke.head_id) || filter_state.name_blacklist.has(poke.body_id));
        } else {
            return !filter_state.name_blacklist.has(poke.head_id);
        }
    });

    // Precompute selected stat keys
    const sum_stat_keys = [];
    for (const key of Object.keys(filter_state.stat_sorting_options)) {
        if (filter_state.stat_sorting_options[key]) {
            sum_stat_keys.push(key.toLowerCase());
        }
    }

    // Sort by stat sum
    filtered_pokemon.sort((a, b) => {
        let sum_a = 0;
        let sum_b = 0;
        for (const key of sum_stat_keys) {
            if (key === "max(atk, spa)") {
                sum_a += Math.max(a.atk, a.spa);
                sum_b += Math.max(b.atk, b.spa);
            } else {
                sum_a += a[key];
                sum_b += b[key];
            }
        }
        if (filter_state.stat_sorting_direction) {
            return sum_a - sum_b;
        }
        return sum_b - sum_a;
    });

    return filtered_pokemon;
}

function is_triple_fusion(poke) {
    return poke.head_id >= 999999;
}

function calculate_fused_stat(dom, sub) {
    return Math.floor(((2 * dom) / 3) + (sub / 3));
}

function fuse_pokemon(
    type_map,
    head,
    body
) {
    // Fusions can't be fused again
    if (is_triple_fusion(head) || is_triple_fusion(body) || head.is_fused || body.is_fused) {
        return null;
    }

    const hp = calculate_fused_stat(head.hp, body.hp);
    const spa = calculate_fused_stat(head.spa, body.spa);
    const spd = calculate_fused_stat(head.spd, body.spd);

    const atk = calculate_fused_stat(body.atk, head.atk);
    const def = calculate_fused_stat(body.def, head.def);
    const spe = calculate_fused_stat(body.spe, head.spe);

    const bst = hp + spa + spd + atk + def + spe;

    // Normal/Flying types are special
    const normal_type_id = Object.values(type_map).find(tp => tp.name.toLowerCase() === "normal").id;
    const flying_type_id = Object.values(type_map).find(tp => tp.name.toLowerCase() === "normal").id;
    const type1 = head.type1 == normal_type_id && head.type2 == flying_type_id
        ? head.type2
        : head.type1;

    // Use other if same as head
    const type2 = body.type2 == type1
        ? body.type1
        : body.type2;

    const abilities = head.abilities.slice();
    for (const ab of body.abilities) {
        if (!abilities.includes(ab)) {
            abilities.push(ab);
        }
    }

    const hidden_abilities = head.hidden_abilities.slice();
    for (const ab of body.hidden_abilities) {
        if (!hidden_abilities.includes(ab)) {
            hidden_abilities.push(ab);
        }
    }

    return {
        head_id: head.head_id,
        body_id: body.body_id,
        is_fused: true,
        hp,
        atk,
        def,
        spa,
        spd,
        spe,
        bst,
        type1,
        type2,
        abilities,
        hidden_abilities,
    };
}

function generate_fusions(game_data) {
    const unfused_pokemon = game_data.pokemon.slice();

    // Add self-fusions
    for (let i = 0; i < unfused_pokemon.length; i++) {
        const copy = Object.assign({}, unfused_pokemon[i]);
        copy.is_fused = true;
        game_data.pokemon.push(copy);
    }

    // Add fused pokemon
    // Iterate through every pair of indices
    for (let i = 0; i < unfused_pokemon.length - 1; i++) {
        for (let j = i; j < unfused_pokemon.length - 1; j++) {
            const poke1 = unfused_pokemon[i];
            const poke2 = unfused_pokemon[j + 1];
            const fusion1 = fuse_pokemon(game_data.types, poke1, poke2);
            if (fusion1) {
                game_data.pokemon.push(fusion1);
            }

            const fusion2 = fuse_pokemon(game_data.types, poke2, poke1);
            if (fusion2) {
                game_data.pokemon.push(fusion2);
            }
        }
    }
}

async function download_files() {
    const files = await Promise.all([
        fetch("sprites_metadata.json").then(res => res.json()),
        fetch("game_data.json").then(res => res.json())
    ]);

    const sprites_metadata = files[0];
    const game_data = files[1];

    if (!game_data.contains_fusions) {
        generate_fusions(game_data);
        game_data.contains_fusions = true;
    }

    for (const poke of game_data.pokemon) {
        poke.abilities = new Set(poke.abilities);
        poke.hidden_abilities = new Set(poke.hidden_abilities);
    }

    return { game_data, sprites_metadata };
}

async function main() {
    // Scroll stuff
    const card_width = 192 + 10 * 2 + 10 * 2;
    const card_height = 241;
    let gallery_fragment_size;
    const on_window_resize = () => {
        const cards_per_row = Math.floor(window.innerWidth / card_width);
        gallery_fragment_size = cards_per_row * Math.floor(window.innerHeight / card_height);
        m.redraw();
    };
    on_window_resize();
    window.onresize = on_window_resize;

    let is_loading = true;
    const game_data = {
        abilities: {},
        pokemon_names: {},
        types: {},
        pokemon: []
    };
    const sprites_metadata = {};
    download_files().then(files => {
        Object.assign(game_data, files.game_data);
        Object.assign(sprites_metadata, files.sprites_metadata);

        is_loading = false;

        m.redraw();
    });

    const sorted_pokemon = [];
    const filter_state = {
        name_blacklist: new Set(),
        name_whitelist: new Set(),
        highlighted_names: new Set(),
        exclusive_name_whitelist: false,
        self_fusion_filter: true,
        show_customless: false,
        only_show_customless: false,
        stat_sorting_options: {
            "HP": false,
            "ATK": false,
            "DEF": false,
            "SPA": false,
            "SPD": false,
            "SPE": false,
            "BST": false,
            "max(ATK, SPA)": false
        },
        stat_sorting_direction: false,
        stat_minimum_filter: {
            "HP": 0,
            "ATK": 0,
            "DEF": 0,
            "SPA": 0,
            "SPD": 0,
            "SPE": 0,
            "BST": 0,
            "max(ATK, SPA)": 0
        },
        type_filter_condition: false,
        type_filter: new Set(standard_types),
        ability_filter: new Set(),
        resistance_filter: standard_types.reduce((acc, cur) => { acc[cur] = { value: null, condition: "=" }; return acc; }, {}),
        resistance_count_filter: {
            Weaknesses: null,
            Resistances: null,
            Immunities: null
        }
    };

    const apply_sorting_and_filtering = () => {
        const result = sort_and_filter(game_data, sprites_metadata, filter_state);
        // Replace all array elements with new result
        sorted_pokemon.length = result.length;
        for (let i = 0; i < result.length; i++) {
            sorted_pokemon[i] = result[i];
        }
        reset_scroll_cache();
    };

    // State storage
    let inf_scroll_cache_hash;
    const reset_scroll_cache = () => {
        inf_scroll_cache_hash = btoa(JSON.stringify(filter_state, (k, v) => {
            if (v instanceof Set) {
                return Array.from(v);
            }
            return v;
        }));
        localStorage.filter_state = inf_scroll_cache_hash;
    };
    const set_filter_state = (new_state) => {
        filter_state.name_blacklist = new Set(new_state.name_blacklist);
        filter_state.name_whitelist = new Set(new_state.name_whitelist);
        filter_state.stat_sorting_options = new_state.stat_sorting_options;
        filter_state.stat_sorting_direction = new_state.stat_sorting_direction;
        filter_state.stat_minimum_filter = new_state.stat_minimum_filter;
        filter_state.type_filter_condition = new_state.type_filter_condition;
        filter_state.type_filter = new Set(new_state.type_filter);
        filter_state.ability_filter = Object.hasOwn(new_state, "ability_filter") ? new Set(new_state.ability_filter) : new Set();
        filter_state.resistance_filter = Object.hasOwn(new_state, "resistance_filter")
            ? Object.assign(filter_state.resistance_filter, new_state.resistance_filter)
            : filter_state.resistance_filter;
        filter_state.resistance_count_filter = Object.hasOwn(new_state, "resistance_count_filter")
            ? Object.assign(filter_state.resistance_count_filter, new_state.resistance_count_filter)
            : filter_state.resistance_count_filter;
        filter_state.exclusive_name_whitelist = Boolean(new_state.exclusive_name_whitelist);
        filter_state.self_fusion_filter = Boolean(new_state.self_fusion_filter);
        filter_state.highlighted_names = Object.hasOwn(new_state, "highlighted_names")
            ? new Set(new_state.highlighted_names)
            : filter_state.highlighted_names;
        filter_state.show_customless = Boolean(new_state.show_customless);
        filter_state.only_show_customless = Boolean(new_state.only_show_customless);
        apply_sorting_and_filtering();
    };
    const load_state_from_local_storage = () => {
        if (localStorage.filter_state) {
            const str = localStorage.filter_state;
            const state = JSON.parse(atob(str));
            set_filter_state(state);
        }
    };

    load_state_from_local_storage();
    reset_scroll_cache();

    let latest_loaded_page = 0;
    const app = m.mount(document.body, {
        onbeforeupdate() {
            apply_sorting_and_filtering();
        },
        view() {
            return is_loading ? m("div.loading", "Loading...") : [
                // Controls
                m("div.controls",
                    m(StatFilter, { filter_state }),
                    m(NameFilter, { filter_state, unfused_names: game_data.pokemon_names }),
                    m(TypeFilter, { filter_state }),
                    m(AbilityFilter, { filter_state, all_abilities: game_data.abilities, sorted_pokemon }),
                    m(ResistanceFilter, { filter_state })),
                // Gallery
                m("div.poke-gallery",
                    m(InfinityScroll, {
                        pageRequestParam: inf_scroll_cache_hash,
                        preload: true,
                        pageCount: gallery_fragment_size,
                        loadingFooter: m("div", `Showing ${gallery_fragment_size * (latest_loaded_page + 1)}/${sorted_pokemon.length} Pokemon. Loading...`),
                        pageRequest: page_num => {
                            return new Promise(resolve => {
                                resolve(sorted_pokemon.slice(gallery_fragment_size * page_num, gallery_fragment_size * (page_num + 1)));
                                latest_loaded_page = page_num;
                                m.redraw();
                            });
                        },
                        processPageData: data => {
                            return data.map(poke => m(PokeCard, {
                                key: poke_key(poke),
                                poke,
                                game_data,
                                sprites_metadata
                            }));
                        }
                    }))
            ];
        }
    });
}

main();
