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
    "Regice",
    "Meloetta-Aria",
    "Meloetta-Pirouette",
    "Diancie",
];

const other_strong = [
    "Goodra",
    "Metagross",
    "Garchomp",
    "Dragonite",
    "Salamence",
    "Tyranitar",
    "Hydreigon",
    "Kommo-o",
    "Slaking",
    "Blissey",
    "Chansey",
    "Aegislash",
    "Volcarona",
    "Noivern"
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

function load_names_from_save_file(bytes, game_data, filter_state, into_blacklist = false) {
    const save_data = marshal.load(bytes, {
        hashSymbolKeysToString: true,
        ivarToString: ""
    });
    const ids = [];
    for (const poke of save_data.player.party) {
        if (!poke) continue;
        if (poke.species_data.id_number > game_data.nb_pokemon) {
            ids.push(poke.species_data.head_pokemon.id_number);
            ids.push(poke.species_data.body_pokemon.id_number);
        } else {
            ids.push(poke.species_data.id_number);
        }
    }
    for (const box of save_data.storage_system.boxes) {
        for (const poke of box.pokemon) {
            if (!poke) continue;
            if (poke.species_data.id_number > game_data.nb_pokemon) {
                ids.push(poke.species_data.head_pokemon.id_number);
                ids.push(poke.species_data.body_pokemon.id_number);
            } else {
                ids.push(poke.species_data.id_number);
            }
        }
    }
    const add_list = into_blacklist ? filter_state.name_blacklist : filter_state.name_whitelist;
    const remove_list = into_blacklist ? filter_state.name_whitelist : filter_state.name_blacklist;
    add_name_filter(game_data, game_data.pokemon_names, ids, add_list, remove_list, filter_state.name_filter_add_all_evolutions, false);
    return ids.length;
}

export const NameFilter = {
    savefile_import_result: "",
    show_savefile_import_error(err) {
        this.savefile_import_result = "❌ Failed to import savefile";
        if (err.message) {
            this.savefile_import_result += ": " + err.message;
        }
    },
    view(vnode) {
        const { filter_state, game_data, unfused_names } = vnode.attrs;
        const add_to_blacklist = names => add_name_filter(game_data, unfused_names, names, filter_state.name_blacklist, filter_state.name_whitelist, filter_state.name_filter_add_all_evolutions);
        const add_to_whitelist = names => add_name_filter(game_data, unfused_names, names, filter_state.name_whitelist, filter_state.name_blacklist, filter_state.name_filter_add_all_evolutions);
        const make_optgroup = (set, is_white) => {
            if (set.size === 0) {
                return m("option.empty-option", { key: is_white ? -1 : -2, label: "(Empty)", disabled: true });
            }
            return Array.from(set).map(id => m("option", { key: id, label: unfused_names[id], value: unfused_names[id].toLowerCase(), selected: filter_state.highlighted_names.has(id) }));
        };
        const names_to_ids = names => names.map(name => game_data.pokemon_by_name[name.toLowerCase()]);
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
                            const poke_name = input_el.value.toLowerCase();
                            const poke_id = game_data.pokemon_by_name[poke_name];
                            if (add_to_blacklist(poke_id)) {
                                input_el.value = "";
                                filter_state.highlighted_names.delete(poke_id);
                            }
                        } else {
                            const list_el = document.querySelector("#name-filter-list");
                            const selected = [];
                            for (const opt of list_el.selectedOptions) {
                                const poke_name = opt.value.toLowerCase();
                                const poke_id = game_data.pokemon_by_name[poke_name];
                                selected.push(poke_id);
                                filter_state.highlighted_names.delete(poke_id);
                            }
                            add_to_blacklist(selected);
                        }
                    }
                }, "Blacklist"),
                m("button", {
                    onclick: e => {
                        const input_el = document.querySelector("#name-filter-selection");
                        if (input_el.value) {
                            const poke_name = input_el.value.toLowerCase();
                            const poke_id = game_data.pokemon_by_name[poke_name];
                            if (add_to_whitelist(poke_id)) {
                                input_el.value = "";
                            }
                        } else {
                            const list_el = document.querySelector("#name-filter-list");
                            const selected = [];
                            for (const opt of list_el.selectedOptions) {
                                const poke_name = opt.value.toLowerCase();
                                const poke_id = game_data.pokemon_by_name[poke_name];
                                selected.push(poke_id);
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
                                const poke_name = opt.value.toLowerCase();
                                const poke_id = game_data.pokemon_by_name[poke_name];
                                filter_state.name_blacklist.delete(poke_id);
                                filter_state.name_whitelist.delete(poke_id);
                                filter_state.highlighted_names.delete(poke_id);
                                any_selected = true;
                            }
                        }
                        if (!any_selected) {
                            const input_el = document.querySelector("#name-filter-selection");
                            const poke_name = input_el.value.toLowerCase();
                            const poke_id = game_data.pokemon_by_name[poke_name];
                            filter_state.name_blacklist.delete(poke_id);
                            filter_state.name_whitelist.delete(poke_id);
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
            m("datalist", { id: "poke-names" }, Object.values(unfused_names).map((name => m("option", { key: name, value: name.toLowerCase(), label: name })))),
            m("select", {
                id: "name-filter-list",
                name: "name-filter-list",
                multiple: true,
                onchange: e => {
                    filter_state.highlighted_names.clear();
                    for (const opt of e.target.selectedOptions) {
                        const poke_name = opt.value;
                        filter_state.highlighted_names.add(game_data.pokemon_by_name[poke_name]);
                    }
                }
            },
                m("optgroup", { label: "Blacklist" }, make_optgroup(filter_state.name_blacklist)),
                m("optgroup", { label: "Whitelist" }, make_optgroup(filter_state.name_whitelist))),
            m("div", m("label", { title: "Both halves of the fusion must exist in whitelist" },
                m("input", {
                    type: "checkbox",
                    checked: filter_state.exclusive_name_whitelist,
                    onchange: e => {
                        filter_state.exclusive_name_whitelist = e.target.checked;
                    }
                }), "Strict whitelist"),
                m("span.vertical-rule"),
                m("label", { title: "One half of the fusion is allowed to exist in blacklist, but not both" },
                    m("input", {
                        type: "checkbox",
                        checked: filter_state.name_blacklist_half_only,
                        onchange: e => {
                            filter_state.name_blacklist_half_only = e.target.checked;
                        }
                    }), "Relaxed blacklist")),
            m("hr"),
            m("div",
                m("span", "Add presets: "),
                m("button", {
                    title: legendaries.join("\n"),
                    onclick: e => add_to_blacklist(names_to_ids(legendaries))
                }, "Legendaries"),
                m("button", {
                    title: other_strong.join("\n"),
                    onclick: e => add_to_blacklist(names_to_ids(other_strong))
                }, "Other strong")),
            m("hr"),
            m("label", "Import from savefile ",
                m("input", {
                    type: "file",
                    accept: ".rxdata",
                    onchange: e => {
                        // Returning a promise makes mithril defer the view update until it resolves
                        return new Promise((resolve, reject) => {
                            if (e.target.files.length < 1) return resolve();
                            const file = e.target.files[0];
                            // Read file using FileReader
                            const reader = new FileReader();
                            reader.onload = () => {
                                try {
                                    // Parse file
                                    const bytes = reader.result;
                                    const whitelist_len_before = filter_state.name_whitelist.size;
                                    const num_found = load_names_from_save_file(bytes, game_data, filter_state, false);
                                    const num_added = filter_state.name_whitelist.size - whitelist_len_before;
                                    const msg = `✔️ Found ${num_found} pokemon in savefile. Added ${num_added} new pokemon to whitelist.`
                                    vnode.state.savefile_import_result = msg;
                                    resolve(); // Allow mithril to update view
                                } catch (err) {
                                    this.show_savefile_import_error(err);
                                    reject(err);
                                }
                            };
                            reader.onerror = () => {
                                this.show_savefile_import_error(reader.error);
                                reject(reader.error);
                            };
                            reader.readAsArrayBuffer(file);
                        });
                    }
                })),
            m("div#savefile-import-result", vnode.state.savefile_import_result));
    }
};
