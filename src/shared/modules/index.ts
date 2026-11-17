export { IModuleManifest, IModuleRoute } from '@shared/modules/IModuleManifest';
export { defineModule } from '@shared/modules/defineModule';
export {
  ModuleLoadError,
  buildModulesRouter,
  describeModules,
  loadModules,
  resetModulesCache,
  resolveSelection,
} from '@shared/modules/ModuleRegistry';
