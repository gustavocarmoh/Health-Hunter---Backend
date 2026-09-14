import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

// LGPD retenção 90 dias: coordenadas_gps e bpm_medio precisam poder virar NULL
// no expurgo, mantendo os campos não sensíveis intactos. Ver SchedulerService.purgeSensitiveActivityData.
export class MakeActivitySensitiveFieldsNullable1789500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'activity_logs',
      'coordenadas_gps',
      new TableColumn({
        name: 'coordenadas_gps',
        type: 'jsonb',
        isNullable: true,
      }),
    )

    await queryRunner.changeColumn(
      'activity_logs',
      'bpm_medio',
      new TableColumn({
        name: 'bpm_medio',
        type: 'int',
        isNullable: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'activity_logs',
      'bpm_medio',
      new TableColumn({
        name: 'bpm_medio',
        type: 'int',
        isNullable: false,
      }),
    )

    await queryRunner.changeColumn(
      'activity_logs',
      'coordenadas_gps',
      new TableColumn({
        name: 'coordenadas_gps',
        type: 'jsonb',
        isNullable: false,
      }),
    )
  }
}
