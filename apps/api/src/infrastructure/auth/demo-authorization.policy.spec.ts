import { describe, expect, it } from 'vitest';
import { DemoAuthorizationPolicy } from './demo-authorization.policy.js';

describe('DemoAuthorizationPolicy', () => {
  const policy = new DemoAuthorizationPolicy();
  it('defaults all untrusted values to public', () => {
    expect(policy.roleFrom()).toBe('public');
    expect(policy.roleFrom('administrator')).toBe('public');
  });
  it('accepts the trusted demo staff value', () => expect(policy.roleFrom('staff')).toBe('staff'));
});
