use anyhow::{Context, Result};
use serde::Serialize;
use std::{io::Write, path::PathBuf};
use thurgood::{
    rc::{RbAny, RbObject, RbSymbol},
    RbType,
};

pub fn read_ruby_file(path: &PathBuf) -> Result<RbAny> {
    let bytes =
        std::fs::read(path).with_context(|| format!("Failed to read file '{}'", path.display()))?;
    return thurgood::rc::from_reader(bytes.as_slice())
        .with_context(|| format!("Failed to parse ruby file '{}'", path.display()));
}

pub fn write_output_file(path: &PathBuf, serialized: &[u8]) -> Result<()> {
    let mut file = std::fs::File::create(path)
        .with_context(|| format!("Failed to create file '{}'", path.display()))?;
    return file
        .write_all(serialized)
        .with_context(|| format!("Failed to write file '{}'", path.display()));
}

pub fn write_json_file<T: ?Sized + Serialize>(path: &PathBuf, data: &T) -> Result<()> {
    let serialized = serde_json::to_vec(data)
        .with_context(|| format!("Failed to serialize file '{}'", path.display()))?;
    return write_output_file(path, &serialized);
}

pub fn write_binary_file<T: Sized + Serialize>(path: &PathBuf, data: &T) -> Result<()> {
    let serialized = rmp_serde::to_vec_named(data)
        .with_context(|| format!("Failed to serialize file '{}'", path.display()))?;
    return write_output_file(path, &serialized);
}

pub struct MyRbAny(RbAny);

impl From<MyRbAny> for i32 {
    fn from(item: MyRbAny) -> Self {
        return item.0.as_int().unwrap();
    }
}

impl From<MyRbAny> for u32 {
    fn from(item: MyRbAny) -> Self {
        return item.0.as_int().unwrap().try_into().unwrap();
    }
}

impl From<MyRbAny> for usize {
    fn from(item: MyRbAny) -> Self {
        return item.0.as_int().unwrap().try_into().unwrap();
    }
}

impl From<MyRbAny> for String {
    fn from(item: MyRbAny) -> Self {
        return match item.0.get_type() {
            RbType::Str => item.0.as_string().unwrap().to_owned(),
            RbType::Symbol => item.0.as_symbol().unwrap().as_str().unwrap().to_string(),
            _ => panic!("Type can't be converted into string"),
        };
    }
}

impl<T: From<MyRbAny>> From<MyRbAny> for Vec<T> {
    fn from(item: MyRbAny) -> Self {
        return item
            .0
            .as_array()
            .unwrap()
            .iter()
            .map(|v| MyRbAny(v.clone()).into())
            .collect();
    }
}

pub trait RbObjectUtil {
    fn get_field<T: From<MyRbAny>>(&self, field: &str) -> T;
}

impl RbObjectUtil for RbObject {
    fn get_field<T: From<MyRbAny>>(&self, field: &str) -> T {
        let val_any = self.fields.get(&RbSymbol::from_str(field)).unwrap();
        return MyRbAny(val_any.clone()).into();
    }
}
