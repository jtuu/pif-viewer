export const StatFilter = {
    view(vnode) {
        const { filter_state } = vnode.attrs;
        return m("div.stat-sorting",
            m("div.stat-sum-sort", m("div", m("strong", "Sort by stat sum")),
                m("div.stat-sort-checkboxes",
                    Object.keys(filter_state.stat_sorting_options).map(stat_name => {
                        return m("label", { key: stat_name }, [
                            m("input", {
                                type: "checkbox",
                                checked: filter_state.stat_sorting_options[stat_name],
                                onchange: e => {
                                    filter_state.stat_sorting_options[stat_name] = e.target.checked;
                                }
                            }),
                            m("span", stat_name),]);
                    }))),
            m("div.stat-min-filter", m("div", m("strong", "Minimum stats")),
                Object.keys(filter_state.stat_minimum_filter).map(stat_name => {
                    return m("label", { key: stat_name },
                        m("span.stat-name-label", stat_name),
                        m("input", {
                            type: "range",
                            name: "min_" + stat_name,
                            min: 0,
                            max: 255,
                            value: filter_state.stat_minimum_filter[stat_name],
                            oninput: e => {
                                filter_state.stat_minimum_filter[stat_name] = e.target.value;
                            },
                            onchange: e => {
                                filter_state.stat_minimum_filter[stat_name] = e.target.value;
                            }
                        }),
                        m("output", {
                            for: "min_" + stat_name
                        }, filter_state.stat_minimum_filter[stat_name])
                    )
                })));
    }
};
