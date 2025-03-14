import { InputWidget } from "./InputWidget.js"

export const AbilityFilter = {
    view(vnode) {
        const { filter_state, game_data, sorted_pokemon } = vnode.attrs;

        let abilities_in_listing = [];
        for (const poke_idx of sorted_pokemon) {
            const poke = game_data.pokemon[poke_idx];
            for (const id of poke.abilities) {
                abilities_in_listing.push(id);
            }
            for (const id of poke.hidden_abilities) {
                abilities_in_listing.push(id);
            }
        }
        abilities_in_listing = Array.from(new Set(abilities_in_listing));

        const selected_ability = Array.from(filter_state.ability_filter)[0];
        const selected_ability_name = isNaN(selected_ability) ? "" : game_data.abilities[selected_ability].name;

        return m("div.ability-filter", m("strong", "Filter by ability"),
            m("datalist", { id: "ability-names" },
                Object.values(game_data.abilities)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(ab => m("option", { key: ab.name, label: ab.name, value: ab.id }))),
            m("div", m(InputWidget, {
                id: "ability-filter-selection",
                name: "ability-filter-selection",
                list: "ability-names",
                placeholder: "Search...",
                value: selected_ability_name,
                set_value: v => {
                    if (v && v in game_data.abilities) {
                        filter_state.ability_filter.add(parseInt(v));
                    } else {
                        filter_state.ability_filter.clear();
                    }
                },
                onchange: e => {
                    filter_state.ability_filter.clear();
                    if (e.target.value in game_data.abilities) {
                        filter_state.ability_filter.add(parseInt(e.target.value));
                    }
                }
            })),
            m("strong", "Abilities in current listing"),
            m("select#ability-filter-list", {
                multiple: true, onchange: e => {
                    filter_state.ability_filter.clear();
                    for (const opt of e.target.selectedOptions) {
                        filter_state.ability_filter.add(parseInt(opt.value));
                    }
                }
            },
                abilities_in_listing
                    .sort((a, b) => game_data.abilities[a].name.localeCompare(game_data.abilities[b].name))
                    .map(id => m("option", { label: game_data.abilities[id].name, value: id, selected: filter_state.ability_filter.has(id) }))));
    }
};
