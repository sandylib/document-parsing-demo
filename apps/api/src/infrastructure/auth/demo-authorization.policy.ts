import { Injectable } from '@nestjs/common';
import type { AuthorizationPolicy } from '../../application/ports/authorization.port.js';
import type { Visibility } from '../../core/knowledge.types.js';

@Injectable()
export class DemoAuthorizationPolicy implements AuthorizationPolicy {
  roleFrom(value?: string): Visibility {
    return value?.toLowerCase() === 'staff' ? 'staff' : 'public';
  }
}
