import { PokeCard, details_url, poke_key } from "./PokeCard.js";
import { StatFilter } from "./StatFilter.js";
import { add_name_filter, NameFilter } from "./NameFilter.js";
import { TypeFilter, standard_types } from "./TypeFilter.js";
import { AbilityFilter } from "./AbilityFilter.js";
import { ResistanceFilter } from "./ResistanceFilter.js";
import { EvolutionFilter } from "./EvolutionFilter.js";
import { ConfirmingButton } from "./ConfirmingButton.js";
import { SpriteFilter } from "./SpriteFilter.js";
import { MoveFilter } from "./MoveFilter.js";

const TRIPLE_FUSION_ID_START = 999999;

const TRIPLE_FUSIONS_HARDCODED_DATA = {
    [TRIPLE_FUSION_ID_START + 0]: [144, 145, 146],
    //[TRIPLE_FUSION_ID_START + 1]: [144, 145, 146],
    [TRIPLE_FUSION_ID_START + 2]: [243, 244, 245],
    [TRIPLE_FUSION_ID_START + 3]: [340, 341, 342],
    [TRIPLE_FUSION_ID_START + 4]: [343, 344, 345],
    [TRIPLE_FUSION_ID_START + 5]: [349, 350, 351],
    [TRIPLE_FUSION_ID_START + 6]: [151, 251, 381],
    [TRIPLE_FUSION_ID_START + 11]: [150, 348, 380],
    [TRIPLE_FUSION_ID_START + 7]: [3, 6, 9],
    [TRIPLE_FUSION_ID_START + 8]: [154, 157, 160],
    [TRIPLE_FUSION_ID_START + 9]: [278, 281, 284],
    [TRIPLE_FUSION_ID_START + 10]: [318, 321, 324],
    [TRIPLE_FUSION_ID_START + 12]: [1, 4, 7],
    [TRIPLE_FUSION_ID_START + 13]: [2, 5, 8],
    [TRIPLE_FUSION_ID_START + 14]: [152, 155, 158],
    [TRIPLE_FUSION_ID_START + 15]: [153, 156, 159],
    [TRIPLE_FUSION_ID_START + 16]: [276, 279, 282],
    [TRIPLE_FUSION_ID_START + 17]: [277, 280, 283],
    [TRIPLE_FUSION_ID_START + 18]: [316, 319, 322],
    [TRIPLE_FUSION_ID_START + 19]: [317, 320, 323],
    [TRIPLE_FUSION_ID_START + 21]: [144, 145, 146],
    //[TRIPLE_FUSION_ID_START + 24]: [343, 344, 345],
    [TRIPLE_FUSION_ID_START + 27]: [447, 448, 449],
    [TRIPLE_FUSION_ID_START + 28]: [479, 482, 485],
    [TRIPLE_FUSION_ID_START + 29]: [480, 483, 486],
    [TRIPLE_FUSION_ID_START + 30]: [481, 484, 487],
};

function default_filter_state() {
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
        name_filter_add_all_evolutions: false
    };
}

function init_filter_workers(num_workers, game_data, sprites_metadata) {
    const chunk_size = Math.floor(game_data.pokemon.length / num_workers);
    const workers = [];

    const poke_name_map = {};
    for (let i = 0; i < game_data.nb_pokemon; i++) {
        const poke = game_data.pokemon[i];
        poke_name_map[game_data.pokemon_names[poke.head_id].toUpperCase()] = poke.head_id;
    }

    for (let i = 0; i < num_workers; i++) {
        const worker = new Worker("filter_worker.js");
        worker.await_message = () => {
            if (worker.message_listener) {
                worker.message_listener.reject("Job timed out");
            }
            return new Promise((resolve, reject) => {
                worker.message_listener = { resolve, reject };
            });
        };
        worker.onmessage = ({ data }) => {
            if (worker.message_listener) {
                worker.message_listener.resolve(data);
                worker.message_listener = null;
            }
        };
        const chunk_start = i * chunk_size;
        const chunk_end = Math.min(game_data.pokemon.length, (i + 1) * chunk_size);
        worker.postMessage({
            topic: "init", sprites_metadata, game_data: {
                types: game_data.types,
                evolutions: game_data.evolutions,
                pokemon: game_data.pokemon.slice(chunk_start, chunk_end),
                moves: game_data.moves,
            },
            poke_name_map
        });
        workers.push(worker);
    }

    return workers;
}

async function sort_and_filter(pokemon, workers, filter_state) {
    const worker_results = await Promise.all(workers.map((w, i) => {
        const promise = w.await_message();
        w.postMessage({ topic: "filter", filter_state });
        return promise;
    }));

    let total_length = 0;
    for (const arr of worker_results) {
        total_length += arr.length;
    }

    const filtered_pokemon = new Uint32Array(total_length);
    let i = 0;
    for (const arr of worker_results) {
        filtered_pokemon.set(arr, i);
        i += arr.length;
    }

    // Precompute selected stat keys
    const sum_stat_keys = [];
    let min_stat_keys_includes_max_atk_stat = false;
    for (const key of Object.keys(filter_state.stat_sorting_options)) {
        if (filter_state.stat_sorting_options[key]) {
            const k = key.toLowerCase();
            if (k === "max(atk, spa)") {
                min_stat_keys_includes_max_atk_stat = true;
            } else {
                sum_stat_keys.push(k);
            }
        }
    }

    if (sum_stat_keys.length > 0 || min_stat_keys_includes_max_atk_stat) {
        // Sort by stat sum
        if (min_stat_keys_includes_max_atk_stat) {
            // This code is very hot so try to fast-track some conditions
            filtered_pokemon.sort((ai, bi) => {
                const a = pokemon[ai];
                const b = pokemon[bi];
                let sum_a = Math.max(a.atk, a.spa);
                let sum_b = Math.max(b.atk, b.spa);
                for (const key of sum_stat_keys) {
                    sum_a += a[key];
                    sum_b += b[key];
                }
                return sum_b - sum_a;
            });
        } else {
            filtered_pokemon.sort((ai, bi) => {
                const a = pokemon[ai];
                const b = pokemon[bi];
                let sum_a = 0;
                let sum_b = 0;
                for (const key of sum_stat_keys) {
                    sum_a += a[key];
                    sum_b += b[key];
                }
                return sum_b - sum_a;
            });
        }
    }

    return filtered_pokemon;
}

function is_triple_fusion(poke) {
    return poke.head_id >= TRIPLE_FUSION_ID_START;
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
    for (const poke of unfused_pokemon) {
        if (!is_triple_fusion(poke)) {
            const copy = Object.assign({}, poke);
            copy.is_fused = true;
            game_data.pokemon.push(copy);
        }
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

    let nb_pokemon = 0;
    for (const key of Object.keys(game_data.pokemon_names)) {
        if (parseInt(key) < TRIPLE_FUSION_ID_START) {
            nb_pokemon += 1;
        }
    }
    game_data.nb_pokemon = nb_pokemon;

    // Split triple types into single types
    const triple_type_map = {};
    for (const tp of Object.values(game_data.types)) {
        if (tp.name.includes("/")) {
            const parts = tp.name.split("/");
            const ids = parts.map(p => Object.values(game_data.types).find(t => t.name === p).id);
            triple_type_map[tp.id] = ids;
        }
    }

    for (let i = 0; i < game_data.pokemon.length; i++) {
        const poke = game_data.pokemon[i];
        poke.index = i;

        if (poke.head_id in TRIPLE_FUSIONS_HARDCODED_DATA) {
            poke.triple_fusion_ids = TRIPLE_FUSIONS_HARDCODED_DATA[poke.head_id];
            // Put a default sprite entry for triple fusions
            sprites_metadata.sprites[poke.head_id] = {
                base_name: poke.triple_fusion_ids.join("."),
                has_main: true,
                is_fused: true,
                alt_count: 0,
                main_artists: [],
                alt_artists: {}
            };
        }

        // Put types in an array
        if (poke.type1 === poke.type2) {
            if (poke.type1 in triple_type_map) {
                poke.types = triple_type_map[poke.type1];
            } else {
                poke.types = [poke.type1];
            }
        } else {
            if (poke.type1 in triple_type_map && poke.type2 in triple_type_map) {
                poke.types = triple_type_map[poke.type1].concat(triple_type_map[poke.type2]);
            } else if (poke.type1 in triple_type_map) {
                if (isNaN(poke.type2)) {
                    poke.types = triple_type_map[poke.type1];
                } else {
                    poke.types = triple_type_map[poke.type1].concat([poke.type2]);
                }
            } else if (poke.type2 in triple_type_map) {
                poke.types = [poke.type1].concat(triple_type_map[poke.type2]);
            } else {
                poke.types = [poke.type1, poke.type2];
            }
        }
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
    const filter_workers = [];
    download_files().then(files => {
        Object.assign(game_data, files.game_data);
        Object.assign(sprites_metadata, files.sprites_metadata);

        const workers = init_filter_workers(navigator.hardwareConcurrency, game_data, sprites_metadata);
        for (const worker of workers) {
            filter_workers.push(worker);
        }

        is_loading = false;

        apply_sorting_and_filtering().then(() => m.redraw());
    });

    const sorted_pokemon = [];
    const filter_state = default_filter_state();

    const apply_sorting_and_filtering = async () => {
        if (is_loading) {
            return;
        }

        let result;
        try {
            result = await sort_and_filter(game_data.pokemon, filter_workers, filter_state);
        } catch (err) {
            if (err === "Job timed out") {
                return;
            }
            throw err;
        }
        // Replace all array elements with new result
        sorted_pokemon.length = result.length;
        for (let i = 0; i < result.length; i++) {
            sorted_pokemon[i] = result[i];
        }
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
        onupdate() {
            const old_state = inf_scroll_cache_hash;
            reset_scroll_cache();
            if (old_state !== inf_scroll_cache_hash) {
                apply_sorting_and_filtering().then(() => m.redraw());
            }
        },
        view() {
            return is_loading ? m("div.loading", "Loading...") : [
                m("div", m(ConfirmingButton, {
                    label: "🗑️ Clear all filters",
                    confirm_label: "Confirm?",
                    onconfirm: e => {
                        Object.assign(filter_state, default_filter_state());
                    }
                })),
                // Controls
                m("div.controls",
                    m(StatFilter, { filter_state }),
                    m(NameFilter, { filter_state, game_data, unfused_names: game_data.pokemon_names }),
                    m(TypeFilter, { filter_state, game_data }),
                    m(AbilityFilter, { filter_state, game_data, sorted_pokemon }),
                    m(ResistanceFilter, { filter_state }),
                    m(EvolutionFilter, { filter_state, game_data }),
                    m(SpriteFilter, { filter_state }),
                    m(MoveFilter, { game_data, filter_state })),
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
                            return data.map(poke_idx => {
                                const poke = game_data.pokemon[poke_idx];
                                return m(PokeCard, {
                                    key: poke_key(poke),
                                    poke,
                                    filter_state,
                                    game_data,
                                    sprites_metadata
                                });
                            });
                        }
                    }))
            ];
        }
    });

    // Don't feel like making UI for this so just gonna expose this function
    window.load_names_from_save_file = async function(url, into_blacklist = false) {
        const downloaded_bytes = await (await fetch(url)).arrayBuffer();
        const save_data = marshal.load(downloaded_bytes, {
            hashSymbolKeysToString: true,
            ivarToString: ""
        });
        const ids = [];
        for (const poke of save_data.player.party) {
            if (!poke) continue;
            if (poke.species_data.id_number > game_data.nb_pokemon) {
                ids.push(poke.species_data.head_pokemon.id_number);
                ids.push(poke.species_data.body_pokemon.id_number);
            } else {
                ids.push(poke.species_data.id_number);
            }
        }
        for (const box of save_data.storage_system.boxes) {
            for (const poke of box.pokemon) {
                if (!poke) continue;
                if (poke.species_data.id_number > game_data.nb_pokemon) {
                    ids.push(poke.species_data.head_pokemon.id_number);
                    ids.push(poke.species_data.body_pokemon.id_number);
                } else {
                    ids.push(poke.species_data.id_number);
                }
            }
        }
        const add_list = into_blacklist ? filter_state.name_blacklist : filter_state.name_whitelist;
        const remove_list = into_blacklist ? filter_state.name_whitelist : filter_state.name_blacklist;
        add_name_filter(game_data, game_data.pokemon_names, ids, add_list, remove_list, true, false);
        apply_sorting_and_filtering().then(() => m.redraw());
    }

    window.generate_random_party = function(party_size = 6) {
        let pokes = [];
        if (sorted_pokemon.length <= party_size) {
            pokes = sorted_pokemon;
        } else {
            const indices = new Set();
            for (let i = sorted_pokemon.length - party_size; i < sorted_pokemon.length; i++) {
                const t = Math.floor(Math.random() * (i + 1));
                if (indices.has(t)) {
                    indices.add(i);
                } else {
                    indices.add(t);
                }
            }
            pokes = Array.from(indices).map(i => game_data.pokemon[sorted_pokemon[i]]);
        }
        for (const poke of pokes) {
            window.open(details_url(poke));
        }
    }
}

main();
