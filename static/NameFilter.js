import { InputWidget } from "./InputWidget.js"

const legendaries = [
    "Necrozma",
    "Necrozma-Ultra",
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
    "Meloetta-Aria",
    "Meloetta-Pirouette",
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

export function add_name_filter(game_data, unfused_names, id_, add_list, remove_list, add_all_evolutions, move_out_of_list = true) {
    const ids = new Set(Array.isArray(id_) ? id_ : [id_]);

    if (add_all_evolutions) {
        // Find evos until no more new evos added
        let frontier = Array.from(ids);
        while (frontier.length > 0) {
            const new_frontier = [];
            for (const id of frontier) {
                ids.add(id);
                const evos = game_data.evolutions[id];
                for (const evo of evos) {
                    if (!ids.has(evo.evo_id)) {
                        new_frontier.push(evo.evo_id);
                    }
                }
            }
            frontier = new_frontier;
        }
    }

    let ok = false;
    for (const id of ids) {
        if (id && !add_list.has(id) && id in unfused_names) {
            if (move_out_of_list) {
                if (remove_list.has(id)) {
                    remove_list.delete(id);
                }
                add_list.add(id);
                ok = true;
            } else {
                if (!remove_list.has(id)) {
                    add_list.add(id);
                    ok = true;
                }
            }
        }
    }
    return ok;
}

export const NameFilter = {
    view(vnode) {
        const { filter_state, game_data, unfused_names } = vnode.attrs;
        const add_to_blacklist = names => add_name_filter(game_data, unfused_names, names, filter_state.name_blacklist, filter_state.name_whitelist, filter_state.name_filter_add_all_evolutions);
        const add_to_whitelist = names => add_name_filter(game_data, unfused_names, names, filter_state.name_whitelist, filter_state.name_blacklist, filter_state.name_filter_add_all_evolutions);
        const make_optgroup = set => {
            if (set.size === 0) {
                return m("option.empty-option", { label: "(Empty)", disabled: true });
            }
            return Array.from(set).map(id => m("option", { key: id, label: unfused_names[id], value: id, selected: filter_state.highlighted_names.has(id) }));
        };
        const names_to_ids = names => names.map(name => parseInt(Object.entries(unfused_names).find(([k, v]) => v === name)[0]));
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
                            if (add_to_blacklist(parseInt(input_el.value))) {
                                input_el.value = "";
                            }
                        } else {
                            const list_el = document.querySelector("#name-filter-list");
                            const selected = [];
                            for (const opt of list_el.options) {
                                if (opt.selected) {
                                    selected.push(parseInt(opt.value));
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
                            if (add_to_whitelist(parseInt(input_el.value))) {
                                input_el.value = "";
                            }
                        } else {
                            const list_el = document.querySelector("#name-filter-list");
                            const selected = [];
                            for (const opt of list_el.options) {
                                if (opt.selected) {
                                    selected.push(parseInt(opt.value));
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
                                const v = parseInt(opt.value);
                                filter_state.name_blacklist.delete(v);
                                filter_state.name_whitelist.delete(v);
                                filter_state.highlighted_names.delete(v);
                                any_selected = true;
                            }
                        }
                        if (!any_selected) {
                            const input_el = document.querySelector("#name-filter-selection");
                            const v = parseInt(input_el.value);
                            filter_state.name_blacklist.delete(v);
                            filter_state.name_whitelist.delete(v);
                            input_el.value = "";
                        }
                    }
                }, "Remove"),
                m("button", {
                    onclick: e => {
                        filter_state.name_blacklist.clear();
                        filter_state.name_whitelist.clear();
                        filter_state.highlighted_names.clear();
                    }
                }, "Clear")),
            m("div", m("label",
                m("input", {
                    type: "checkbox",
                    checked: filter_state.name_filter_add_all_evolutions,
                    onchange: e => {
                        filter_state.name_filter_add_all_evolutions = e.target.checked;
                    }
                }), "Add all evolutions")),
            m("datalist", { id: "poke-names" }, Object.entries(unfused_names).map(([id, name]) => m("option", { key: name, value: id, label: name }))),
            m("select", {
                id: "name-filter-list",
                name: "name-filter-list",
                multiple: true,
                onchange: e => {
                    filter_state.highlighted_names.clear();
                    for (const opt of e.target.selectedOptions) {
                        filter_state.highlighted_names.add(parseInt(opt.value));
                    }
                }
            },
                m("optgroup", { label: "Blacklist" }, make_optgroup(filter_state.name_blacklist)),
                m("optgroup", { label: "Whitelist" }, make_optgroup(filter_state.name_whitelist))),
            m("div",
                m("button", {
                    onclick: e => add_to_blacklist(names_to_ids(legendaries))
                }, "Legendaries"),
                m("button", {
                    onclick: e => add_to_blacklist(names_to_ids(other_ubers))
                }, "Ubers"),
                m("button", {
                    onclick: e => add_to_blacklist(names_to_ids(other_strong))
                }, "Strong")),
            m("div", m("label", { title: "Both halves of the fusion must exist in whitelist" },
                m("input", {
                    type: "checkbox",
                    checked: filter_state.exclusive_name_whitelist,
                    onchange: e => {
                        filter_state.exclusive_name_whitelist = e.target.checked;
                    }
                }), "Strict whitelist")),
            m("div", m("label", { title: "One half of the fusion is allowed to exist in blacklist, but not both" },
                m("input", {
                    type: "checkbox",
                    checked: filter_state.name_blacklist_half_only,
                    onchange: e => {
                        filter_state.name_blacklist_half_only = e.target.checked;
                    }
                }), "Relaxed blacklist")));
    }
};
