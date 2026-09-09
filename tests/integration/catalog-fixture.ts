import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export async function createCatalogFixture(db: PrismaClient, label: string) {
  const suffix = randomUUID().slice(0, 8);
  const ip = await db.iP.create({ data: { name: `${label} IP ${suffix}` } });
  const character = await db.character.create({
    data: { ipId: ip.id, name: `${label} 角色 ${suffix}` },
  });
  const series = await db.series.create({
    data: { characterId: character.id, name: `${label} 系列 ${suffix}` },
  });
  return { ip, character, series };
}

export async function deleteCatalogFixture(
  db: PrismaClient,
  fixture: Awaited<ReturnType<typeof createCatalogFixture>>,
) {
  await db.series.deleteMany({ where: { id: fixture.series.id } });
  await db.character.deleteMany({ where: { id: fixture.character.id } });
  await db.iP.deleteMany({ where: { id: fixture.ip.id } });
}
