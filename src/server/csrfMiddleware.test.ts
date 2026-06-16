/**
 * Unit tests for the CSRF same-origin middleware.
 * Run: npx vitest src/server/csrfMiddleware.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireSameOrigin } from './csrfMiddleware';

const ALLOWED = ['http://localhost:5173'];

function makeReq(overrides: Partial<Request>): Request {
  return { method: 'POST', headers: {}, ...overrides } as unknown as Request;
}

function makeRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('requireSameOrigin', () => {
  it('allows safe methods regardless of origin', () => {
    const middleware = requireSameOrigin(ALLOWED);
    const req = makeReq({ method: 'GET', headers: { origin: 'https://evil.example' } });
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows a POST with a matching Origin header', () => {
    const middleware = requireSameOrigin(ALLOWED);
    const req = makeReq({ headers: { origin: 'http://localhost:5173' } });
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks a POST with a cross-site Origin header', () => {
    const middleware = requireSameOrigin(ALLOWED);
    const req = makeReq({ headers: { origin: 'https://evil.example' } });
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('falls back to the Referer origin when Origin is absent', () => {
    const middleware = requireSameOrigin(ALLOWED);
    const req = makeReq({ headers: { referer: 'https://evil.example/attack-page' } });
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows a POST with neither Origin nor Referer (non-browser client)', () => {
    const middleware = requireSameOrigin(ALLOWED);
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
