import { RangeSliderInput } from "./RangeSliderInput.js";

const stat_tooltip = {
    "HP": "Hitpoints",
    "ATK": "Physical attack",
    "DEF": "Physical defense",
    "SPA": "Special attack",
    "SPD": "Special defense",
    "SPE": "Speed",
    "BST": "Total sum of all base stats",
    "max(ATK, SPA)": "ATK or SPA, whichever is highest"
};

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
            m("div.stat-min-filter", m("div", m("strong", "Minimum and maximum stat limits")),
                Object.keys(filter_state.stat_minimum_filter).map(stat_name => {
                    return m("label", { key: stat_name },
                        m("div.stat-range-label", { title: stat_tooltip[stat_name] },
                            m("div", stat_name),
                            m("div", `${filter_state.stat_minimum_filter[stat_name]}-${filter_state.stat_maximum_filter[stat_name]}`)),
                        m(RangeSliderInput, {
                            min: 0,
                            max: stat_name === "BST" ? 1000 : 255,
                            left_value: filter_state.stat_minimum_filter[stat_name],
                            right_value: filter_state.stat_maximum_filter[stat_name],
                            on_left_input: value => {
                                filter_state.stat_minimum_filter[stat_name] = value;
                            },
                            on_right_input: value => {
                                filter_state.stat_maximum_filter[stat_name] = value;
                            }
                        })
                    )
                })));
    }
};
