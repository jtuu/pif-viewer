export const EvolutionFilter = {
    view(vnode) {
        const { filter_state, game_data } = vnode.attrs;
        return m("div.evolution-filter",
            m("div",
                m("div",
                    m("span", m("strong", "Evolution filters"))),
                m("div",
                    m("label", m("input", {
                        type: "radio",
                        name: "evolution-filters-condition",
                        value: "some",
                        checked: !filter_state.evolution_filters_condition,
                        onchange: e => {
                            filter_state.evolution_filters_condition = !e.target.checked;
                        }
                    }), "Match any filter"),
                    m("label", m("input", {
                        type: "radio",
                        name: "evolution-filters-condition",
                        value: "every",
                        checked: filter_state.evolution_filters_condition,
                        onchange: e => {
                            filter_state.evolution_filters_condition = e.target.checked;
                        }
                    }), "Match every filter")),
                m("fieldset",
                    m("legend",
                        m("input", {
                            type: "checkbox",
                            checked: filter_state.evolution_level_range_filter_enabled,
                            onchange: e => {
                                filter_state.evolution_level_range_filter_enabled = e.target.checked;
                            }
                        }),
                        m("strong", "Evolution level range")),
                    m("div",
                        m("label",
                            m("input", {
                                type: "radio",
                                name: "evolution-level-range-condition",
                                disabled: !filter_state.evolution_level_range_filter_enabled,
                                value: "either",
                                checked: !filter_state.evolution_level_range_filter_condition,
                                onchange: e => {
                                    filter_state.evolution_level_range_filter_condition = !e.target.checked;
                                }
                            }), "Head OR body"),
                        m("label",
                            m("input", {
                                type: "radio",
                                name: "evolution-level-range-condition",
                                disabled: !filter_state.evolution_level_range_filter_enabled,
                                value: "both",
                                checked: filter_state.evolution_level_range_filter_condition,
                                onchange: e => {
                                    filter_state.evolution_level_range_filter_condition = e.target.checked;
                                }
                            }), "Head AND body")),
                    m("div.evolution-level-range-labels",
                        m("span", "Min " + filter_state.evolution_level_range_filter_min),
                        m("span", filter_state.evolution_level_range_filter_max.toString() + " Max")),
                    m("div.evolution-level-range-inputs",
                        m("input.evolution-level-range-input",
                            {
                                type: "range",
                                min: 1,
                                max: 100,
                                disabled: !filter_state.evolution_level_range_filter_enabled,
                                value: filter_state.evolution_level_range_filter_min,
                                onchange: e => {
                                    filter_state.evolution_level_range_filter_min = parseInt(e.target.value);
                                }
                            }),
                        m("input.evolution-level-range-input",
                            {
                                type: "range",
                                min: 1,
                                max: 100,
                                disabled: !filter_state.evolution_level_range_filter_enabled,
                                value: filter_state.evolution_level_range_filter_max,
                                onchange: e => {
                                    filter_state.evolution_level_range_filter_max = parseInt(e.target.value);
                                }
                            }))),
                m("fieldset",
                    m("legend",
                        m("input", {
                            type: "checkbox",
                            checked: filter_state.evolution_item_filter_enabled,
                            onchange: e => {
                                filter_state.evolution_item_filter_enabled = e.target.checked;
                            }
                        }),
                        m("strong", "Item evolution")),
                    m("div",
                        m("label", m("input", {
                            type: "radio",
                            name: "evolution-item-filter-required",
                            disabled: !filter_state.evolution_item_filter_enabled,
                            value: "yes",
                            checked: filter_state.evolution_item_filter_required,
                            onchange: e => {
                                filter_state.evolution_item_filter_required = e.target.checked;
                            }
                        }), "Yes"),
                        m("label", m("input", {
                            type: "radio",
                            name: "evolution-item-filter-required",
                            disabled: !filter_state.evolution_item_filter_enabled,
                            value: "no",
                            checked: !filter_state.evolution_item_filter_required,
                            onchange: e => {
                                filter_state.evolution_item_filter_required = !e.target.checked;
                            }
                        }), "No")),
                    m("div",
                            m("label", m("input", {
                                type: "radio",
                                name: "evolution-item-filter-condition",
                                disabled: !filter_state.evolution_item_filter_enabled,
                                value: "either",
                                checked: !filter_state.evolution_item_filter_condition,
                                onchange: e => {
                                    filter_state.evolution_item_filter_condition = !e.target.checked;
                                }
                            }), "Head OR body"),
                            m("label", m("input", {
                                type: "radio",
                                name: "evolution-item-filter-condition",
                                disabled: !filter_state.evolution_item_filter_enabled,
                                value: "both",
                                checked: filter_state.evolution_item_filter_condition,
                                onchange: e => {
                                    filter_state.evolution_item_filter_condition = e.target.checked;
                                }
                            }), "Head AND body")))));
    }
};
