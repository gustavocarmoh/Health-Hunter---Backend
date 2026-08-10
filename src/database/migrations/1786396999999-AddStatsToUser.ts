import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm'

export class AddStatsToUser1786396999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'stat_points_available',
        type: 'int',
        default: 0,
      }),
    )

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'strength',
        type: 'int',
        default: 0,
      }),
    )

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'intel',
        type: 'int',
        default: 0,
      }),
    )

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'vitality',
        type: 'int',
        default: 0,
      }),
    )

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'sense',
        type: 'int',
        default: 0,
      }),
    )

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'agility',
        type: 'int',
        default: 0,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'stat_points_available')
    await queryRunner.dropColumn('users', 'strength')
    await queryRunner.dropColumn('users', 'intel')
    await queryRunner.dropColumn('users', 'vitality')
    await queryRunner.dropColumn('users', 'sense')
    await queryRunner.dropColumn('users', 'agility')
  }
}
