//! Filter, sort, and aggregate primitives over collection items.

use asap_core_domain::{CollectionItem, ComputeOperation, FilterClause, VariableComputation};
use sqlx::PgPool;
use uuid::Uuid;

pub(super) fn apply_filters(
    items: Vec<CollectionItem>,
    filters: &[FilterClause],
) -> Vec<CollectionItem> {
    items
        .into_iter()
        .filter(|item| {
            filters.iter().all(|f| {
                let field_value = item.data.get(&f.field);
                match (&f.operator, field_value) {
                    (asap_core_domain::FilterOperator::Eq, Some(v)) => v == &f.value,
                    (asap_core_domain::FilterOperator::Neq, Some(v)) => v != &f.value,
                    (asap_core_domain::FilterOperator::Gt, Some(v)) => {
                        compare_json(v, &f.value) == Some(std::cmp::Ordering::Greater)
                    }
                    (asap_core_domain::FilterOperator::Gte, Some(v)) => {
                        matches!(
                            compare_json(v, &f.value),
                            Some(std::cmp::Ordering::Greater | std::cmp::Ordering::Equal)
                        )
                    }
                    (asap_core_domain::FilterOperator::Lt, Some(v)) => {
                        compare_json(v, &f.value) == Some(std::cmp::Ordering::Less)
                    }
                    (asap_core_domain::FilterOperator::Lte, Some(v)) => {
                        matches!(
                            compare_json(v, &f.value),
                            Some(std::cmp::Ordering::Less | std::cmp::Ordering::Equal)
                        )
                    }
                    (asap_core_domain::FilterOperator::Contains, Some(v)) => {
                        if let (Some(s), Some(pattern)) = (v.as_str(), f.value.as_str()) {
                            s.to_lowercase().contains(&pattern.to_lowercase())
                        } else {
                            false
                        }
                    }
                    (asap_core_domain::FilterOperator::Exists, _) => field_value.is_some(),
                    (asap_core_domain::FilterOperator::NotExists, _) => field_value.is_none(),
                    _ => false,
                }
            })
        })
        .collect()
}

pub(super) fn apply_sort(mut items: Vec<CollectionItem>, sort_str: &str) -> Vec<CollectionItem> {
    let (field, desc) = if let Some(stripped) = sort_str.strip_prefix('-') {
        (stripped, true)
    } else {
        (sort_str, false)
    };

    items.sort_by(|a, b| {
        let a_val = a.data.get(field);
        let b_val = b.data.get(field);
        let ordering = match (a_val, b_val) {
            (Some(a), Some(b)) => compare_json(a, b).unwrap_or(std::cmp::Ordering::Equal),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        };
        if desc {
            ordering.reverse()
        } else {
            ordering
        }
    });

    items
}

fn compare_json(a: &serde_json::Value, b: &serde_json::Value) -> Option<std::cmp::Ordering> {
    match (a, b) {
        (serde_json::Value::Number(a), serde_json::Value::Number(b)) => {
            a.as_f64().partial_cmp(&b.as_f64())
        }
        (serde_json::Value::String(a), serde_json::Value::String(b)) => Some(a.cmp(b)),
        (serde_json::Value::Bool(a), serde_json::Value::Bool(b)) => Some(a.cmp(b)),
        _ => None,
    }
}

/// Recompute a single computed variable's value against the live collection.
pub(super) async fn compute_variable(
    pool: &PgPool,
    website_id: Uuid,
    computation: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let comp: VariableComputation =
        serde_json::from_value(computation).map_err(|e| format!("Invalid computation: {}", e))?;

    let collection = sqlx::query!(
        r#"SELECT items FROM website_collections WHERE website_id = $1 AND collection_slug = $2"#,
        website_id,
        comp.collection
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?
    .ok_or_else(|| format!("Collection not found: {}", comp.collection))?;

    let mut items: Vec<CollectionItem> = serde_json::from_value(collection.items)
        .map_err(|e| format!("Failed to parse items: {}", e))?;

    if let Some(filters) = &comp.filter {
        items = apply_filters(items, filters);
    }

    if let Some(sort) = &comp.sort {
        let sort_str = if sort.order == asap_core_domain::SortOrder::Desc {
            format!("-{}", sort.field)
        } else {
            sort.field.clone()
        };
        items = apply_sort(items, &sort_str);
    }

    let result = match comp.operation {
        ComputeOperation::Count => serde_json::Value::Number(items.len().into()),
        ComputeOperation::Sum => {
            let field = comp.field.as_ref().ok_or("Field required for sum")?;
            let sum: f64 = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .sum();
            serde_json::json!(sum)
        }
        ComputeOperation::Avg => {
            let field = comp.field.as_ref().ok_or("Field required for avg")?;
            let values: Vec<f64> = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .collect();
            if values.is_empty() {
                serde_json::Value::Null
            } else {
                let avg = values.iter().sum::<f64>() / values.len() as f64;
                serde_json::json!(avg)
            }
        }
        ComputeOperation::Min => {
            let field = comp.field.as_ref().ok_or("Field required for min")?;
            let min = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .fold(f64::INFINITY, f64::min);
            if min.is_infinite() {
                serde_json::Value::Null
            } else {
                serde_json::json!(min)
            }
        }
        ComputeOperation::Max => {
            let field = comp.field.as_ref().ok_or("Field required for max")?;
            let max = items
                .iter()
                .filter_map(|item| item.data.get(field)?.as_f64())
                .fold(f64::NEG_INFINITY, f64::max);
            if max.is_infinite() {
                serde_json::Value::Null
            } else {
                serde_json::json!(max)
            }
        }
        ComputeOperation::First => {
            let field = comp.field.as_ref().ok_or("Field required for first")?;
            items
                .first()
                .and_then(|item| item.data.get(field).cloned())
                .unwrap_or(serde_json::Value::Null)
        }
        ComputeOperation::Last => {
            let field = comp.field.as_ref().ok_or("Field required for last")?;
            items
                .last()
                .and_then(|item| item.data.get(field).cloned())
                .unwrap_or(serde_json::Value::Null)
        }
        ComputeOperation::Mode => {
            let field = comp.field.as_ref().ok_or("Field required for mode")?;
            let mut counts = std::collections::HashMap::new();
            for item in &items {
                if let Some(value) = item.data.get(field) {
                    let key = value.to_string();
                    *counts.entry(key).or_insert(0) += 1;
                }
            }
            counts
                .into_iter()
                .max_by_key(|(_, count)| *count)
                .map(|(value, _)| {
                    serde_json::from_str(&value).unwrap_or(serde_json::Value::String(value))
                })
                .unwrap_or(serde_json::Value::Null)
        }
    };

    Ok(result)
}
