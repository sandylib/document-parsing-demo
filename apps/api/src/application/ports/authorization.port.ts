import type { Visibility } from '../../core/knowledge.types.js';
export interface AuthorizationPolicy { roleFrom(value?: string): Visibility }
