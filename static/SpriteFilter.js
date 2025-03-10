export const SpriteFilter = {
    view(vnode) {
        const { filter_state } = vnode.attrs;
        return m("div.sprite-filter",
            m("div", m("label", m("input", {
                type: "checkbox",
                checked: filter_state.self_fusion_filter,
                onchange: e => {
                    filter_state.self_fusion_filter = e.target.checked;
                }
            }), "Hide self-fusions")),
            m("hr"),
            m("div",
                m("label", m("input", {
                    type: "checkbox",
                    checked: filter_state.display_shiny_sprites,
                    onchange: e => {
                        filter_state.display_shiny_sprites = e.target.checked;
                    }
                }), m("strong", "Display shiny sprites")),
                m("label", m("input", {
                    type: "checkbox",
                    checked: filter_state.is_head_shiny,
                    disabled: !filter_state.display_shiny_sprites,
                    onchange: e => {
                        filter_state.is_head_shiny = e.target.checked;
                    }
                }), "Head"),
                m("label", m("input", {
                    type: "checkbox",
                    checked: filter_state.is_body_shiny,
                    disabled: !filter_state.display_shiny_sprites,
                    onchange: e => {
                        filter_state.is_body_shiny = e.target.checked;
                    }
                }), "Body")),
            m("hr"),
            m("div",
                m("strong", "Show fusions without custom sprites"),
                m("div",
                    m("label", m("input", {
                        type: "radio",
                        name: "customless-filter",
                        value: "no",
                        checked: !filter_state.show_customless,
                        onchange: e => {
                            filter_state.show_customless = !e.target.checked;
                            filter_state.only_show_customless = false;
                        }
                    }), "No"),
                    m("label", m("input", {
                        type: "radio",
                        name: "customless-filter",
                        value: "yes",
                        checked: filter_state.show_customless,
                        onchange: e => {
                            filter_state.show_customless = e.target.checked;
                            filter_state.only_show_customless = false;
                        }
                    }), "Yes"),
                    m("label", m("input", {
                        type: "radio",
                        name: "customless-filter",
                        value: "only",
                        checked: filter_state.only_show_customless,
                        onchange: e => {
                            filter_state.show_customless = true;
                            filter_state.only_show_customless = e.target.checked;
                        }
                    }), "Only")))
        )
    }
};
