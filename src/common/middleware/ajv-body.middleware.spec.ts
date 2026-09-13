import { jest } from '@jest/globals'
import type { Request, Response, NextFunction } from 'express'
import { createAjvMiddleware } from './ajv-body.middleware.js'

const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 0 },
  },
  required: ['email'],
  additionalProperties: false,
}

function buildResponse() {
  const res: Partial<Response> = {}
  res.status = jest.fn().mockReturnValue(res) as unknown as Response['status']
  res.json = jest.fn().mockReturnValue(res) as unknown as Response['json']
  return res as Response
}

describe('createAjvMiddleware', () => {
  it('should call next() when the payload matches the schema', () => {
    const middleware = createAjvMiddleware(schema)
    const next = jest.fn() as unknown as NextFunction
    const res = buildResponse()
    const req = { body: { email: 'a@b.com', age: 20 }, method: 'POST', path: '/x' } as Request

    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should respond with 400 and error details when a required field is missing', () => {
    const middleware = createAjvMiddleware(schema)
    const next = jest.fn() as unknown as NextFunction
    const res = buildResponse()
    const req = { body: {}, method: 'POST', path: '/x' } as Request

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: expect.any(String),
        errors: expect.any(Array),
      }),
    )
  })

  it('should reject payloads with unexpected extra fields', () => {
    const middleware = createAjvMiddleware(schema)
    const next = jest.fn() as unknown as NextFunction
    const res = buildResponse()
    const req = { body: { email: 'a@b.com', hacked: true }, method: 'POST', path: '/x' } as Request

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should reject payloads with the wrong type instead of coercing', () => {
    const middleware = createAjvMiddleware(schema)
    const next = jest.fn() as unknown as NextFunction
    const res = buildResponse()
    const req = { body: { email: 'a@b.com', age: '20' }, method: 'POST', path: '/x' } as Request

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
