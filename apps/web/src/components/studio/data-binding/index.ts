/**
 * Data Binding Components
 * 
 * Components for connecting Studio sections to Collections and Variables.
 */

// Context & Provider
export { 
  StudioDataProvider,
  useStudioData,
  useStudioCollections,
  useStudioVariables,
  type StudioDataContextValue,
  type StudioDataProviderProps,
} from './StudioDataContext';

// Components
export { VariablePicker, type VariablePickerProps } from './VariablePicker';
export { 
  CollectionSelector, 
  CollectionCard,
  type CollectionSelectorProps,
  type CollectionCardProps,
} from './CollectionSelector';
export { 
  DataSourceEditor, 
  type DataSourceEditorProps 
} from './DataSourceEditor';
export { 
  CollectionPreview,
  type CollectionPreviewProps,
} from './CollectionPreview';
export {
  VariableInput,
  type VariableInputProps,
} from './VariableInput';
export {
  SmartVariableInput,
  SmartInput,
  SmartTextarea,
  type SmartVariableInputProps,
} from './SmartVariableInput';
export {
  PropertyInput,
  PropertyTextArea,
  type PropertyFieldProps,
  type PropertyTextAreaProps,
} from './PropertyFields';
export {
  ExtensionDataPanel,
  type ExtensionDataPanelProps,
} from './ExtensionDataPanel';
