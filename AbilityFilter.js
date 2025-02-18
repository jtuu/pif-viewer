import { InputWidget } from "./InputWidget.js"

export const AbilityFilter = {
    view(vnode) {
        const { filter_state, all_abilities, sorted_pokemon } = vnode.attrs;
        return m("div.ability-filter", m("strong", "Filter by ability"),
            m("datalist", { id: "ability-names" }, Array.from(all_abilities).map(name => m("option", { key: name, value: name }))),
            m("div", m(InputWidget, {
                id: "ability-filter-selection",
                name: "ability-filter-selection",
                list: "ability-names",
                placeholder: "Search...",
                value: Array.from(filter_state.ability_filter)[0],
                set_value: v => {
                    if (v && all_abilities.has(v)) {
                        filter_state.ability_filter.add(v);
                    } else {
                        filter_state.ability_filter.clear();
                    }
                },
                onchange: e => {
                    filter_state.ability_filter.clear();
                    if (all_abilities.has(e.target.value)) {
                        filter_state.ability_filter.add(e.target.value);
                    }
                }
            })),
            m("strong", "Abilities in current listing"),
            m("select#ability-filter-list", {
                multiple: true, onchange: e => {
                    filter_state.ability_filter.clear();
                    for (const opt of e.target.selectedOptions) {
                        filter_state.ability_filter.add(opt.value);
                    }
                }
            },
                Array.from(new Set(sorted_pokemon.flatMap(p => Array.from(p.abilities).concat(Array.from(p.hidden_abilities)))))
                    .sort().map(ab => m("option", { value: ab, selected: filter_state.ability_filter.has(ab) }, ab))));
    }
};
