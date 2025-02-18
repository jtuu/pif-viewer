export function poke_key(poke) {
    if (!Object.hasOwn(poke, "mithril_key")) {
        if (poke.is_fused) {
            poke.mithril_key = `${poke.head_id}.${poke.body_id}`;
        } else {
            poke.mithril_key = `${poke.id}`;
        }
    }
    return poke.mithril_key;
}

function sprite_url(poke, alt = "default") {
    const alt_char = alt === "default" ? "" : alt;
    return `split_sprites/${poke.head_id}/${poke.head_id}.${poke.body_id}${alt_char}.png`;
}

function details_url(poke) {
    return `https://infinitefusiondex.com/details/${poke_key(poke)}`;
}

function poke_name(poke) {
    if (poke.is_fused) {
        return poke.head_name + "/" + poke.body_name;
    }
    return poke.name;
}

export const PokeCard = {
    view(vnode) {
        const poke = vnode.attrs.poke;

        const selected_alt = Object.hasOwn(poke, "selected_alt") ? poke.selected_alt : 0;
        const alt_count = poke.alt_count;
        const alt_sprite_names = new Array(alt_count);
        alt_sprite_names[0] = "default";
        for (let i = 0; i < alt_count - 1; i++) {
            alt_sprite_names[i + 1] = String.fromCharCode("a".charCodeAt(0) + i);
        }

        const poke_types = [poke.type1];
        if (poke.type1 !== poke.type2) {
            poke_types.push(poke.type2);
        }

        return m("div.poke-card",
            m("div.poke-name", poke_name(poke)),
            m("div.poke-type", poke_types.map(type => m("span", { className: "typelabel type-" + type.toLowerCase() }, type))),
            m("div.alt-sprite-select",
                "Sprite: ",
                alt_count > 1
                    ? [m("button", {
                        onclick: e => {
                            if (selected_alt > 0) {
                                poke.selected_alt = selected_alt - 1;
                            } else {
                                poke.selected_alt = alt_sprite_names.length - 1;
                            }
                        }
                    }, "←"),
                    m("button", {
                        onclick: e => {
                            if (selected_alt < alt_sprite_names.length - 1) {
                                poke.selected_alt = selected_alt + 1;
                            } else {
                                poke.selected_alt = 0;
                            }
                        }
                    }, "→")]
                    : null,
                m("span", alt_sprite_names[selected_alt])),
            m("div.poke-img",
                m("a.details-link", {
                    target: "_blank",
                    href: details_url(poke)
                }, m("img.poke-img", {
                    src: sprite_url(poke, alt_sprite_names[selected_alt]),
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
