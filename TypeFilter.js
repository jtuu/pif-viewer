export const TypeFilter = {
    view(vnode) {
        const { filter_state, types } = vnode.attrs;
        return m("div.type-filter", m("strong", "Filter by type"),
            m("div",
                m("label", "Match some",
                    m("input",
                        {
                            type: "radio",
                            name: "type-filter-condition",
                            value: "some",
                            checked: !filter_state.type_filter_condition,
                            onchange: e => {
                                filter_state.type_filter_condition = !e.target.checked;
                            }
                        })),
                m("label", "Match every",
                    m("input",
                        {
                            type: "radio",
                            name: "type-filter-condition",
                            value: "every",
                            checked: filter_state.type_filter_condition,
                            onchange: e => {
                                filter_state.type_filter_condition = e.target.checked;
                            }
                        }, "Every"))),
            m("div.type-filter-list.type-label-list",
                types.map(type =>
                    m("label", { key: type, className: "typelabel type-" + type.toLowerCase() },
                        type, m("input", {
                            type: "checkbox", checked: filter_state.type_filter.has(type),
                            onchange: e => {
                                if (e.target.checked) {
                                    filter_state.type_filter.add(type);
                                } else {
                                    filter_state.type_filter.delete(type);
                                }
                            }
                        })))),
            m("div",
                m("button", {
                    onclick: () => {
                        types.forEach(tp => filter_state.type_filter.add(tp));
                    }
                }, "Enable all"),
                m("button", {
                    onclick: () => {
                        filter_state.type_filter.clear();
                    }
                }, "Disable all")));
    }
};
