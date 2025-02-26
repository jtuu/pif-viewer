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
    input_dir: PathBuf,
    #[arg(short, long)]
    output_dir: PathBuf,
    #[arg(short, long, value_enum)]
    format: OutputFormat,
    #[arg(long)]
    data_export: bool,
    #[arg(long)]
    fusions_export: bool,
    #[arg(long)]
    sprites_export: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    let data_dir = args.input_dir.join("Data");
    let graphics_dir = args.input_dir.join("Graphics");

    if args.data_export {
        export_data(
            &data_dir,
            &args.output_dir,
            args.format,
            args.fusions_export,
        )?;
    }

    if args.sprites_export {
        export_sprites(&data_dir, &graphics_dir, &args.output_dir, args.format)?;
    }

    return Ok(());
}
