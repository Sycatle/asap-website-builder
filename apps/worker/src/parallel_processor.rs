// filepath: apps/worker/src/parallel_processor.rs
//! Parallel event processing for improved throughput
//!
//! Processes multiple events concurrently using tokio::task::JoinSet
//! instead of sequential processing.

use anyhow::Result;
use asap_core_domain::events::Event;
use crate::event_processor::EventProcessor;
use crate::extension_executor::ExtensionExecutorRegistry;
use std::sync::Arc;

/// Configuration for parallel event processing
#[derive(Debug, Clone)]
pub struct ParallelProcessorConfig {
    /// Maximum number of concurrent event processors
    /// Recommended: 2-4x number of CPU cores
    pub max_concurrency: usize,
    
    /// Whether to track detailed metrics
    pub enable_metrics: bool,
}

impl Default for ParallelProcessorConfig {
    fn default() -> Self {
        // Auto-detect CPU count and use 2x for parallelism
        let cpu_count = num_cpus::get();
        Self {
            max_concurrency: (cpu_count * 2).max(4), // At least 4
            enable_metrics: true,
        }
    }
}

/// Statistics from parallel event processing
#[derive(Debug, Clone, Default)]
pub struct ProcessingStats {
    pub total_events: usize,
    pub successful: usize,
    pub failed: usize,
    pub duration_ms: u128,
}

impl ProcessingStats {
    pub fn success_rate(&self) -> f64 {
        if self.total_events == 0 {
            0.0
        } else {
            (self.successful as f64 / self.total_events as f64) * 100.0
        }
    }

    pub fn throughput_events_per_sec(&self) -> f64 {
        if self.duration_ms == 0 {
            0.0
        } else {
            (self.successful as f64 / self.duration_ms as f64) * 1000.0
        }
    }
}

/// Process events in parallel using tokio::task::JoinSet
/// 
/// This replaces the sequential loop with concurrent processing,
/// dramatically improving throughput for I/O-bound operations.
pub async fn process_events_parallel(
    event_processor: Arc<EventProcessor>,
    registry: Arc<ExtensionExecutorRegistry>,
    events: Vec<Event>,
    config: ParallelProcessorConfig,
) -> Result<ProcessingStats> {
    use tokio::task::JoinSet;

    let start = std::time::Instant::now();
    let total_events = events.len();

    if total_events == 0 {
        return Ok(ProcessingStats {
            total_events: 0,
            successful: 0,
            failed: 0,
            duration_ms: 0,
        });
    }

    let mut set = JoinSet::new();
    let mut event_iter = events.into_iter();
    let mut successful = 0;
    let mut failed = 0;

    // Fill initial batch
    for _ in 0..config.max_concurrency.min(total_events) {
        if let Some(event) = event_iter.next() {
            let processor = event_processor.clone();
            let registry = registry.clone();
            
            set.spawn(process_single_event(processor, registry, event));
        }
    }

    // Process results and add new tasks
    while let Some(result) = set.join_next().await {
        if let Ok(task_result) = result {
            if task_result.is_ok() {
                successful += 1;
            } else {
                failed += 1;
            }
        }

        // Spawn next event if available
        if let Some(event) = event_iter.next() {
            let processor = event_processor.clone();
            let registry = registry.clone();
            
            set.spawn(process_single_event(processor, registry, event));
        }
    }

    let stats = ProcessingStats {
        total_events,
        successful,
        failed,
        duration_ms: start.elapsed().as_millis(),
    };

    // Log statistics
    tracing::info!(
        "Parallel processing complete: {} events, {} successful, {} failed in {}ms ({}%)",
        total_events,
        successful,
        failed,
        stats.duration_ms,
        stats.success_rate() as u32
    );

    if config.enable_metrics {
        tracing::info!(
            "Throughput: {:.1} events/sec",
            stats.throughput_events_per_sec()
        );
    }

    Ok(stats)
}

/// Process a single event with proper error handling
async fn process_single_event(
    processor: Arc<EventProcessor>,
    registry: Arc<ExtensionExecutorRegistry>,
    event: Event,
) -> Result<()> {
    tracing::debug!(
        "Processing event {} (type: {:?})",
        event.id,
        event.event_type
    );

    match registry.execute_for_event(&event).await {
        Ok(_) => {
            processor.mark_processed(event.id).await?;
            tracing::debug!("Event {} processed successfully", event.id);
            Ok(())
        }
        Err(e) => {
            tracing::warn!("Error executing event {}: {}", event.id, e);
            processor.mark_failed(event.id, &e.to_string()).await?;
            Err(e)
        }
    }
}

/// Alternative helper for custom concurrency control
/// 
/// This is exported for users who want more fine-grained control
/// over the concurrency limit.
/// 
/// NOTE: Can be used externally for custom parallelism tuning.
#[allow(dead_code)]
pub fn get_optimal_concurrency() -> usize {
    (num_cpus::get() * 2).max(4)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ParallelProcessorConfig::default();
        assert!(config.max_concurrency >= 4);
    }

    #[test]
    fn test_processing_stats_success_rate() {
        let stats = ProcessingStats {
            total_events: 100,
            successful: 95,
            failed: 5,
            duration_ms: 1000,
        };

        assert_eq!(stats.success_rate(), 95.0);
        assert!(stats.throughput_events_per_sec() > 0.0);
    }

    #[test]
    fn test_processing_stats_empty() {
        let stats = ProcessingStats::default();
        assert_eq!(stats.success_rate(), 0.0);
        assert_eq!(stats.throughput_events_per_sec(), 0.0);
    }
}
