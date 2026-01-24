use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;

mod export_data;
mod export_sprites;
mod util;

use crate::export_data::*;
use crate::export_sprites::*;

#[derive(Parser)]
struct Args {
    #[arg(short, long)]
    output_dir: PathBuf,
    #[arg(short, long, value_enum)]
    format: OutputFormat,
    #[arg(long)]
    data_export: bool,
    #[arg(long)]
    abilities_file_path: Option<PathBuf>,
    #[arg(long)]
    species_file_path: Option<PathBuf>,
    #[arg(long)]
    types_file_path: Option<PathBuf>,
    #[arg(long)]
    moves_file_path: Option<PathBuf>,
    #[arg(long)]
    fusions_export: bool,
    #[arg(long)]
    sprites_export: bool,
    #[arg(long)]
    artist_credits_file_path: Option<PathBuf>,
    #[arg(long)]
    fused_sprites_dir_path: Option<PathBuf>,
    #[arg(long)]
    base_sprites_dir_path: Option<PathBuf>,
    #[arg(long)]
    fused_sprites_list_file_path: Option<PathBuf>,
    #[arg(long)]
    base_sprites_list_file_path: Option<PathBuf>,
    #[arg(long)]
    input_sprites_are_split: bool,
    #[arg(long)]
    auto_download_sprites: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    if args.data_export {
        export_data(
            args.abilities_file_path.as_ref().unwrap(),
            args.species_file_path.as_ref().unwrap(),
            args.types_file_path.as_ref().unwrap(),
            args.moves_file_path.as_ref().unwrap(),
            &args.output_dir,
            args.format,
            args.fusions_export,
        )?;
    }

    if args.sprites_export {
        let sprites_list_file_paths = if let Some(fused_sprites_list_file_path) = &args.fused_sprites_list_file_path {
            if let Some(base_sprites_list_file_path) = &args.base_sprites_list_file_path {
                Some((fused_sprites_list_file_path, base_sprites_list_file_path))
            } else {
                None
            }
        } else {
            None
        };
        export_sprites(
            args.input_sprites_are_split,
            args.artist_credits_file_path.as_ref().unwrap(),
            args.fused_sprites_dir_path.as_ref().unwrap(),
            args.base_sprites_dir_path.as_ref().unwrap(),
            &args.output_dir,
            args.format,
            sprites_list_file_paths,
            args.auto_download_sprites,
        )?;
    }

    return Ok(());
}
