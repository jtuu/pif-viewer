import { InputWidget } from "./InputWidget.js";
import { standard_types } from "./TypeFilter.js";

const category_names = {
    0: "Physical",
    1: "Special",
    2: "Status"
};

export const MoveFilter = {
    longest_move_name: null,
    longest_type_name: null,
    type_name_map: null,
    view(vnode) {
        const { game_data, filter_state } = vnode.attrs;

        const sort_by_name = false;
        const sort_by_power = true;

        const compare_moves = (a, b) => {
            if (sort_by_power) {
                if (a.power === b.power) {
                    if (a.type_id === b.type_id) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.type_id < b.type_id;
                }
                return a.power < b.power;
            } else if (sort_by_name) {
                return a.name.localeCompare(b.name);
            }
        };

        if (!this.type_name_map) {
            this.type_name_map = {};
            for (const tp of Object.values(game_data.types)) {
                this.type_name_map[tp.name.toUpperCase()] = tp.id;
            }
        }

        if (!this.longest_move_name) {
            let longest = 0;
            for (const move of Object.values(game_data.moves)) {
                if (move.name.length > longest) {
                    longest = move.name.length;
                }
            }
            this.longest_move_name = longest;
        }

        if (!this.longest_type_name) {
            let longest = 0;
            for (const tp_name of standard_types) {
                if (tp_name.length > longest) {
                    longest = tp_name.length;
                }
            }
            this.longest_type_name = longest;
        }

        const selected_move_names = Array.from(filter_state.move_filter).sort((a, b) => a - b).map(move_id => game_data.moves[move_id].name).join(", ");

        const type_options = [m("option", { key: "any", label: "Any type", value: null, selected: filter_state.move_filter_type === null })];
        for (const tp_name of standard_types) {
            const id = this.type_name_map[tp_name.toUpperCase()];
            type_options.push(m("option", { key: tp_name, label: tp_name, value: id, selected: filter_state.move_filter_type === id }));
        }

        return m("div.move-filter", m("strong", "Filter by learnable moves"),
            m("datalist", { id: "moves-datalist" },
                Object.values(game_data.moves)
                    .map(move => m("option", { key: move.name, label: move.name, value: move.name.toLowerCase() }))),
            m(InputWidget, {
                multiple: true,
                list: "moves-datalist",
                value: selected_move_names,
                placeholder: "Search...",
                set_value: v => {
                    filter_state.move_filter.clear();
                },
                onchange: e => {
                    filter_state.move_filter.clear();
                    if (!e.target.value) return;
                    const move_names = e.target.value.split(",");
                    for (let move_name of move_names) {
                        move_name = move_name.trim().toLowerCase();
                        if (move_name in game_data.moves_by_name) {
                            filter_state.move_filter.add(game_data.moves_by_name[move_name]);
                        }
                    }
                }
            }),
            m("div", m("select", {
                onchange: e => {
                    const v = parseInt(e.target.value);
                    filter_state.move_filter_type = isNaN(v) ? null : v;
                }
            }, type_options)),
            m("select#move-filter-list", {
                multiple: true,
                onchange: e => {
                    filter_state.move_filter.clear();
                    for (const opt of e.target.selectedOptions) {
                        const move_name = opt.value;
                        filter_state.move_filter.add(game_data.moves_by_name[move_name]);
                    }
                }
            }, Object.values(game_data.moves)
                .filter(move => filter_state.move_filter_type === null || filter_state.move_filter_type === move.type_id)
                .sort(compare_moves)
                .map(move => {
                    if (!move.text) {
                        const nbsp = String.fromCharCode(0xa0);
                        const name = move.name.padEnd(this.longest_move_name, nbsp);
                        const pow = String(move.power).padStart(3, nbsp);
                        const acc = String(move.accuracy).padStart(3, nbsp);
                        const tp = String(game_data.types[move.type_id].name).padEnd(this.longest_type_name, nbsp);
                        const cat = category_names[move.category];
                        move.text = `${name}: ${pow}/${acc} ${tp} ${cat}`;
                    }
                    return m("option", { selected: filter_state.move_filter.has(move.id), label: move.text, value: move.name.toLowerCase() })
                })));
    }
};
