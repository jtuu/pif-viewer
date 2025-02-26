use anyhow::Result;
use clap::ValueEnum;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use thurgood::{rc::RbAny, rc::RbSymbol};

use crate::util::*;

#[derive(Serialize, Clone)]
struct ParsedPokemon {
    head_id: u32,
    body_id: u32,
    is_fused: bool,
    hp: i32,
    atk: i32,
    def: i32,
    spa: i32,
    spd: i32,
    spe: i32,
    bst: i32,
    type1: u32,
    type2: u32,
    abilities: Vec<u32>,
    hidden_abilities: Vec<u32>,
}

#[derive(Serialize)]
struct Ability {
    id: u32,
    name: String,
    description: String,
}

#[derive(Serialize, Clone)]
struct PokemonType {
    id: u32,
    name: String,
    weaknesses: Vec<u32>,
    resistances: Vec<u32>,
    immunities: Vec<u32>,
}

#[derive(Serialize)]
struct ResultFile {
    contains_fusions: bool,
    abilities: HashMap<String, Ability>,
    pokemon_names: HashMap<String, String>,
    types: HashMap<String, PokemonType>,
    pokemon: Vec<ParsedPokemon>,
}

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
pub enum OutputFormat {
    Json,
    Binary,
}

fn is_triple_fusion(poke: &ParsedPokemon) -> bool {
    return poke.head_id >= 999999;
}

fn calculate_fused_stat(dom: i32, sub: i32) -> i32 {
    return ((2 * dom) / 3) + (sub / 3);
}

fn fusion_key(head_id: u32, body_id: u32) -> String {
    return format!("{}.{}", head_id, body_id);
}

fn fuse_pokemon(
    type_map: &HashMap<String, u32>,
    head: &ParsedPokemon,
    body: &ParsedPokemon,
) -> Option<ParsedPokemon> {
    // Fusions can't be fused again
    if is_triple_fusion(head) || is_triple_fusion(body) || head.is_fused || body.is_fused {
        return None;
    }

    let hp = calculate_fused_stat(head.hp, body.hp);
    let spa = calculate_fused_stat(head.spa, body.spa);
    let spd = calculate_fused_stat(head.spd, body.spd);

    let atk = calculate_fused_stat(body.atk, head.atk);
    let def = calculate_fused_stat(body.def, head.def);
    let spe = calculate_fused_stat(body.spe, head.spe);

    let bst = hp + spa + spd + atk + def + spe;

    // Normal/Flying types are special
    let type1 = if head.type1 == *type_map.get("NORMAL").unwrap()
        && head.type2 == *type_map.get("FLYING").unwrap()
    {
        head.type2
    } else {
        head.type1
    };

    // Use other if same as head
    let type2 = if body.type2 == type1 {
        body.type1
    } else {
        body.type2
    };

    let mut abilities = head.abilities.clone();
    for ab in &body.abilities {
        if !abilities.contains(ab) {
            abilities.push(*ab);
        }
    }

    let mut hidden_abilities = head.hidden_abilities.clone();
    for ab in &body.hidden_abilities {
        if !hidden_abilities.contains(ab) {
            hidden_abilities.push(*ab);
        }
    }

    return Some(ParsedPokemon {
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
    });
}

pub fn export_data(
    input_dir_path: &PathBuf,
    output_dir_path: &PathBuf,
    output_format: OutputFormat,
    export_fusions: bool,
) -> Result<()> {
    let ability_data = read_ruby_file(&input_dir_path.join("abilities.dat"))?;
    let species_data = read_ruby_file(&input_dir_path.join("species.dat"))?;
    let type_data = read_ruby_file(&input_dir_path.join("types.dat"))?;

    let mut abilities = HashMap::new();
    let mut pokemon_names = HashMap::new();
    let mut types = HashMap::new();
    let mut unfused_pokemon = Vec::new();
    let mut pokemon = HashMap::new();

    // Create name->id lookup table for abilities
    let mut ability_sym_map = HashMap::new();

    // Add abilities
    ability_data
        .as_hash()
        .unwrap()
        .values()
        .for_each(|ability_any| {
            let ability_obj = ability_any.as_object().unwrap();
            let sym: String = ability_obj.get_field("@id");
            let id: u32 = ability_obj.get_field("@id_number");
            let name = ability_obj.get_field("@real_name");
            let description = ability_obj.get_field("@real_description");
            ability_sym_map.insert(sym, id);
            abilities.insert(
                id.to_string(),
                Ability {
                    id,
                    name,
                    description,
                },
            );
        });

    // Create name->id lookup table for types
    let mut type_sym_map = HashMap::new();
    type_data.as_hash().unwrap().values().for_each(|type_any| {
        let type_obj = type_any.as_object().unwrap();
        let sym: String = type_obj.get_field("@id");
        let id: u32 = type_obj.get_field("@id_number");
        type_sym_map.insert(sym, id);
    });

    // Add types
    type_data.as_hash().unwrap().values().for_each(|type_any| {
        let type_obj = type_any.as_object().unwrap();
        let id: u32 = type_obj.get_field("@id_number");
        let name = type_obj.get_field("@real_name");
        let weaknesses: Vec<String> = type_obj.get_field("@weaknesses");
        let resistances: Vec<String> = type_obj.get_field("@resistances");
        let immunities: Vec<String> = type_obj.get_field("@immunities");
        types.insert(
            id.to_string(),
            PokemonType {
                id,
                name,
                weaknesses: weaknesses
                    .iter()
                    .map(|sym| *type_sym_map.get(sym).unwrap())
                    .collect(),
                resistances: resistances
                    .iter()
                    .map(|sym| *type_sym_map.get(sym).unwrap())
                    .collect(),
                immunities: immunities
                    .iter()
                    .map(|sym| *type_sym_map.get(sym).unwrap())
                    .collect(),
            },
        );
    });

    // Add pokemon names
    species_data
        .as_hash()
        .unwrap()
        .values()
        .for_each(|poke_any| {
            let poke_obj = poke_any.as_object().unwrap();
            let id: usize = poke_obj.get_field("@id_number");
            let name = poke_obj.get_field("@real_name");
            pokemon_names.insert(id.to_string(), name);
        });

    // Add unfused pokemon
    species_data
        .as_hash()
        .unwrap()
        .values()
        .for_each(|poke_any| {
            let poke_obj = poke_any.as_object().unwrap();
            let id = poke_obj.get_field("@id_number");
            let base_stats = poke_obj
                .fields
                .get(&RbSymbol::from_str("@base_stats"))
                .unwrap()
                .as_hash()
                .unwrap();
            let hp = base_stats
                .get(&RbAny::Symbol(RbSymbol::from_str("HP")))
                .unwrap()
                .as_int()
                .unwrap();
            let atk = base_stats
                .get(&RbAny::Symbol(RbSymbol::from_str("ATTACK")))
                .unwrap()
                .as_int()
                .unwrap();
            let def = base_stats
                .get(&RbAny::Symbol(RbSymbol::from_str("DEFENSE")))
                .unwrap()
                .as_int()
                .unwrap();
            let spa = base_stats
                .get(&RbAny::Symbol(RbSymbol::from_str("SPECIAL_ATTACK")))
                .unwrap()
                .as_int()
                .unwrap();
            let spd = base_stats
                .get(&RbAny::Symbol(RbSymbol::from_str("SPECIAL_DEFENSE")))
                .unwrap()
                .as_int()
                .unwrap();
            let spe = base_stats
                .get(&RbAny::Symbol(RbSymbol::from_str("SPEED")))
                .unwrap()
                .as_int()
                .unwrap();
            let bst = hp + atk + def + spa + spd + spe;
            let type1: String = poke_obj.get_field("@type1");
            let type2: String = poke_obj.get_field("@type2");
            let abilities: Vec<String> = poke_obj.get_field("@abilities");
            let hidden_abilities: Vec<String> = poke_obj.get_field("@hidden_abilities");
            let poke = ParsedPokemon {
                head_id: id,
                body_id: id,
                is_fused: false,
                hp,
                atk,
                def,
                spa,
                spd,
                spe,
                bst,
                type1: *type_sym_map.get(&type1).unwrap(),
                type2: *type_sym_map.get(&type2).unwrap(),
                abilities: abilities
                    .iter()
                    .map(|sym| *ability_sym_map.get(sym).unwrap())
                    .collect(),
                hidden_abilities: hidden_abilities
                    .iter()
                    .map(|sym| *ability_sym_map.get(sym).unwrap())
                    .collect(),
            };
            unfused_pokemon.push(poke.clone());
            pokemon.insert(id.to_string(), poke);
        });

    // It's probably better to just generate the fusions in the client
    // because it uses less bandwidth and the time it takes to parse a huge file
    // is comparable to the time it takes to generate the fusions anyway.
    if export_fusions {
        // Add self-fusions
        unfused_pokemon.iter().for_each(|unfused| {
            let mut fused = unfused.clone();
            fused.is_fused = true;
            pokemon.insert(fusion_key(fused.head_id, fused.body_id), fused);
        });

        // Add fused pokemon
        // Iterate through every pair of indices
        for i in 0..unfused_pokemon.len() - 1 {
            for j in i..unfused_pokemon.len() - 1 {
                let idx1 = i;
                let idx2 = j + 1;
                // Skip self-fusions
                if idx1 == idx2 {
                    continue;
                }
                let poke1 = &unfused_pokemon[idx1];
                let poke2 = &unfused_pokemon[idx2];
                if let Some(fusion) = fuse_pokemon(&type_sym_map, poke1, poke2) {
                    pokemon.insert(fusion_key(poke1.head_id, poke2.head_id), fusion);
                }
                if let Some(fusion) = fuse_pokemon(&type_sym_map, poke2, poke1) {
                    pokemon.insert(fusion_key(poke2.head_id, poke1.head_id), fusion);
                }
            }
        }
    }

    let result_data = ResultFile {
        contains_fusions: export_fusions,
        abilities,
        pokemon_names,
        types,
        pokemon: pokemon.into_values().collect(),
    };

    return match output_format {
        OutputFormat::Json => {
            write_json_file(&output_dir_path.join("game_data.json"), &result_data)
        }
        OutputFormat::Binary => {
            write_binary_file(&output_dir_path.join("game_data.dat"), &result_data)
        }
    };
}
