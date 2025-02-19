import { PokeCard, poke_key } from "./PokeCard.js";
import { StatFilter } from "./StatFilter.js";
import { NameFilter } from "./NameFilter.js";
import { TypeFilter } from "./TypeFilter.js";
import { AbilityFilter } from "./AbilityFilter.js";
import { ResistanceFilter } from "./ResistanceFilter.js";

const SPRITESHEET_WIDTH = 1920;
const SPRITESHEET_HEIGHT = 2496;
const SPRITESHEET_COLUMNS = 20;
const SPRITE_SIZE = 96;

const types = [
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

const type_chart = [
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 1.0],
    [1.0, 0.5, 0.5, 1.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 0.5, 1.0, 2.0, 1.0],
    [1.0, 2.0, 0.5, 1.0, 0.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0, 1.0],
    [1.0, 1.0, 2.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0],
    [1.0, 0.5, 2.0, 1.0, 0.5, 1.0, 1.0, 0.5, 2.0, 0.5, 1.0, 0.5, 2.0, 1.0, 0.5, 1.0, 0.5, 1.0],
    [1.0, 0.5, 0.5, 1.0, 2.0, 0.5, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0],
    [2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 0.5, 0.5, 0.5, 2.0, 0.0, 1.0, 2.0, 2.0, 0.5],
    [1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 0.0, 2.0],
    [1.0, 2.0, 1.0, 2.0, 0.5, 1.0, 1.0, 2.0, 1.0, 0.0, 1.0, 0.5, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0],
    [1.0, 1.0, 1.0, 0.5, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0, 1.0, 0.5, 1.0],
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 0.0, 0.5, 1.0],
    [1.0, 0.5, 1.0, 1.0, 2.0, 1.0, 0.5, 0.5, 1.0, 0.5, 2.0, 1.0, 1.0, 0.5, 1.0, 2.0, 0.5, 0.5],
    [1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 0.5, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0],
    [0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0],
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 0.0],
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 0.5],
    [1.0, 0.5, 0.5, 0.5, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 0.5, 2.0],
    [1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 0.5, 1.0]];

function get_resistance_value(poke, attacker_type) {
    const attack_resists = type_chart[types.indexOf(attacker_type)];
    let resist = attack_resists[types.indexOf(poke.type1)];
    if (poke.type2 !== poke.type1) {
        resist *= attack_resists[types.indexOf(poke.type2)];
    }
    return resist;
}

function sort_and_filter(all_pokemon, filter_state) {
    // Filter by name and type
    const type_filter_array = Array.from(filter_state.type_filter);
    const min_stat_keys = Object.keys(filter_state.stat_minimum_filter);

    const filtered_pokemon = all_pokemon.filter(poke => {
        const resistance_filter_passed = Object.keys(filter_state.resistance_filter).every(tp => {
            const filter = filter_state.resistance_filter[tp];
            if (filter.value !== null) {
                const resist = get_resistance_value(poke, tp);
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
                for (const type of types) {
                    const resist = get_resistance_value(poke, type);
                    resistance_counts[resist] += 1;
                }
                poke.resistance_counts = resistance_counts;
            }
            if (filter_state.resistance_count_filter.Weaknesses !== null && filter_state.resistance_count_filter.Weaknesses < poke.resistance_counts["2"] + poke.resistance_counts["4"] * 2) {
                return false;
            } else if (filter_state.resistance_count_filter.Resistances !== null && filter_state.resistance_count_filter.Resistances > poke.resistance_counts["0.5"] + poke.resistance_counts["0.25"] * 2 + poke.resistance_counts["0"] * 3) {
                return false;
            } else if (filter_state.resistance_count_filter.Immunities !== null && filter_state.resistance_count_filter.Weaknesses > poke.resistance_counts["0"]) {
                return false;
            }
        }

        const self_fusion_filter_passed = !filter_state.self_fusion_filter || poke.head_name !== poke.body_name;
        if (!self_fusion_filter_passed) {
            return false;
        }

        const ability_filter_passed = filter_state.ability_filter.size === 0 ||
            (filter_state.ability_filter.intersection(poke.abilities).size > 0 || filter_state.ability_filter.intersection(poke.hidden_abilities).size > 0);
        if (!ability_filter_passed) {
            return false;
        }

        const exclusive_name_whitelist_filter_passed = (!filter_state.exclusive_name_whitelist || filter_state.name_whitelist.size === 0) ||
            (filter_state.name_whitelist.has(poke.head_name) && filter_state.name_whitelist.has(poke.body_name));
        if (!exclusive_name_whitelist_filter_passed) {
            return false;
        }

        const name_whitelist_filter_passed = (filter_state.exclusive_name_whitelist || filter_state.name_whitelist.size === 0) ||
            (filter_state.name_whitelist.has(poke.head_name) || filter_state.name_whitelist.has(poke.body_name));
        if (!name_whitelist_filter_passed) {
            return false;
        }

        const highlighted_names_filter_passed = filter_state.highlighted_names.size === 0 ||
            filter_state.highlighted_names.has(poke.head_name) || filter_state.highlighted_names.has(poke.body_name);
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

        const type_filter_every_passed = !filter_state.type_filter_condition || type_filter_array.every(tp => poke.type1 === tp || poke.type2 === tp);
        if (!type_filter_every_passed) {
            return false;
        }

        const type_filter_some_passed = filter_state.type_filter_condition || (filter_state.type_filter.has(poke.type1) || filter_state.type_filter.has(poke.type2));
        if (!type_filter_some_passed) {
            return false;
        }

        const customless_filter_passed = filter_state.only_show_customless
            ? !poke.alt_count
            : filter_state.show_customless || poke.alt_count > 0;
        if (!customless_filter_passed) {
            return false;
        }

        if (poke.is_fused) {
            return !(filter_state.name_blacklist.has(poke.head_name) || filter_state.name_blacklist.has(poke.body_name));
        } else {
            return !filter_state.name_blacklist.has(poke.name);
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

async function download_files() {
    const files = await Promise.all([
        fetch("pokemon.json").then(res => res.json()),
        fetch("unfused_names.json").then(res => res.json()),
        fetch("abilities.json").then(res => res.json())
    ]);

    const all_pokemon = files[0];
    const unfused_names = files[1];
    const all_abilities = files[2];

    for (const poke of all_pokemon) {
        poke.abilities = new Set(poke.abilities);
        poke.hidden_abilities = new Set(poke.hidden_abilities);
    }

    return { all_pokemon, unfused_names, all_abilities };
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
    const all_pokemon = [];
    const unfused_names = new Set();
    const all_abilities = new Set();
    download_files().then(files => {
        all_pokemon.length = files.all_pokemon.length;
        for (let i = 0; i < files.all_pokemon.length; i++) {
            all_pokemon[i] = files.all_pokemon[i];
        }

        for (const name of files.unfused_names) {
            unfused_names.add(name);
        }

        for (const ability of files.all_abilities) {
            all_abilities.add(ability);
        }

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
        type_filter: new Set(types),
        ability_filter: new Set(),
        resistance_filter: types.reduce((acc, cur) => { acc[cur] = { value: null, condition: "=" }; return acc; }, {}),
        resistance_count_filter: {
            Weaknesses: null,
            Resistances: null,
            Immunities: null
        }
    };

    const apply_sorting_and_filtering = () => {
        const result = sort_and_filter(all_pokemon, filter_state);
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
                    m(NameFilter, { filter_state, unfused_names }),
                    m(TypeFilter, { filter_state, types }),
                    m(AbilityFilter, { filter_state, all_abilities, sorted_pokemon }),
                    m(ResistanceFilter, { filter_state, types })),
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
                                poke
                            }));
                        }
                    }))
            ];
        }
    });
}

main();
