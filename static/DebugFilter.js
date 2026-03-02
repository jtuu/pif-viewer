import { fuse_pokemon } from "./fusion_utils.js";
import { get_index_of_alt_name } from "./PokeCard.js";
import { init_filter_workers } from "./worker_interface.js";

export const DebugFilter = {
    send_request(game_data, filter_state, sprites_metadata, filter_workers, apply_sorting_and_filtering, reset_scroll_cache) {
        filter_state.debug_query = document.getElementById("debug_query").value;
        filter_state.cache_buster = Date.now();
        return m.request({
            url: filter_state.debug_filter_url,
            params: {
                q: filter_state.debug_query,
            },
            background: true
        }).then(response => {
            this.process_response(game_data, filter_state, filter_workers, sprites_metadata, apply_sorting_and_filtering, reset_scroll_cache, response);
        });
    },
    process_response(game_data, filter_state, filter_workers, sprites_metadata, apply_sorting_and_filtering, reset_scroll_cache, response) {
        const unfused_pat = /(\d+)([a-z]*)\.png/;
        const fused_pat = /(\d+)\.(\d+)([a-z]*)\.png/;
        const deduper = new Map();
        game_data.pokemon = [];
        for (const img of response) {
            const match = img.match(fused_pat);
            let poke;
            let key;
            if (match) {
                const head_id = parseInt(match[1]);
                const body_id = parseInt(match[2]);
                const alt = match[3];
                key = `${head_id}.${body_id}${alt}`;
                const head = game_data.unfused_pokemon.find(poke => poke.head_id === head_id);
                const body = game_data.unfused_pokemon.find(poke => poke.head_id === body_id);
                poke = fuse_pokemon(game_data.types, head, body);
                filter_state.session_settings.changed_sprites[key] = alt ? get_index_of_alt_name(alt) : 0;
            } else {
                const match = img.match(unfused_pat);
                const head_id = parseInt(match[1]);
                const alt = match[2];
                key = `${head_id}${alt}`;
                poke = game_data.unfused_pokemon.find(poke => poke.head_id === head_id);
                filter_state.session_settings.changed_sprites[key] = alt ? get_index_of_alt_name(alt) : 0;
            }
            let dupe_count = 1;
            if (deduper.has(key)) {
                dupe_count = deduper.get(key) + 1;
                key += `#${dupe_count}`;
            }
            deduper.set(key, dupe_count);
            poke.mithril_key = key;
            if (poke.type1 === poke.type2) {
                poke.types = [poke.type1];
            } else {
                poke.types = [poke.type1, poke.type2];
            }
            poke.index = game_data.pokemon.length;
            game_data.pokemon.push(poke);
        }
        game_data.nb_pokemon = game_data.pokemon.length;

        for (const worker of filter_workers) {
            worker.terminate();
        }
        filter_workers.length = 0;
        const workers = init_filter_workers(1, game_data, sprites_metadata);
        for (const worker of workers) {
            filter_workers.push(worker);
        }

        return apply_sorting_and_filtering().then(() => {
            reset_scroll_cache();
            m.redraw();
        });
    },
    view(vnode) {
        const { game_data, filter_state, sprites_metadata, filter_workers, apply_sorting_and_filtering, reset_scroll_cache } = vnode.attrs;
        return m("div",
            m("input#debug_query", {
                type: "text",
                value: filter_state.debug_query,
                onchange: e => {
                    e.redraw = false;
                    this.send_request(game_data, filter_state, sprites_metadata, filter_workers, apply_sorting_and_filtering, reset_scroll_cache);
                },
                onkeyup: e => {
                    e.redraw = false;
                    if (e.key === "Enter") {
                        this.send_request(game_data, filter_state, sprites_metadata, filter_workers, apply_sorting_and_filtering, reset_scroll_cache);
                    }
                }
            }));
    }
}
