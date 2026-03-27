import { JobCancellationException, sort_and_filter } from "./worker_interface.js";
import { standard_types } from "./TypeFilter.js";

export function default_filter_state() {
    return {
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
        stat_maximum_filter: {
            "HP": 255,
            "ATK": 255,
            "DEF": 255,
            "SPA": 255,
            "SPD": 255,
            "SPE": 255,
            "BST": 1000,
            "max(ATK, SPA)": 255
        },
        type_filter_enabled: false,
        type_filter_condition: false,
        type_filter: new Set(),
        ability_filter: new Set(),
        resistance_filter: standard_types.reduce((acc, cur) => { acc[cur] = { value: null, condition: "=" }; return acc; }, {}),
        resistance_count_filter: {
            Weaknesses: null,
            Resistances: null,
            Immunities: null
        },
        evolution_filters_condition: false,
        evolution_level_range_filter_enabled: false,
        evolution_level_range_filter_condition: false,
        evolution_level_range_filter_min: 1,
        evolution_level_range_filter_max: 100,
        evolution_item_filter_enabled: false,
        evolution_item_filter_condition: false,
        evolution_item_filter_required: true,
        display_shiny_sprites: false,
        is_head_shiny: false,
        is_body_shiny: false,
        show_triple_fusions: true,
        only_show_triple_fusions: false,
        move_filter: new Set(),
        move_filter_type: null,
        name_blacklist_half_only: false,
        name_filter_add_all_evolutions: false,
        show_hoenn: false,
        only_show_hoenn: false,
        debug_filter_url: "",
        debug_query: "",
        cache_buster: 0
    };
}

export async function apply_filter(filter_state, filter_workers, game_data) {
    let result;
    try {
        result = await sort_and_filter(game_data.pokemon, filter_workers, filter_state);
    } catch (err) {
        if (err instanceof JobCancellationException) {
            return;
        }
        throw err;
    }

    return result;
}

export function set_filter_state(filter_state, new_state) {
    filter_state.name_blacklist = new Set(new_state.name_blacklist);
    filter_state.name_whitelist = new Set(new_state.name_whitelist);
    filter_state.stat_sorting_options = new_state.stat_sorting_options;
    filter_state.stat_sorting_direction = new_state.stat_sorting_direction;
    filter_state.stat_minimum_filter = new_state.stat_minimum_filter;
    filter_state.stat_maximum_filter = Object.hasOwn(new_state, "stat_maximum_filter")
        ? Object.assign(filter_state.stat_maximum_filter, new_state.stat_maximum_filter)
        : filter_state.stat_maximum_filter;
    filter_state.type_filter_enabled = Boolean(new_state.type_filter_enabled);
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
    filter_state.evolution_filters_condition = Boolean(new_state.evolution_filters_condition);
    filter_state.evolution_level_range_filter_enabled = Boolean(new_state.evolution_level_range_filter_enabled);
    filter_state.evolution_level_range_filter_condition = Boolean(new_state.evolution_level_range_filter_condition);
    filter_state.evolution_level_range_filter_min = Object.hasOwn(new_state, "evolution_level_range_filter_min")
        ? new_state.evolution_level_range_filter_min
        : filter_state.evolution_level_range_filter_min;
    filter_state.evolution_level_range_filter_max = Object.hasOwn(new_state, "evolution_level_range_filter_min")
        ? new_state.evolution_level_range_filter_max
        : filter_state.evolution_level_range_filter_max;
    filter_state.evolution_item_filter_enabled = Boolean(new_state.evolution_item_filter_enabled);
    filter_state.evolution_item_filter_condition = Boolean(new_state.evolution_item_filter_condition);
    filter_state.evolution_item_filter_required = Boolean(new_state.evolution_item_filter_required);
    filter_state.display_shiny_sprites = Boolean(new_state.display_shiny_sprites);
    filter_state.is_head_shiny = Boolean(new_state.is_head_shiny);
    filter_state.is_body_shiny = Boolean(new_state.is_body_shiny);
    filter_state.show_triple_fusions = Boolean(new_state.show_triple_fusions);
    filter_state.only_show_triple_fusions = Boolean(new_state.only_show_triple_fusions);
    filter_state.move_filter = Object.hasOwn(new_state, "move_filter") ? new Set(new_state.move_filter) : new Set();
    filter_state.move_filter_type = isNaN(new_state.move_filter_type) ? null : new_state.move_filter_type;
    filter_state.name_blacklist_half_only = Boolean(new_state.name_blacklist_half_only);
    filter_state.name_filter_add_all_evolutions = Boolean(new_state.name_filter_add_all_evolutions);
    filter_state.show_hoenn = Boolean(new_state.show_hoenn);
    filter_state.only_show_hoenn = Boolean(new_state.only_show_hoenn);
    filter_state.debug_filter_url = Object.hasOwn(new_state, "debug_filter_url") ? new_state.debug_filter_url : "";
    filter_state.debug_query = Object.hasOwn(new_state, "debug_query") ? new_state.debug_query : "";
    filter_state.cache_buster = Object.hasOwn(new_state, "cache_buster") ? new_state.cache_buster : 0;

    // Try to detect legacy format
    const contains_nan_item = arr => arr.length > 0 && isNaN(arr[0]);
    // These sets used to contain strings, now they contain numbers
    if (contains_nan_item(Array.from(filter_state.name_blacklist))) {
        filter_state.name_blacklist.clear();
    }
    if (contains_nan_item(Array.from(filter_state.name_whitelist))) {
        filter_state.name_whitelist.clear();
    }
    if (contains_nan_item(Array.from(filter_state.ability_filter))) {
        filter_state.ability_filter.clear();
    }
    if (contains_nan_item(Array.from(filter_state.type_filter))) {
        filter_state.type_filter.clear();
    }
}

export function load_state_from_local_storage(filter_state) {
    if (localStorage.filter_state) {
        const hash = localStorage.filter_state;
        const state = JSON.parse(atob(hash));
        set_filter_state(filter_state, state);
        return hash;
    }
    return "";
}

export function save_state_to_local_storage(filter_state) {
    const serialized = JSON.stringify(filter_state, (k, v) => {
        if (v instanceof Set) {
            return Array.from(v);
        }
        return v;
    });
    const hash = btoa(serialized);
    localStorage.filter_state = hash;
    return hash;
}
