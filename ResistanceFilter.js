import { InputWidget } from "./InputWidget.js"

const conditions = ["=", "!=", "<", ">", "<=", ">="];

export const ResistanceFilter = {
    view(vnode) {
        const { filter_state, types } = vnode.attrs;
        return m("div.resistance-filter", m("strong", "Filter by resistance"),
            m("div.type-label-list",
                types.map(type =>
                    m("span", { key: type, className: "typelabel type-" + type.toLowerCase() }, type,
                        m("span",
                            m("select", {
                                onchange: e => {
                                    filter_state.resistance_filter[type].condition = e.target.value;
                                }
                            }, conditions.map(cond =>
                                m("option", {
                                    value: cond,
                                    selected: cond === filter_state.resistance_filter[type].condition
                                }, cond)
                            )),
                            m("select", {
                                onchange: e => {
                                    if (e.target.value === "unset") {
                                        filter_state.resistance_filter[type].value = null;
                                    } else {
                                        filter_state.resistance_filter[type].value = parseFloat(e.target.value);
                                    }
                                }
                            }, [["*", "unset"], ["0", 0], ["¼", 0.25], ["½", 0.5], ["1", 1.0], ["2", 2.0], ["4", 4.0]].map(([name, value]) =>
                                m("option", {
                                    value,
                                    selected: value === filter_state.resistance_filter[type].value
                                }, name))))))),
            m("div", m("strong", "Filter by number of resistances"),
                Object.keys(filter_state.resistance_count_filter).map(name =>
                    m("div", m("span.resistance-name-label", name), m(InputWidget, {
                        type: "number",
                        value: filter_state.resistance_count_filter[name],
                        set_value: v => filter_state.resistance_count_filter[name] = v,
                        onchange: e => {
                            if (e.target.value) {
                                const v = parseInt(e.target.value);
                                if (!isNaN(v)) {
                                    filter_state.resistance_count_filter[name] = v;
                                    return
                                }
                            }
                            filter_state.resistance_count_filter[name] = null;
                        }
                    })))));
    }
};
