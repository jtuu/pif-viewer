export const standard_types = [
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

export const TypeFilter = {
    type_name_id_map: {},
    type_name_id_map_computed: false,
    view(vnode) {
        const { filter_state, game_data } = vnode.attrs;
        if (!vnode.state.type_name_id_map_computed) {
            for (const tp of Object.values(game_data.types)) {
                vnode.state.type_name_id_map[tp.name.toUpperCase()] = tp.id;
            }
            vnode.state.type_name_id_map_computed = true;
        }
        return m("div.type-filter", m("strong", "Filter by type"),
            m("div",
                m("label", m("input",
                    {
                        type: "radio",
                        name: "type-filter-condition",
                        value: "any",
                        checked: !filter_state.type_filter_enabled,
                        onchange: e => {
                            filter_state.type_filter_enabled = !e.target.checked;
                        }
                    }), "Match any"),
                m("label", m("input",
                    {
                        type: "radio",
                        name: "type-filter-condition",
                        value: "some",
                        checked: filter_state.type_filter_enabled && !filter_state.type_filter_condition,
                        onchange: e => {
                            filter_state.type_filter_condition = !e.target.checked;
                            filter_state.type_filter_enabled = true;
                        }
                    }), "Match some"),
                m("label", m("input",
                    {
                        type: "radio",
                        name: "type-filter-condition",
                        value: "every",
                        checked: filter_state.type_filter_enabled && filter_state.type_filter_condition,
                        onchange: e => {
                            filter_state.type_filter_condition = e.target.checked;
                            filter_state.type_filter_enabled = true;
                        }
                    }, "Every"), "Match every",)),
            m("div.type-filter-list.type-label-list",
                standard_types.map(type_name => {
                    const type_id = vnode.state.type_name_id_map[type_name];
                    return m("label", { key: type_name, className: "typelabel type-" + type_name.toLowerCase() },
                        type_name, m("input", {
                            type: "checkbox", checked: filter_state.type_filter.has(type_id),
                            onchange: e => {
                                if (e.target.checked) {
                                    filter_state.type_filter.add(type_id);
                                } else {
                                    filter_state.type_filter.delete(type_id);
                                }
                            }
                        }));
                })),
            m("div",
                m("button", {
                    onclick: () => {
                        standard_types.forEach(type_name => filter_state.type_filter.add(vnode.state.type_name_id_map[type_name]));
                    }
                }, "Enable all"),
                m("button", {
                    onclick: () => {
                        filter_state.type_filter.clear();
                    }
                }, "Disable all")));
    }
};
