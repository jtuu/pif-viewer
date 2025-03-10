export function poke_key(poke) {
    if (!Object.hasOwn(poke, "mithril_key")) {
        if (poke.is_fused) {
            poke.mithril_key = `${poke.head_id}.${poke.body_id}`;
        } else {
            poke.mithril_key = `${poke.head_id}`;
        }
    }
    return poke.mithril_key;
}

function sprite_url(poke, alt = "main") {
    const alt_char = alt === "main" ? "" : alt;
    if (poke.is_fused) {
        return `split_sprites/${poke.head_id}/${poke.head_id}.${poke.body_id}${alt_char}.png`;
    }
    return `split_sprites/${poke.head_id}/${poke.head_id}${alt_char}.png`;
}

function details_url(poke) {
    return `https://infinitefusiondex.com/details/${poke_key(poke)}`;
}

const all_alt_names = (() => {
    // Pre-generate a large amount of alt names that will hopefully be enough
    const alt_names = [];
    const full_len = "z".charCodeAt(0) - "a".charCodeAt(0) + 1;
    for (let i = 0; i < 1000; i++) {
        const full_letter_count = i / full_len;
        const last_remainder = i % full_len;
        const alt_name = "a".repeat(full_letter_count) +
            String.fromCharCode(last_remainder + "a".charCodeAt(0));
        alt_names.push(alt_name);
    }
    return alt_names;
})();

const SHINY_COLOR_OFFSETS = {
    1: -30,
    2: -85,
    3: -50,
    4: 40,
    5: 60,
    6: 130,
    7: 25,
    8: 15,
    9: 50,
    10: -50,
    11: -80,
    12: 95,
    129: 36,
    130: 150,
    332: 140,
    342: 50,
    388: 160,
    389: 136,
};

// Somehow the pokemon can be considered shiny even if both is_head_shiny and is_body_shiny are false
function calculate_shiny_hue_offset(nb_pokemon, is_fused, head_id, body_id, is_head_shiny, is_body_shiny) {
    if (!is_fused && SHINY_COLOR_OFFSETS[head_id] ) {
        return SHINY_COLOR_OFFSETS[head_id];
    }

    if (!is_fused) {
        is_head_shiny = false;
        is_body_shiny = false;
    }

    if (is_body_shiny && is_head_shiny && SHINY_COLOR_OFFSETS[body_id] && SHINY_COLOR_OFFSETS[head_id]) {
        return SHINY_COLOR_OFFSETS[body_id] + SHINY_COLOR_OFFSETS[head_id];
    } else if (is_head_shiny && SHINY_COLOR_OFFSETS[head_id]) {
        return SHINY_COLOR_OFFSETS[head_id];
    } else if (is_body_shiny && SHINY_COLOR_OFFSETS[body_id]) {
        return SHINY_COLOR_OFFSETS[body_id];
    }

    const min_diff = 40;
    const fused_id = is_fused
        ? body_id * nb_pokemon + head_id
        : head_id;
    const id_diff = Math.abs(body_id - head_id);
    let dex_offset = fused_id;
    if (is_body_shiny && is_head_shiny) {
        dex_offset = fused_id;
    } else if (is_head_shiny) {
        dex_offset = head_id;
    } else if (is_body_shiny) {
        const min_dex_dif = 20;
        dex_offset = id_diff > min_dex_dif
            ? body_id
            : body_id + min_diff;
    }
    let offset = dex_offset + 75;
    if (offset > nb_pokemon) {
        offset /= 360;
    }
    if (offset < min_diff) {
        offset = min_diff;
    }
    if (Math.abs(360 - offset) < min_diff) {
        offset = min_diff;
    }
    return Math.floor(offset);
}

function rgb_to_hsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function hsl_to_rgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue_to_rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue_to_rgb(p, q, h + 1 / 3);
        g = hue_to_rgb(p, q, h);
        b = hue_to_rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rotate_hue(r, g, b, angle) {
    const [h, s, l] = rgb_to_hsl(r, g, b);
    const new_h = (h * 360 + angle) % 360 / 360;
    const [new_r, new_g, new_b] = hsl_to_rgb(new_h, s, l);
    return [new_r, new_g, new_b];
}

const shiny_sprite_cache = [];

function get_cached_shiny_sprite(poke, is_head_shiny, is_body_shiny) {
    const entry = shiny_sprite_cache.find(entry => {
        return entry.head_id === poke.head_id &&
            entry.body_id === poke.body_id &&
            entry.is_head_shiny === is_head_shiny &&
            entry.is_body_shiny === is_body_shiny &&
            entry.is_fused === poke.is_fused;
    });
    if (entry) {
        return entry.canvas;
    }
}

function cache_shiny_sprite(canvas, poke, is_head_shiny, is_body_shiny) {
    const limit = 500;
    if (shiny_sprite_cache.length > limit) {
        shiny_sprite_cache.shift();
    }
    shiny_sprite_cache.push({
        canvas,
        head_id: poke.head_id,
        body_id: poke.body_id,
        is_head_shiny,
        is_body_shiny,
        is_fused: poke.is_fused,
    });
}

function shiny_sprite(nb_pokemon, poke, url, is_head_shiny, is_body_shiny) {
    function generate_and_attach_canvas_to_vnode(vnode) {
        const cached = get_cached_shiny_sprite(poke, is_head_shiny, is_body_shiny);
        if (cached) {
            vnode.dom.replaceChildren(cached);
            return;
        }
        const hue_offset = calculate_shiny_hue_offset(nb_pokemon, poke.is_fused, poke.head_id, poke.body_id, is_head_shiny, is_body_shiny);
        const canvas = document.createElement("canvas");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.className = "poke-img";
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            const pixels = ctx.getImageData(0, 0, img.width, img.height);
            for (let i = 0; i < pixels.data.length; i += 4) {
                const rotated = rotate_hue(pixels.data[i + 0], pixels.data[i + 1], pixels.data[i + 2], hue_offset);
                pixels.data[i + 0] = rotated[0];
                pixels.data[i + 1] = rotated[1];
                pixels.data[i + 2] = rotated[2];
            }
            ctx.putImageData(pixels, 0, 0);
            cache_shiny_sprite(canvas, poke, is_head_shiny, is_body_shiny);
            vnode.dom.replaceChildren(canvas);
        };
        img.src = url;
    }

    return m("div.poke-img", {
        oncreate(vnode) {
            generate_and_attach_canvas_to_vnode(vnode);
        },
        onupdate(vnode) {
            generate_and_attach_canvas_to_vnode(vnode);
        }
    });
}

export const PokeCard = {
    view(vnode) {
        const { poke, game_data, sprites_metadata, filter_state } = vnode.attrs;

        const key = poke_key(poke);
        const sprites_info = sprites_metadata.sprites[key] || {
            base_name: String,
            is_fused: poke.is_fused,
            has_main: false,
            alt_count: 0,
            main_artists: [],
            // From alt name to vec of artists
            alt_artists: []
        };
        const selected_sprite_idx = Object.hasOwn(poke, "selected_sprite_idx") ? poke.selected_sprite_idx : 0;
        // Always add main sprite even if it doesn't exist
        const sprite_count = sprites_info.alt_count + 1;
        const sprite_names = new Array(sprite_count);
        sprite_names[0] = "main";
        for (let i = 0; i < sprites_info.alt_count; i++) {
            sprite_names[i + 1] = all_alt_names[i];
        }

        const poke_types = [poke.type1];
        if (poke.type1 !== poke.type2) {
            poke_types.push(poke.type2);
        }
        const poke_type_names = poke_types.map(id => game_data.types[id].name);

        const head_name = game_data.pokemon_names[poke.head_id];
        const body_name = game_data.pokemon_names[poke.body_id];

        const poke_name = poke.is_fused
            ? head_name + "/" + body_name
            : head_name;

        const artist_ids = selected_sprite_idx === 0
            ? sprites_info.main_artists
            : sprites_info.alt_artists[all_alt_names[selected_sprite_idx - 1]];
        let artist_names = m("span.unknown-artist", "Unknown artist");
        if (artist_ids.length > 0) {
            const names = artist_ids.map(id => sprites_metadata.artists[id]).join(" & ");
            artist_names = m("span", { title: names }, artist_ids.length > 1 ? "Artists: " : "Artist: ", names);
        }

        const is_shiny = filter_state.display_shiny_sprites;
        const display_autogen_placeholder = selected_sprite_idx === 0 && !sprites_info.has_main;
        const url = display_autogen_placeholder
            ? "autogen_placeholder.png"
            : sprite_url(poke, sprite_names[selected_sprite_idx]);

        return m("div.poke-card",
            m("div.poke-name", poke_name),
            m("div.poke-type", poke_type_names.map(type => m("span", { className: "typelabel type-" + type.toLowerCase() }, type))),
            m("div.alt-sprite-select",
                m("div", "Sprite: ",
                    // Only show sprite switching controls if there's more than one sprite
                    sprite_count > 1
                        ? [m("button", {
                            onclick: e => {
                                if (selected_sprite_idx > 0) {
                                    poke.selected_sprite_idx = selected_sprite_idx - 1;
                                } else {
                                    poke.selected_sprite_idx = sprite_names.length - 1;
                                }
                            }
                        }, "←"),
                        m("button", {
                            onclick: e => {
                                if (selected_sprite_idx < sprite_names.length - 1) {
                                    poke.selected_sprite_idx = selected_sprite_idx + 1;
                                } else {
                                    poke.selected_sprite_idx = 0;
                                }
                            }
                        }, "→")]
                        : null,
                    m("span", sprite_names[selected_sprite_idx])),
                m("div.artist-names", artist_names)),
            m("div.poke-img",
                m("a.details-link", {
                    target: "_blank",
                    href: details_url(poke)
                },
                    is_shiny && !display_autogen_placeholder
                        ? shiny_sprite(game_data.nb_pokemon, poke, url, filter_state.is_head_shiny, filter_state.is_body_shiny)
                        : m("img.poke-img", {
                            src: url,
                            loading: "lazy"
                        }))),
            m("div.poke-stats", [
                m("span.poke-stat", `HP: ${poke.hp}`),
                m("span.poke-stat", `ATK: ${poke.atk}`),
                m("span.poke-stat", `SPA: ${poke.spa}`),
                m("span.poke-stat", `DEF: ${poke.def}`),
                m("span.poke-stat", `SPD: ${poke.spd}`),
                m("span.poke-stat", `SPE: ${poke.spe}`),
                m("span.poke-stat", `BST: ${poke.bst}`),
            ])
        );
    }
};
