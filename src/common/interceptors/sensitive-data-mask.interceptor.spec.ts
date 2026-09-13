import { jest } from '@jest/globals'
import { ExecutionContext, CallHandler } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { of } from 'rxjs'
import { SensitiveDataMaskInterceptor } from './sensitive-data-mask.interceptor.js'

function buildContext(body: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ body, method: 'POST', url: '/auth/login' }),
    }),
  } as unknown as ExecutionContext
}

function buildHandler(): CallHandler {
  return { handle: () => of({ ok: true }) }
}

describe('SensitiveDataMaskInterceptor', () => {
  let interceptor: SensitiveDataMaskInterceptor
  let reflector: { getAllAndOverride: jest.Mock<(...args: unknown[]) => unknown> }
  let logSpy: jest.SpiedFunction<typeof console.log>

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue([]) }
    interceptor = new SensitiveDataMaskInterceptor(reflector as unknown as Reflector)
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('should mask default sensitive fields before logging', (done) => {
    const context = buildContext({ email: 'a@b.com', password: 'secret123' })

    interceptor.intercept(context, buildHandler()).subscribe(() => {
      const logged = logSpy.mock.calls[0]?.[1] as string
      expect(logged).toContain('"email":"a@b.com"')
      expect(logged).toContain('"password":"***"')
      done()
    })
  })

  it('should mask extra fields declared via @SensitiveFields', (done) => {
    reflector.getAllAndOverride.mockReturnValue(['coordenadas_gps'])
    const context = buildContext({ coordenadas_gps: { latitude: 1, longitude: 2 } })

    interceptor.intercept(context, buildHandler()).subscribe(() => {
      const logged = logSpy.mock.calls[0]?.[1] as string
      expect(logged).toContain('"coordenadas_gps":"[HIDDEN]"')
      done()
    })
  })

  it('should recursively mask nested objects', (done) => {
    const context = buildContext({ user: { password_hash: 'abc', name: 'Jin' } })

    interceptor.intercept(context, buildHandler()).subscribe(() => {
      const logged = logSpy.mock.calls[0]?.[1] as string
      expect(logged).toContain('"password_hash":"***"')
      expect(logged).toContain('"name":"Jin"')
      done()
    })
  })

  it('should not log when the request body is empty', (done) => {
    const context = buildContext(undefined)

    interceptor.intercept(context, buildHandler()).subscribe(() => {
      expect(logSpy).not.toHaveBeenCalled()
      done()
    })
  })

  it('should pass through the handler response unchanged', (done) => {
    const context = buildContext({})

    interceptor.intercept(context, buildHandler()).subscribe((result) => {
      expect(result).toEqual({ ok: true })
      done()
    })
  })
})
