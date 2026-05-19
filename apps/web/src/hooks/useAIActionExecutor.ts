import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useUpdateElementMutation, 
  useCreateElementMutation,
  useDeleteElementMutation,
  useReorderElementsMutation,
  useUpdateWebsiteDataMutation,
  queryKeys 
} from '@/lib/query';
import type { AIAction } from '@/lib/api/ai';
import { executeAIAction } from '@/lib/api/ai';
import type { WebsiteElement, CreateElementRequest, UpdateElementRequest } from '@/lib/types';
import type { WebsiteData } from '@/lib/types';
import { useSectionCodeProposalStore } from '@/lib/store/sectionCodeProposalStore';
import { emitStudioEvent } from '@/lib/events/studio-events';

// ============================================================================
// Types
// ============================================================================

export interface ActionExecutionResult {
  success: boolean;
  action: AIAction;
  error?: string;
}

export interface UseAIActionExecutorOptions {
  websiteId: string;
  /** Use backend API for execution (default: false, uses client-side mutations) */
  useBackend?: boolean;
  /** Use optimistic updates for instant UI feedback (default: true) */
  optimistic?: boolean;
  onActionExecuted?: (result: ActionExecutionResult) => void;
  onError?: (error: Error, action: AIAction) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to execute AI actions on a website
 * Maps AI action types to the appropriate mutations
 * Can use either client-side mutations or backend API
 * Supports optimistic updates for instant UI feedback
 */
export function useAIActionExecutor(options: UseAIActionExecutorOptions) {
  const { websiteId, useBackend = false, optimistic = true, onActionExecuted, onError } = options;
  const [isExecuting, setIsExecuting] = useState(false);
  
  const queryClient = useQueryClient();
  const updateElementMutation = useUpdateElementMutation();
  const createElementMutation = useCreateElementMutation();
  const deleteElementMutation = useDeleteElementMutation();
  const reorderElementsMutation = useReorderElementsMutation();
  const updateWebsiteDataMutation = useUpdateWebsiteDataMutation();
  
  /**
   * Apply optimistic update to cache (instant UI feedback)
   * Returns a rollback function to undo the change if API fails
   */
  const applyOptimisticUpdate = useCallback((action: AIAction): (() => void) | null => {
    const elementsKey = queryKeys.elements.list(websiteId);
    const previousElements = queryClient.getQueryData<WebsiteElement[]>(elementsKey);
    
    if (!previousElements) return null;

    const normalizedType = action.type ? action.type.toLowerCase() : action.type;
    switch (normalizedType) {
      case 'update_section_property':
      case 'update_section':
      case 'update_property': {
        if (!action.section_id) return null;
        
        // Optimistically update the element in cache
        queryClient.setQueryData<WebsiteElement[]>(elementsKey, (old) => {
          if (!old) return old;
          return old.map(el => {
            if (el.id !== action.section_id) return el;
            
            // Apply property update
            if (action.property && action.value !== undefined) {
              const parts = action.property.split('.');
              if (parts[0] === 'settings') {
                return {
                  ...el,
                  settings: setNestedValue(el.settings || {}, parts.slice(1), action.value),
                };
              } else if (parts[0] === 'data') {
                return {
                  ...el,
                  data: setNestedValue(el.data || {}, parts.slice(1), action.value),
                };
              }
            }
            
            // Apply bulk changes
            if (action.changes) {
              return { ...el, ...action.changes };
            }
            
            return el;
          });
        });
        
        // Return rollback function
        return () => {
          queryClient.setQueryData<WebsiteElement[]>(elementsKey, previousElements);
        };
      }
      
      case 'add_section': {
        if (!action.section_type) return null;
        
        const maxOrder = Math.max(0, ...previousElements.map(e => e.order));
        const tempId = `temp-${Date.now()}`;
        
        // Optimistically add element
        queryClient.setQueryData<WebsiteElement[]>(elementsKey, (old) => {
          if (!old) return old;
          return [...old, {
            id: tempId,
            website_id: websiteId,
            element_type: action.section_type!,
            slug: generateSlug(action.section_type!),
            title: action.section_type!.charAt(0).toUpperCase() + action.section_type!.slice(1),
            order: action.position ?? maxOrder + 1,
            layout: action.variant || 'default',
            settings: action.properties as Record<string, unknown> || {},
            data: {},
            visible: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as WebsiteElement];
        });
        
        return () => {
          queryClient.setQueryData<WebsiteElement[]>(elementsKey, previousElements);
        };
      }
      
      case 'remove_section': {
        if (!action.section_id) return null;
        
        // Optimistically remove element
        queryClient.setQueryData<WebsiteElement[]>(elementsKey, (old) => {
          if (!old) return old;
          return old.filter(el => el.id !== action.section_id);
        });
        
        return () => {
          queryClient.setQueryData<WebsiteElement[]>(elementsKey, previousElements);
        };
      }
      
      default:
        return null;
    }
  }, [websiteId, queryClient]);
  
  /**
   * Execute via backend API
   */
  const executeViaBackend = useCallback(async (action: AIAction): Promise<ActionExecutionResult> => {
    try {
      const response = await executeAIAction({
        website_id: websiteId,
        action,
      });
      
      if (response.success) {
        // Invalidate relevant queries to refresh UI
        await queryClient.invalidateQueries({ queryKey: queryKeys.elements.list(websiteId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.websites.detail(websiteId) });
        
        return { success: true, action };
      } else {
        return { 
          success: false, 
          action, 
          error: response.error || response.message 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backend execution failed';
      return { success: false, action, error: errorMessage };
    }
  }, [websiteId, queryClient]);
  
  /**
   * Execute a single AI action
   * With optimistic updates, the UI is updated immediately before the API call
   * If the API fails, the change is rolled back
   */
  const executeAction = useCallback(async (action: AIAction): Promise<ActionExecutionResult> => {
    setIsExecuting(true);
    
    // OPTIMISTIC UPDATE: Apply change immediately for instant feedback
    let rollback: (() => void) | null = null;
    if (optimistic) {
      rollback = applyOptimisticUpdate(action);
    }
    
    try {
      let result: ActionExecutionResult;
      
      // Use backend API if enabled
      if (useBackend) {
        result = await executeViaBackend(action);
      } else {
        // Use client-side mutations
        result = await executeClientSide(action);
      }
      
      // If API failed and we did optimistic update, rollback
      if (!result.success && rollback) {
        rollback();
      }
      
      // Call callback
      onActionExecuted?.(result);
      
      if (!result.success && result.error) {
        onError?.(new Error(result.error), action);
      }
      
      return result;
    } catch (error) {
      // Rollback optimistic update on error
      if (rollback) {
        rollback();
      }
      
      const errorResult: ActionExecutionResult = {
        success: false,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      onActionExecuted?.(errorResult);
      onError?.(error instanceof Error ? error : new Error('Unknown error'), action);
      return errorResult;
    } finally {
      setIsExecuting(false);
    }
  }, [useBackend, optimistic, applyOptimisticUpdate, executeViaBackend, onActionExecuted, onError]);
  
  /**
   * Execute via client-side mutations (original implementation)
   */
  const executeClientSide = useCallback(async (action: AIAction): Promise<ActionExecutionResult> => {
    // Rust orchestrator emits SCREAMING_SNAKE_CASE (`PROPOSE_SECTION_CODE`)
    // while older provider-side handlers emit lowercase (`update_section`).
    // Normalize once so the switch matches either shape.
    const normalizedType = action.type ? action.type.toLowerCase() : action.type;
    try {
      switch (normalizedType) {
      // ===== Section/Element Actions =====

        case 'update_section_property':
        case 'update_section':
        case 'update_property': {
          if (!action.section_id) {
            throw new Error('section_id is required for update_section action');
          }
          
          const updateData: UpdateElementRequest = {};
          
          // Handle property updates
          if (action.property && action.value !== undefined) {
            // Property path like "settings.title" or "data.hero.headline"
            const parts = action.property.split('.');
            
            if (parts[0] === 'settings' && parts.length > 1) {
              // Get current element to merge settings
              const elements = queryClient.getQueryData<WebsiteElement[]>(
                queryKeys.elements.list(websiteId)
              );
              const element = elements?.find(e => e.id === action.section_id);
              const currentSettings = element?.settings || {};
              
              updateData.settings = setNestedValue(
                currentSettings,
                parts.slice(1),
                action.value
              );
            } else if (parts[0] === 'data' && parts.length > 1) {
              // Get current element to merge data
              const elements = queryClient.getQueryData<WebsiteElement[]>(
                queryKeys.elements.list(websiteId)
              );
              const element = elements?.find(e => e.id === action.section_id);
              const currentData = element?.data || {};
              
              updateData.data = setNestedValue(
                currentData,
                parts.slice(1),
                action.value
              );
            } else if (parts[0] === 'title') {
              updateData.title = action.value as string;
            } else if (parts[0] === 'layout') {
              updateData.layout = action.value as string;
            } else if (parts[0] === 'visible') {
              updateData.visible = action.value as boolean;
            }
          }
          
          // Handle bulk property changes
          if (action.changes) {
            Object.assign(updateData, action.changes);
          }
          
          await updateElementMutation.mutateAsync({
            websiteId,
            elementId: action.section_id,
            data: updateData,
          });
          
          return { success: true, action };
        }
        
        case 'add_section': {
          if (!action.section_type) {
            throw new Error('section_type is required for add_section action');
          }
          
          // Get current elements to determine order
          const elements = queryClient.getQueryData<WebsiteElement[]>(
            queryKeys.elements.list(websiteId)
          ) || [];
          
          const maxOrder = Math.max(0, ...elements.map(e => e.order));
          const newOrder = action.position ?? maxOrder + 1;
          
          const createData: CreateElementRequest = {
            element_type: action.section_type,
            slug: generateSlug(action.section_type),
            title: action.section_type.charAt(0).toUpperCase() + action.section_type.slice(1),
            order: newOrder,
            layout: action.variant || 'default',
            settings: action.properties as Record<string, unknown> || {},
            visible: true,
          };
          
          await createElementMutation.mutateAsync({
            websiteId,
            data: createData,
          });
          
          return { success: true, action };
        }
        
        case 'remove_section': {
          if (!action.section_id) {
            throw new Error('section_id is required for remove_section action');
          }
          
          await deleteElementMutation.mutateAsync({
            websiteId,
            elementId: action.section_id,
          });
          
          return { success: true, action };
        }
        
        case 'reorder_sections': {
          if (!action.order || !Array.isArray(action.order)) {
            throw new Error('order array is required for reorder_sections action');
          }
          
          await reorderElementsMutation.mutateAsync({
            websiteId,
            elementIds: action.order,
          });
          
          return { success: true, action };
        }
        
        case 'duplicate_section': {
          if (!action.section_id) {
            throw new Error('section_id is required for duplicate_section action');
          }
          
          // Get source element
          const elements = queryClient.getQueryData<WebsiteElement[]>(
            queryKeys.elements.list(websiteId)
          ) || [];
          const sourceElement = elements.find(e => e.id === action.section_id);
          
          if (!sourceElement) {
            throw new Error(`Source element ${action.section_id} not found`);
          }
          
          const maxOrder = Math.max(0, ...elements.map(e => e.order));
          
          const createData: CreateElementRequest = {
            element_type: sourceElement.element_type,
            slug: generateSlug(sourceElement.element_type),
            title: `${sourceElement.title} (copy)`,
            order: maxOrder + 1,
            layout: sourceElement.layout || 'default',
            settings: { ...sourceElement.settings },
            visible: sourceElement.visible,
          };
          
          await createElementMutation.mutateAsync({
            websiteId,
            data: createData,
          });
          
          return { success: true, action };
        }
        
        // ===== Website-Level Actions =====
        
        case 'update_theme':
        case 'update_metadata': {
          // These modify website_data
          if (action.changes) {
            await updateWebsiteDataMutation.mutateAsync({
              id: websiteId,
              data: action.changes as WebsiteData,
            });
          }
          
          return { success: true, action };
        }
        
        // ===== AI-proposed section code =====

        case 'propose_section_code': {
          // Proposals are never auto-applied: drop the source into the
          // per-section store so the Code tab pre-fills its editor. The
          // user reviews + clicks "Compile & sauvegarder" to persist.
          if (!action.section_id || !action.source_code) {
            return {
              success: false,
              action,
              error: 'section_id and source_code required for propose_section_code',
            };
          }
          useSectionCodeProposalStore
            .getState()
            .propose(action.section_id, action.source_code);
          // Tell the studio shell to select this section + jump to the Code
          // tab so the proposal is immediately visible.
          emitStudioEvent({
            kind: 'select-section',
            sectionId: action.section_id,
            tab: 'code',
          });
          return { success: true, action };
        }

        // ===== Content Generation Actions =====

        case 'generate_content': {
          // Content generation typically needs to update a specific section
          if (!action.target_section_id || !action.target_property) {
            throw new Error('target_section_id and target_property required for generate_content');
          }
          
          // The AI should have already generated the content in action.value
          // This action just applies it
          const updateData: UpdateElementRequest = {};
          const parts = action.target_property.split('.');
          
          if (parts[0] === 'data') {
            const elements = queryClient.getQueryData<WebsiteElement[]>(
              queryKeys.elements.list(websiteId)
            );
            const element = elements?.find(e => e.id === action.target_section_id);
            const currentData = element?.data || {};
            
            updateData.data = setNestedValue(
              currentData,
              parts.slice(1),
              action.value
            );
          }
          
          await updateElementMutation.mutateAsync({
            websiteId,
            elementId: action.target_section_id,
            data: updateData,
          });
          
          return { success: true, action };
        }
        
        default:
          console.warn(`Unknown AI action type: ${action.type}`);
          return { 
            success: false, 
            action, 
            error: `Unknown action type: ${action.type}` 
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error executing AI action ${action.type}:`, error);
      onError?.(error instanceof Error ? error : new Error(errorMessage), action);
      return { success: false, action, error: errorMessage };
    }
  }, [
    websiteId, 
    queryClient, 
    updateElementMutation, 
    createElementMutation, 
    deleteElementMutation, 
    reorderElementsMutation, 
    updateWebsiteDataMutation,
    onError,
  ]);
  
  /**
   * Execute multiple AI actions in sequence
   */
  const executeActions = useCallback(async (actions: AIAction[]): Promise<ActionExecutionResult[]> => {
    const results: ActionExecutionResult[] = [];
    
    for (const action of actions) {
      const result = await executeAction(action);
      results.push(result);
      onActionExecuted?.(result);
      
      // Stop on first error (optional - could make this configurable)
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }, [executeAction, onActionExecuted]);
  
  return {
    executeAction,
    executeActions,
    isExecuting,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Set a nested value in an object using a path array
 */
function setNestedValue(
  obj: Record<string, unknown>, 
  path: string[], 
  value: unknown
): Record<string, unknown> {
  const result = { ...obj };
  let current: Record<string, unknown> = result;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    current[key] = { ...(current[key] as Record<string, unknown> || {}) };
    current = current[key] as Record<string, unknown>;
  }
  
  current[path[path.length - 1]] = value;
  return result;
}

/**
 * Generate a unique slug for a new element
 */
function generateSlug(elementType: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${elementType}-${timestamp}-${random}`;
}
