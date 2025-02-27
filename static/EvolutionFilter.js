export const EvolutionFilter = {
    view(vnode) {
        const { filter_state, game_data } = vnode.attrs;
        return m("div.evolution-filter",
            m("div",
                m("span",
                    m("input",
                        {
                            type: "checkbox",
                            checked: filter_state.evolution_level_range_filter_enabled,
                            onchange: e => {
                                filter_state.evolution_level_range_filter_enabled = e.target.checked;
                            }
                        }),
                    m("strong", "Filter by evolution level range")),
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
                        }), "Either"),
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
                        }), "Both")),
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
                        }))));
    }
};
