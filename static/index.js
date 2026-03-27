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
import { cancel_all_jobs, init_filter_workers } from "./worker_interface.js";
import { apply_filter, default_filter_state, load_state_from_local_storage, save_state_to_local_storage } from "./filter_state.js";
import { InfiniteScroll } from "./InfiniteScroll.js"
import { debounce } from "./debounce.js";

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

const App = (() => {
    const filter_state = default_filter_state();
    return {
        gallery_fragment_size: 0,
        is_loading: true,
        gallery_has_more_pages: true,
        items_in_current_gallery_pages: [],
        filtered_and_sorted_pokemon_indices: [],
        filter_state: filter_state,
        filter_state_hash: load_state_from_local_storage(filter_state),
        game_data: {
            abilities: {},
            pokemon_names: {},
            types: {},
            pokemon: []
        },
        sprites_metadata: {},
        filter_workers: [],
        changed_sprites: {},

        reset_filter_state() {
            Object.assign(this.filter_state, default_filter_state());
        },
        async apply_sorting_and_filtering() {
            if (this.is_loading) {
                return;
            }
            cancel_all_jobs(this.filter_workers);
            const result = await apply_filter(this.filter_state, this.filter_workers, this.game_data);
            this.set_gallery(result);
        },
        set_gallery(pokemon_indices) {
            this.items_in_current_gallery_pages = [];
            this.filtered_and_sorted_pokemon_indices = pokemon_indices;
            this.load_next_page();
        },
        load_next_page() {
            const slice_start = this.items_in_current_gallery_pages.length;
            const slice_end = slice_start + this.gallery_fragment_size;
            const page_items = this.filtered_and_sorted_pokemon_indices.slice(slice_start, slice_end);
            if (page_items.length > 0) {
                this.items_in_current_gallery_pages.push(...page_items);
            }
            this.gallery_has_more_pages = this.items_in_current_gallery_pages.length < this.filtered_and_sorted_pokemon_indices.length;
            m.redraw();
        },
    };
})();

async function main() {
    // Set number of items to load when scrolling based on window size
    const on_window_resize = () => {
        const card_width = 192 + 10 * 2 + 10 * 2;
        const card_height = 241;
        const cards_per_row = Math.floor(window.innerWidth / card_width);
        App.gallery_fragment_size = cards_per_row * Math.floor(window.innerHeight / card_height);
        m.redraw();
    };
    on_window_resize(); // Call once at start
    window.onresize = debounce(100, on_window_resize);

    download_files().then(files => {
        Object.assign(App.game_data, files.game_data);
        Object.assign(App.sprites_metadata, files.sprites_metadata);

        const workers = init_filter_workers(navigator.hardwareConcurrency, App.game_data, App.sprites_metadata);
        for (const worker of workers) {
            App.filter_workers.push(worker);
        }

        App.is_loading = false;

        App.apply_sorting_and_filtering().then(() => m.redraw());
    });

    const debounced_filter_and_redraw = debounce(100, () => App.apply_sorting_and_filtering().then(() => m.redraw()));

    m.mount(document.body, {
        oninit() {
            App.load_next_page();
        },
        onupdate() {
            const old_state = App.filter_state_hash;
            App.filter_state_hash = save_state_to_local_storage(App.filter_state);
            if (old_state !== App.filter_state_hash) {
                debounced_filter_and_redraw();
            }
        },
        view() {
            return App.is_loading ? m("div.loading", "Loading...") : [
                m("div", m(ConfirmingButton, {
                    label: "🗑️ Clear all filters",
                    confirm_label: "Confirm?",
                    onconfirm: e => {
                        App.reset_filter_state();
                    }
                })),
                // Controls
                m("div.controls",
                    m(StatFilter,
                        {
                            filter_state: App.filter_state
                        }),
                    m(NameFilter,
                        {
                            filter_state: App.filter_state,
                            game_data: App.game_data,
                            unfused_names: App.game_data.pokemon_names
                        }),
                    m(TypeFilter,
                        {
                            filter_state: App.filter_state,
                            game_data: App.game_data
                        }),
                    m(AbilityFilter,
                        {
                            filter_state: App.filter_state,
                            game_data: App.game_data,
                            sorted_pokemon: App.filtered_and_sorted_pokemon_indices
                        }),
                    m(ResistanceFilter,
                        {
                            filter_state: App.filter_state
                        }),
                    m(EvolutionFilter,
                        {
                            filter_state: App.filter_state,
                            game_data: App.game_data
                        }),
                    m(SpriteFilter,
                        {
                            filter_state: App.filter_state
                        }),
                    m(MoveFilter,
                        {
                            filter_state: App.filter_state,
                            game_data: App.game_data
                        }),
                    App.filter_state.debug_filter_url
                        ? m(DebugFilter, {
                            filter_state: App.filter_state,
                            game_data: App.game_data,
                            sprites_metadata: App.sprites_metadata,
                            changed_sprites: App.changed_sprites,
                            filter_workers: App.filter_workers,
                            apply_sorting_and_filtering: App.apply_sorting_and_filtering.bind(App)
                        })
                        : null),
                // Gallery
                m("div.poke-gallery", [
                    App.items_in_current_gallery_pages.map(poke_idx => {
                        const poke = App.game_data.pokemon[poke_idx];
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
                            head_name: App.game_data.pokemon_names[poke.head_id],
                            body_name: App.game_data.pokemon_names[poke.body_id],
                            poke_type_names: poke.types.map(id => App.game_data.types[id].name),
                            pokemon_names: App.game_data.pokemon_names,
                            sprites_metadata: App.sprites_metadata,
                            changed_sprites: App.changed_sprites
                        });
                    }),
                    App.gallery_has_more_pages ? m(InfiniteScroll, {
                        has_more: App.gallery_has_more_pages,
                        load_more: App.load_next_page.bind(App)
                    }) : null])
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
        const add_list = into_blacklist ? App.filter_state.name_blacklist : App.filter_state.name_whitelist;
        const remove_list = into_blacklist ? App.filter_state.name_whitelist : App.filter_state.name_blacklist;
        add_name_filter(App.game_data, App.game_data.pokemon_names, ids, add_list, remove_list, true, false);
        apply_sorting_and_filtering().then(() => m.redraw());
    }

    window.generate_random_party = function (party_size = 6) {
        let pokes = [];
        if (App.filtered_and_sorted_pokemon_indices.length <= party_size) {
            pokes = App.filtered_and_sorted_pokemon_indices;
        } else {
            const indices = new Set();
            for (let i = App.filtered_and_sorted_pokemon_indices.length - party_size; i < App.filtered_and_sorted_pokemon_indices.length; i++) {
                const t = Math.floor(Math.random() * (i + 1));
                if (indices.has(t)) {
                    indices.add(i);
                } else {
                    indices.add(t);
                }
            }
            pokes = Array.from(indices).map(i => App.game_data.pokemon[App.filtered_and_sorted_pokemon_indices[i]]);
        }
        for (const poke of pokes) {
            window.open(details_url(poke));
        }
    }

    window.enable_debug_filter = function (debug_url = "http://127.0.0.1:8080/search") {
        App.filter_state.debug_filter_url = debug_url;
        m.redraw();
    }
}

main();
