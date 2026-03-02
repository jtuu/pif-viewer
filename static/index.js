import { PokeCard, details_url } from "./PokeCard.js";
import { StatFilter } from "./StatFilter.js";
import { add_name_filter, NameFilter } from "./NameFilter.js";
import { TypeFilter } from "./TypeFilter.js";
import { AbilityFilter } from "./AbilityFilter.js";
import { ResistanceFilter } from "./ResistanceFilter.js";
import { EvolutionFilter } from "./EvolutionFilter.js";
import { ConfirmingButton } from "./ConfirmingButton.js";
import { SpriteFilter } from "./SpriteFilter.js";
import { MoveFilter } from "./MoveFilter.js";
import { hoenn_data } from "./hoenn_data.js";
import { DebugFilter } from "./DebugFilter.js";
import { TRIPLE_FUSION_ID_START, TRIPLE_FUSIONS_HARDCODED_DATA, generate_fusions } from "./fusion_utils.js"
import { init_filter_workers } from "./worker_interface.js";
import { apply_filter, default_filter_state, load_state_from_local_storage } from "./filter_state.js";

function preprocess_game_data(game_data, sprites_metadata) {
    // Add hoenn data
    for (const poke of game_data.pokemon) {
        poke.is_hoenn = false;
    }
    for (const poke of hoenn_data.pokemon) {
        poke.is_hoenn = true;
    }
    for (const key of Object.keys(hoenn_data.pokemon_names)) {
        game_data.pokemon_names[key] = hoenn_data.pokemon_names[key];
    }
    for (const key of Object.keys(hoenn_data.evolutions)) {
        game_data.evolutions[key] = hoenn_data.evolutions[key];
    }
    game_data.pokemon = game_data.pokemon.concat(hoenn_data.pokemon);
    game_data.unfused_pokemon = game_data.pokemon.slice();

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

    // Create move name->id lookup table
    game_data.moves_by_name = {};
    for (const id of Object.keys(game_data.moves)) {
        const move = game_data.moves[id];
        const key = move.name.toLowerCase();
        game_data.moves_by_name[key] = move.id;
    }

    // Create pokemon name->id lookup table
    game_data.pokemon_by_name = {};
    for (const id of Object.keys(game_data.pokemon_names)) {
        const name = game_data.pokemon_names[id].toLowerCase();
        game_data.pokemon_by_name[name] = parseInt(id);
    }

    return { game_data, sprites_metadata };
}

async function download_files() {
    const files = await Promise.all([
        fetch("sprites_metadata.json").then(res => res.json()),
        fetch("game_data.json").then(res => res.json())
    ]);

    const sprites_metadata = files[0];
    const game_data = files[1];

    return preprocess_game_data(game_data, sprites_metadata);
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
    const apply_sorting_and_filtering = async () => {
        if (is_loading) {
            return;
        }
        const result = await apply_filter(filter_state, filter_workers, game_data);
        // Replace all array elements with new result
        sorted_pokemon.length = result.length;
        for (let i = 0; i < result.length; i++) {
            sorted_pokemon[i] = result[i];
        }
    };

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

    // State storage
    let inf_scroll_cache_hash;
    const reset_scroll_cache = () => {
        const session_settings = filter_state.session_settings;
        filter_state.session_settings = {};
        const serialized_without_session = JSON.stringify(filter_state, (k, v) => {
            if (v instanceof Set) {
                return Array.from(v);
            }
            return v;
        });
        const serialized_session = JSON.stringify(session_settings);
        filter_state.session_settings = session_settings;
        // Don't save session settings to disk but include them in scroll cache
        inf_scroll_cache_hash = btoa(serialized_without_session + serialized_session);
        localStorage.filter_state = btoa(serialized_without_session);
    };

    load_state_from_local_storage(filter_state);
    apply_sorting_and_filtering();
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
                    m(MoveFilter, { game_data, filter_state }),
                    filter_state.debug_filter_url ? m(DebugFilter, { game_data, filter_state, sprites_metadata, filter_workers, apply_sorting_and_filtering, reset_scroll_cache }) : null),
                // Gallery
                m("div.poke-gallery",
                    m(InfinityScroll, {
                        pageRequestParam: inf_scroll_cache_hash,
                        preload: true,
                        pageCount: gallery_fragment_size,
                        loadingFooter: m("div", `Showing ${gallery_fragment_size * (latest_loaded_page + 1)}/${sorted_pokemon.length} Pokemon. Loading...`),
                        pageRequest: (page_num, resolve) => {
                            const slice_start = gallery_fragment_size * page_num;
                            const slice_end = gallery_fragment_size * (page_num + 1);
                            const page_items = sorted_pokemon.slice(slice_start, slice_end);
                            resolve(page_items);
                            latest_loaded_page = page_num;
                            m.redraw();
                        },
                        processPageData: data => {
                            return data.map(poke_idx => {
                                const poke = game_data.pokemon[poke_idx];
                                if (!Object.hasOwn(poke, "mithril_key")) {
                                    if (poke.is_fused) {
                                        poke.mithril_key = `${poke.head_id}.${poke.body_id}`;
                                    } else {
                                        poke.mithril_key = `${poke.head_id}`;
                                    }
                                }
                                return m(PokeCard, {
                                    key: poke.mithril_key,
                                    poke,
                                    head_name: game_data.pokemon_names[poke.head_id],
                                    body_name: game_data.pokemon_names[poke.body_id],
                                    poke_type_names: poke.types.map(id => game_data.types[id].name),
                                    pokemon_names: game_data.pokemon_names,
                                    sprites_metadata,
                                    changed_sprites: filter_state.session_settings.changed_sprites
                                });
                            }).filter(card => card);
                        }
                    }))
            ];
        }
    });

    // Don't feel like making UI for this so just gonna expose this function
    window.load_names_from_save_file = async function (url, into_blacklist = false) {
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

    window.generate_random_party = function (party_size = 6) {
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

    window.enable_debug_filter = function (debug_url = "http://127.0.0.1:8080/search") {
        filter_state.debug_filter_url = debug_url;
        m.redraw();
    }
}

main();
