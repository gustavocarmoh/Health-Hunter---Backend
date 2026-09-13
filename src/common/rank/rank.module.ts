import { Global, Module } from '@nestjs/common'
import { RankEngineService } from './rank-engine.service.js'
import { RepositoriesModule } from '../../repositories/repositories.module.js'

/**
 * Módulo global de regras de rank.
 *
 * Ao ser `@Global()`, o `RankEngineService` fica disponível em qualquer
 * módulo da aplicação sem precisar importar `RankModule` explicitamente.
 * Basta injetar `RankEngineService` no construtor do serviço desejado.
 */
@Global()
@Module({
  imports: [RepositoriesModule],
  providers: [RankEngineService],
  exports: [RankEngineService],
})
export class RankModule {}
