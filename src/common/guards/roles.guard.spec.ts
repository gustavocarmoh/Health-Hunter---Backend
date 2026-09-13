import { jest } from '@jest/globals'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard.js'
import { Role } from '../enums/role.enum.js'

function buildContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext
}

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: { getAllAndOverride: jest.Mock<(...args: unknown[]) => unknown> }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    guard = new RolesGuard(reflector as unknown as Reflector)
  })

  it('should allow access when the route has no roles requirement', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)

    expect(guard.canActivate(buildContext({ role: Role.USER }))).toBe(true)
  })

  it('should allow access when the required roles array is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([])

    expect(guard.canActivate(buildContext({ role: Role.USER }))).toBe(true)
  })

  it('should allow access when the user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN])

    expect(guard.canActivate(buildContext({ role: Role.ADMIN }))).toBe(true)
  })

  it('should throw ForbiddenException when the user lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN])

    expect(() => guard.canActivate(buildContext({ role: Role.USER }))).toThrow(ForbiddenException)
  })

  it('should throw ForbiddenException when there is no user on the request', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN])

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException)
  })
})
