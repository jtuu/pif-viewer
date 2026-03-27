export class JobCancellationException extends Error {}

export function init_filter_workers(num_workers, game_data, sprites_metadata) {
    const chunk_size = Math.floor(game_data.pokemon.length / num_workers);
    const workers = [];

    const poke_name_map = {};
    for (let i = 0; i < game_data.nb_pokemon; i++) {
        const poke = game_data.pokemon[i];
        poke_name_map[game_data.pokemon_names[poke.head_id].toUpperCase()] = poke.head_id;
    }

    for (let i = 0; i < num_workers; i++) {
        const worker = new Worker("filter_worker.js");
        worker.is_working = false;
        worker.await_message = () => {
            if (worker.message_listener) {
                worker.message_listener.reject(new JobCancellationException());
                worker.message_listener = null;
            }
            return new Promise((resolve, reject) => {
                worker.message_listener = { resolve, reject };
            });
        };
        worker.start_filter_job = filter_state => {
            worker.is_working = true;
            worker.postMessage({ topic: "filter", filter_state });
        };
        worker.cancel_job = () => {
            if (worker.is_working) {
                worker.is_working = false;
                worker.postMessage({ topic: "cancel" });
            }
            if (worker.message_listener) {
                worker.message_listener.reject(new JobCancellationException());
                worker.message_listener = null;
            }
        };
        worker.onmessage = ({ data }) => {
            worker.is_working = false;
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

export async function sort_and_filter(pokemon, workers, filter_state) {
    const worker_results = await Promise.all(workers.map((w, i) => {
        const promise = w.await_message();
        w.start_filter_job(filter_state);
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

export function cancel_all_jobs(workers) {
    for (const worker of workers) {
        worker.cancel_job();
    }
}
