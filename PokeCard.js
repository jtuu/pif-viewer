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

export const PokeCard = {
    view(vnode) {
        const { poke, game_data, sprites_metadata } = vnode.attrs;

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

        return m("div.poke-card",
            m("div.poke-name", poke_name),
            m("div.poke-type", poke_type_names.map(type => m("span", { className: "typelabel type-" + type.toLowerCase() }, type))),
            m("div.alt-sprite-select",
                "Sprite: ",
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
            m("div.poke-img",
                m("a.details-link", {
                    target: "_blank",
                    href: details_url(poke)
                }, m("img.poke-img", {
                    src: selected_sprite_idx === 0 && !sprites_info.has_main
                        ? "autogen_placeholder.png"
                        : sprite_url(poke, sprite_names[selected_sprite_idx]),
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
