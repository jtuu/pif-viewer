use anyhow::Result;
use clap::ValueEnum;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use thurgood::{rc::RbAny, rc::RbSymbol};

use crate::util::*;

#[derive(Serialize, Clone)]
enum EvolutionKind {
    Level(u8),
    LevelDay(u8),
    LevelNight(u8),
    Item(String),
    HasMove(String),
    AttackGreater(u8),
    DefenseGreater(u8),
    AtkDefEqual(u8),
    Shedinja(u8),
    Ninjask(u8),
    DayHoldItem(String),
}

#[derive(Serialize, Clone)]
struct Evolution {
    evo_id: u32,
    is_preevo: bool,
    kind: EvolutionKind,
}

impl Evolution {
    fn from_rb(poke_sym_map: &HashMap<String, u32>, evo_any: &RbAny) -> Self {
        // Why is this an array...
        let evo_data = evo_any.as_array().unwrap();
        let evo_name = evo_data[0].as_symbol().unwrap().as_str().unwrap();
        let condition = evo_data[1].as_symbol().unwrap().as_str().unwrap();
        let param = &evo_data[2];
        let is_preevo = evo_data[3].as_bool().unwrap();

        let evo_kind = match condition {
            "Level" => EvolutionKind::Level(param.as_int().unwrap() as u8),
            "LevelDay" => EvolutionKind::LevelDay(param.as_int().unwrap() as u8),
            "LevelNight" => EvolutionKind::LevelNight(param.as_int().unwrap() as u8),
            "Item" => EvolutionKind::Item(param.as_symbol().unwrap().as_str().unwrap().to_owned()),
            "HasMove" => {
                EvolutionKind::HasMove(param.as_symbol().unwrap().as_str().unwrap().to_owned())
            }
            "AttackGreater" => EvolutionKind::AttackGreater(param.as_int().unwrap() as u8),
            "DefenseGreater" => EvolutionKind::DefenseGreater(param.as_int().unwrap() as u8),
            "AtkDefEqual" => EvolutionKind::AtkDefEqual(param.as_int().unwrap() as u8),
            "Shedinja" => EvolutionKind::Shedinja(param.as_int().unwrap() as u8),
            "Ninjask" => EvolutionKind::Ninjask(param.as_int().unwrap() as u8),
            "DayHoldItem" => {
                EvolutionKind::DayHoldItem(param.as_symbol().unwrap().as_str().unwrap().to_owned())
            }
            _ => panic!("Unexpected evolution condition {}", condition),
        };

        return Self {
            evo_id: *poke_sym_map.get(evo_name).unwrap(),
            is_preevo,
            kind: evo_kind,
        };
    }
}

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

#[derive(Serialize, Clone)]
struct BattleMove {
    id: u32,
    name: String,
    type_id: u32,
    category: u32,
    power: u32,
    accuracy: u32,
    learners: Vec<u32>,
    tutor_learners: Vec<u32>,
    egg_learners: Vec<u32>,
}

#[derive(Serialize)]
struct ResultFile {
    contains_fusions: bool,
    // Key is numeric id of ability as string
    abilities: HashMap<String, Ability>,
    // Key is numeric id of pokemon as string
    pokemon_names: HashMap<String, String>,
    // Key is numeric id of type as string
    types: HashMap<String, PokemonType>,
    pokemon: Vec<ParsedPokemon>,
    // Key is numeric id of pokemon as string
    evolutions: HashMap<String, Vec<Evolution>>,
    moves: HashMap<String, BattleMove>,
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
    let pokes_with_special_names = HashMap::from([
        ("NIDORANfE", "Nidoran-Female"),
        ("NIDORANmA", "Nidoran-Male"),
        ("ORICORIO_1", "Oricorio-Baile"),
        ("ORICORIO_2", "Oricorio-Pom-Pom"),
        ("ORICORIO_3", "Oricorio-Pa'u"),
        ("ORICORIO_4", "Oricorio-Sensu"),
        ("MELOETTA_A", "Meloetta-Aria"),
        ("MELOETTA_P", "Meloetta-Pirouette"),
        ("U_NECROZMA", "Necrozma-Ultra"),
        ("LYCANROC_D", "Lycanroc-Day"),
        ("LYCANROC_N", "Lycanroc-Night"),
        ("MINIOR_M", "Minior-Meteor"),
        ("MINIOR_C", "Minior-Core"),
    ]);

    let ability_data = read_ruby_file(&input_dir_path.join("abilities.dat"))?;
    let species_data = read_ruby_file(&input_dir_path.join("species.dat"))?;
    let type_data = read_ruby_file(&input_dir_path.join("types.dat"))?;
    let moves_data = read_ruby_file(&input_dir_path.join("moves.dat"))?;

    let mut abilities = HashMap::new();
    let mut pokemon_names = HashMap::new();
    let mut types = HashMap::new();
    let mut unfused_pokemon = Vec::new();
    // Result will be vec but use hashmap here to deduplicate
    let mut pokemon = HashMap::new();
    let mut evolutions = HashMap::new();
    let mut moves = HashMap::new();

    // Create name->id lookup table for abilities
    let mut ability_sym_map = HashMap::new();

    // Add abilities
    ability_data
        .as_hash()
        .unwrap()
        .values()
        .for_each(|ability_any| {
            let ability_obj = ability_any.as_object().unwrap();
            let id: u32 = ability_obj.get_field("@id_number");
            let key = id.to_string();
            // Hash contains duplicates for some reason
            if abilities.contains_key(&key) {
                return;
            }
            let sym: String = ability_obj.get_field("@id");
            let name = ability_obj.get_field("@real_name");
            let description = ability_obj.get_field("@real_description");
            ability_sym_map.insert(sym, id);
            abilities.insert(
                key,
                Ability {
                    id,
                    name,
                    description,
                },
            );
        });

    // Create symbol->id lookup table for types
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

    // Symbol->id lookup table for moves
    let mut move_sym_map = HashMap::new();
    moves_data.as_hash().unwrap().values().for_each(|move_any| {
        let move_obj = move_any.as_object().unwrap();
        let id: u32 = move_obj.get_field("@id_number");
        let sym: String = move_obj.get_field("@id");
        let name: String = move_obj.get_field("@real_name");
        let type_name: String = move_obj.get_field("@type");
        let type_id = *type_sym_map.get(&type_name).unwrap();
        let category: u32 = move_obj.get_field("@category");
        let accuracy: u32 = move_obj.get_field("@accuracy");
        let power: u32 = move_obj.get_field("@base_damage");
        move_sym_map.insert(sym, id);
        moves.insert(
            id.to_string(),
            BattleMove {
                id,
                name,
                type_id,
                category,
                power,
                accuracy,
                learners: Vec::new(),
                tutor_learners: Vec::new(),
                egg_learners: Vec::new(),
            },
        );
    });

    // Create symbol->id lookup table for pokemon
    let mut poke_sym_map = HashMap::new();
    // Add pokemon names
    species_data
        .as_hash()
        .unwrap()
        .values()
        .for_each(|poke_any| {
            let poke_obj = poke_any.as_object().unwrap();
            let id: u32 = poke_obj.get_field("@id_number");
            let sym: String = poke_obj.get_field("@id");
            let name: String = if let Some(special_name) = pokes_with_special_names.get(&*sym) {
                special_name.to_string()
            } else {
                poke_obj.get_field("@real_name")
            };
            pokemon_names.insert(id.to_string(), name);
            poke_sym_map.insert(sym, id);
        });

    // Add unfused pokemon
    species_data
        .as_hash()
        .unwrap()
        .values()
        .for_each(|poke_any| {
            let poke_obj = poke_any.as_object().unwrap();
            let poke_id: u32 = poke_obj.get_field("@id_number");
            let key = poke_id.to_string();
            // Hash contains duplicates for some reason
            if pokemon.contains_key(&key) {
                return;
            }
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

            poke_obj
                .fields
                .get(&RbSymbol::from_str("@moves"))
                .unwrap()
                .as_array()
                .unwrap()
                .iter()
                .for_each(|move_any| {
                    let move_data = move_any.as_array().unwrap();
                    let sym = move_data[1].as_symbol().unwrap().as_str().unwrap();
                    let move_id = *move_sym_map.get(sym).unwrap();
                    moves
                        .get_mut(&move_id.to_string())
                        .unwrap()
                        .learners
                        .push(poke_id);
                });
            poke_obj
                .fields
                .get(&RbSymbol::from_str("@tutor_moves"))
                .unwrap()
                .as_array()
                .unwrap()
                .iter()
                .for_each(|move_any| {
                    let sym = move_any.as_symbol().unwrap().as_str().unwrap();
                    let move_id = *move_sym_map.get(sym).unwrap();
                    moves
                        .get_mut(&move_id.to_string())
                        .unwrap()
                        .tutor_learners
                        .push(poke_id);
                });
            poke_obj
                .fields
                .get(&RbSymbol::from_str("@egg_moves"))
                .unwrap()
                .as_array()
                .unwrap()
                .iter()
                .for_each(|move_any| {
                    let sym = move_any.as_symbol().unwrap().as_str().unwrap();
                    let move_id = *move_sym_map.get(sym).unwrap();
                    moves
                        .get_mut(&move_id.to_string())
                        .unwrap()
                        .egg_learners
                        .push(poke_id);
                });

            let abilities: Vec<String> = poke_obj.get_field("@abilities");
            let hidden_abilities: Vec<String> = poke_obj.get_field("@hidden_abilities");
            // Parse this pokemon's past and future evolutions
            evolutions.insert(
                key.clone(),
                poke_obj
                    .fields
                    .get(&RbSymbol::from_str("@evolutions"))
                    .unwrap()
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|evo_any| Evolution::from_rb(&poke_sym_map, &evo_any))
                    .collect(),
            );

            let poke = ParsedPokemon {
                head_id: poke_id,
                body_id: poke_id,
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
            pokemon.insert(key, poke);
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

    let mut sorted_pokemon = pokemon.into_values().collect::<Vec<ParsedPokemon>>();
    sorted_pokemon.sort_by(|a, b| {
        if a.head_id == b.head_id {
            return a.body_id.cmp(&b.body_id);
        }
        return a.head_id.cmp(&b.body_id);
    });
    let result_data = ResultFile {
        contains_fusions: export_fusions,
        abilities,
        pokemon_names,
        types,
        pokemon: sorted_pokemon,
        evolutions,
        moves,
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
