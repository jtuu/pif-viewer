export const TRIPLE_FUSION_ID_START = 999999;

export const TRIPLE_FUSIONS_HARDCODED_DATA = {
    [TRIPLE_FUSION_ID_START + 0]: [144, 145, 146],
    //[TRIPLE_FUSION_ID_START + 1]: [144, 145, 146],
    [TRIPLE_FUSION_ID_START + 2]: [243, 244, 245],
    [TRIPLE_FUSION_ID_START + 3]: [340, 341, 342],
    [TRIPLE_FUSION_ID_START + 4]: [343, 344, 345],
    [TRIPLE_FUSION_ID_START + 5]: [349, 350, 351],
    [TRIPLE_FUSION_ID_START + 6]: [151, 251, 381],
    [TRIPLE_FUSION_ID_START + 11]: [150, 348, 380],
    [TRIPLE_FUSION_ID_START + 7]: [3, 6, 9],
    [TRIPLE_FUSION_ID_START + 8]: [154, 157, 160],
    [TRIPLE_FUSION_ID_START + 9]: [278, 281, 284],
    [TRIPLE_FUSION_ID_START + 10]: [318, 321, 324],
    [TRIPLE_FUSION_ID_START + 12]: [1, 4, 7],
    [TRIPLE_FUSION_ID_START + 13]: [2, 5, 8],
    [TRIPLE_FUSION_ID_START + 14]: [152, 155, 158],
    [TRIPLE_FUSION_ID_START + 15]: [153, 156, 159],
    [TRIPLE_FUSION_ID_START + 16]: [276, 279, 282],
    [TRIPLE_FUSION_ID_START + 17]: [277, 280, 283],
    [TRIPLE_FUSION_ID_START + 18]: [316, 319, 322],
    [TRIPLE_FUSION_ID_START + 19]: [317, 320, 323],
    [TRIPLE_FUSION_ID_START + 21]: [144, 145, 146],
    //[TRIPLE_FUSION_ID_START + 24]: [343, 344, 345],
    [TRIPLE_FUSION_ID_START + 27]: [447, 448, 449],
    [TRIPLE_FUSION_ID_START + 28]: [479, 482, 485],
    [TRIPLE_FUSION_ID_START + 29]: [480, 483, 486],
    [TRIPLE_FUSION_ID_START + 30]: [481, 484, 487],
};

export function is_triple_fusion(poke) {
    return poke.head_id >= TRIPLE_FUSION_ID_START;
}

export function calculate_fused_stat(dom, sub) {
    return Math.floor(((2 * dom) / 3) + (sub / 3));
}

export const fuse_pokemon = (() => {
    let normal_type_id = -1;
    let flying_type_id = -1;

    return function (
        type_map,
        head,
        body) {
        // Fusions can't be fused again
        if (is_triple_fusion(head) || is_triple_fusion(body) || head.is_fused || body.is_fused) {
            return null;
        }

        const hp = calculate_fused_stat(head.hp, body.hp);
        const spa = calculate_fused_stat(head.spa, body.spa);
        const spd = calculate_fused_stat(head.spd, body.spd);

        const atk = calculate_fused_stat(body.atk, head.atk);
        const def = calculate_fused_stat(body.def, head.def);
        const spe = calculate_fused_stat(body.spe, head.spe);

        const bst = hp + spa + spd + atk + def + spe;

        if (normal_type_id === -1) {
            normal_type_id = Object.values(type_map).find(tp => tp.name.toLowerCase() === "normal").id;
            flying_type_id = Object.values(type_map).find(tp => tp.name.toLowerCase() === "flying").id;
        }

        // Normal/Flying types are special
        const type1 = head.type1 == normal_type_id && head.type2 == flying_type_id
            ? head.type2
            : head.type1;

        // Use other if same as head
        const type2 = body.type2 == type1
            ? body.type1
            : body.type2;

        const abilities = head.abilities.slice();
        for (const ab of body.abilities) {
            if (!abilities.includes(ab)) {
                abilities.push(ab);
            }
        }

        const hidden_abilities = head.hidden_abilities.slice();
        for (const ab of body.hidden_abilities) {
            if (!hidden_abilities.includes(ab)) {
                hidden_abilities.push(ab);
            }
        }

        const is_hoenn = head.is_hoenn || body.is_hoenn;

        return {
            head_id: head.head_id,
            body_id: body.body_id,
            is_fused: true,
            hp,
            atk,
            def,
            spa,
            spd,
            spe,
            bst,
            type1,
            type2,
            abilities,
            hidden_abilities,
            is_hoenn
        };
    };
})();

export function generate_fusions(game_data) {
    const unfused_pokemon = game_data.pokemon.slice();

    // Add self-fusions
    for (const poke of unfused_pokemon) {
        if (!is_triple_fusion(poke)) {
            const copy = Object.assign({}, poke);
            copy.is_fused = true;
            game_data.pokemon.push(copy);
        }
    }

    // Add fused pokemon
    // Iterate through every pair of indices
    for (let i = 0; i < unfused_pokemon.length - 1; i++) {
        for (let j = i; j < unfused_pokemon.length - 1; j++) {
            const poke1 = unfused_pokemon[i];
            const poke2 = unfused_pokemon[j + 1];
            const fusion1 = fuse_pokemon(game_data.types, poke1, poke2);
            if (fusion1) {
                game_data.pokemon.push(fusion1);
            }

            const fusion2 = fuse_pokemon(game_data.types, poke2, poke1);
            if (fusion2) {
                game_data.pokemon.push(fusion2);
            }
        }
    }
}
