import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddExternalIdForFlow1735262417593 implements MigrationInterface {
    name = 'AddExternalIdForFlow1735262417593'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "flow"
            ADD "externalId" character varying
        `)

        const hasGitRepoTable = await queryRunner.hasTable('git_repo')
        if (hasGitRepoTable) {
            // Get all git repos with their mappings
            const gitRepos = await queryRunner.query(`
                SELECT id, mapping FROM git_repo WHERE mapping IS NOT NULL
            `)

            // Iterate through git repos and update flow external IDs
            for (const repo of gitRepos) {
                if (!repo.mapping) {
                    continue
                }
                const mapping = repo.mapping
                for (const [key, value] of Object.entries(mapping)) {
                    const sourceId = (value as { sourceId: string })?.sourceId
                    if (!sourceId) {
                        continue
                    }
                    await queryRunner.query(`
                            UPDATE "flow"
                            SET "externalId" = $1
                            WHERE "id" = $2
                        `, [sourceId, key])
                }
            }
        }

        await queryRunner.query(`
                ALTER TABLE "git_repo" DROP COLUMN "mapping"
            `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "flow" DROP COLUMN "externalId"
        `)
        await queryRunner.query(`
            ALTER TABLE "git_repo"
            ADD "mapping" jsonb
        `)
    }
}