import { InputWidget } from "./InputWidget.js"

const legendaries = [
    "Necrozma",
    "Arceus", "Mewtwo",
    "Ho-Oh", "Lugia",
    "Rayquaza", "Dialga",
    "Palkia", "Giratina",
    "Reshiram", "Zekrom",
    "Groudon", "Kyogre",
    "Regigigas", "Kyurem",
    "Darkrai", "Genesect",
    "Latias", "Latios",
    "Deoxys", "Jirachi",
    "Mew",
    "Celebi", "Entei",
    "Raikou", "Suicune",
    "Cresselia", "Articuno",
    "Zapdos", "Moltres",
    "Regirock", "Registeel",
    "Regice"
];

const other_ubers = [
    "Meloetta",
    "Goodra",
    "Metagross",
    "Garchomp",
    "Dragonite",
    "Salamence",
    "Tyranitar",
    "Hydreigon",
    "Diancie",
    "Kommo-o"
];

const other_strong = [
    "Slaking",
    "Blissey"
];

function add_name_filter(unfused_names, name_, add_list, remove_list) {
    const names = Array.isArray(name_) ? name_ : [name_];
    let ok = false;
    for (const name of names) {
        if (name && !add_list.has(name) && unfused_names.has(name)) {
            if (remove_list.has(name)) {
                remove_list.delete(name);
            }
            add_list.add(name);
            ok = true;
        }
    }
    return ok;
}

export const NameFilter = {
    view(vnode) {
        const { filter_state, unfused_names } = vnode.attrs;
        const add_to_blacklist = names => add_name_filter(unfused_names, names, filter_state.name_blacklist, filter_state.name_whitelist);
        const add_to_whitelist = names => add_name_filter(unfused_names, names, filter_state.name_whitelist, filter_state.name_blacklist);
        const make_optgroup = set => {
            if (set.size === 0) {
                return m("option.empty-option", { disabled: true }, "(Empty)");
            }
            return Array.from(set).map(name => m("option", { key: name, value: name, selected: filter_state.highlighted_names.has(name) }, name));
        };
        return m("div.name-filter",
            m("div", m("label", { for: "name-filter-selection" }, m("strong", "Filter by name"))),
            m("div", m(InputWidget, {
                id: "name-filter-selection",
                name: "name-filter-selection",
                list: "poke-names",
                placeholder: "Search..."
            })),
            m("div",
                m("button", {
                    onclick: e => {
                        const input_el = document.querySelector("#name-filter-selection");
                        if (input_el.value) {
                            if (add_to_blacklist(input_el.value)) {
                                input_el.value = "";
                            }
                        } else {
                            const list_el = document.querySelector("#name-filter-list");
                            const selected = [];
                            for (const opt of list_el.options) {
                                if (opt.selected) {
                                    selected.push(opt.value);
                                }
                            }
                            add_to_blacklist(selected);
                        }
                    }
                }, "Blacklist"),
                m("button", {
                    onclick: e => {
                        const input_el = document.querySelector("#name-filter-selection");
                        if (input_el.value) {
                            if (add_to_whitelist(input_el.value)) {
                                input_el.value = "";
                            }
                        } else {
                            const list_el = document.querySelector("#name-filter-list");
                            const selected = [];
                            for (const opt of list_el.options) {
                                if (opt.selected) {
                                    selected.push(opt.value);
                                }
                            }
                            add_to_whitelist(selected);
                        }
                    }
                }, "Whitelist"),
                m("button", {
                    onclick: e => {
                        const list_el = document.querySelector("#name-filter-list");
                        let any_selected = false;
                        for (const opt of list_el.options) {
                            if (opt.selected) {
                                filter_state.name_blacklist.delete(opt.value);
                                filter_state.name_whitelist.delete(opt.value);
                                any_selected = true;
                            }
                        }
                        if (!any_selected) {
                            const input_el = document.querySelector("#name-filter-selection");
                            filter_state.name_blacklist.delete(input_el.value);
                            filter_state.name_whitelist.delete(input_el.value);
                            input_el.value = "";
                        }
                    }
                }, "Remove"),
                m("button", {
                    onclick: e => {
                        filter_state.name_blacklist.clear();
                        filter_state.name_whitelist.clear();
                    }
                }, "Clear")),
            m("datalist", { id: "poke-names" }, Array.from(unfused_names).map(name => m("option", { key: name, value: name }))),
            m("select", {
                id: "name-filter-list",
                name: "name-filter-list",
                multiple: true,
                onchange: e => {
                    filter_state.highlighted_names.clear();
                    for (const opt of e.target.selectedOptions) {
                        filter_state.highlighted_names.add(opt.value);
                    }
                }
            },
                m("optgroup", { label: "Blacklist" }, make_optgroup(filter_state.name_blacklist)),
                m("optgroup", { label: "Whitelist" }, make_optgroup(filter_state.name_whitelist))),
            m("div",
                m("button", {
                    onclick: e => add_to_blacklist(legendaries)
                }, "Legendaries"),
                m("button", {
                    onclick: e => add_to_blacklist(other_ubers)
                }, "Ubers"),
                m("button", {
                    onclick: e => add_to_blacklist(other_strong)
                }, "Strong")),
            m("div", m("label", m("input", {
                type: "checkbox",
                checked: filter_state.exclusive_name_whitelist,
                onchange: e => {
                    filter_state.exclusive_name_whitelist = e.target.checked;
                }
            }), "Strict whitelist")),
            m("div", m("label", m("input", {
                type: "checkbox",
                checked: filter_state.self_fusion_filter,
                onchange: e => {
                    filter_state.self_fusion_filter = e.target.checked;
                }
            }), "Hide self-fusions")));
    }
};
