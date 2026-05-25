import { Prisma } from '@prisma/client'

// ─── Business Rules ───────────────────────────────────────────────────────────

/**
 * Mandatory providers that MUST receive every lead for a given service.
 * Key = serviceId (1-indexed), Value = array of provider IDs
 */
const MANDATORY_RULES: Record<number, number[]> = {
  1: [1],       // Service 1 → Provider 1
  2: [5],       // Service 2 → Provider 5
  3: [1, 4],    // Service 3 → Provider 1 AND Provider 4
}

/**
 * Fair allocation pool for each service.
 * Remaining slots (after mandatory) are filled round-robin from this pool.
 */
const FAIR_POOLS: Record<number, number[]> = {
  1: [2, 3, 4],
  2: [6, 7, 8],
  3: [2, 3, 5, 6, 7, 8],
}

const TOTAL_PROVIDERS_PER_LEAD = 3

// ─── Main Allocation Function ─────────────────────────────────────────────────

/**
 * Assigns exactly 3 providers to a lead using:
 * 1. Mandatory providers first (if they have quota)
 * 2. Fair round-robin from the service pool for remaining slots
 *
 * Uses SELECT FOR UPDATE to prevent race conditions under concurrency.
 * Must be called inside a Prisma transaction.
 */
export async function assignProviders(
  tx: Prisma.TransactionClient,
  leadId: number,
  serviceId: number
): Promise<number[]> {
  // ── Step 1: Lock the allocation state row to prevent concurrent modification ──
  // This is a pessimistic lock — concurrent requests will wait here
  await tx.$executeRaw`
    SELECT id FROM "AllocationState" WHERE "serviceId" = ${serviceId} FOR UPDATE
  `

  const state = await tx.allocationState.findUnique({
    where: { serviceId },
  })

  if (!state) {
    throw new Error(`Allocation state not found for serviceId ${serviceId}`)
  }

  // ── Step 2: Resolve mandatory providers (check quota) ──
  const mandatoryIds = MANDATORY_RULES[serviceId] ?? []
  const eligibleMandatoryIds: number[] = []

  for (const id of mandatoryIds) {
    const provider = await tx.provider.findUnique({ where: { id } })
    if (provider && provider.monthlyQuota > 0) {
      eligibleMandatoryIds.push(id)
    }
  }

  // ── Step 3: Calculate how many fair-pool slots are needed ──
  const fairSlotsNeeded = TOTAL_PROVIDERS_PER_LEAD - eligibleMandatoryIds.length
  const pool = FAIR_POOLS[serviceId] ?? []
  const fairSelectedIds: number[] = []
  let currentIndex = state.lastProviderIndex

  // ── Step 4: Round-robin through the pool to fill remaining slots ──
  let attempts = 0
  while (fairSelectedIds.length < fairSlotsNeeded && attempts < pool.length * 2) {
    currentIndex = (currentIndex + 1) % pool.length
    const candidateId = pool[currentIndex]

    // Skip if already in mandatory list
    if (eligibleMandatoryIds.includes(candidateId)) {
      attempts++
      continue
    }

    // Skip if already selected
    if (fairSelectedIds.includes(candidateId)) {
      attempts++
      continue
    }

    // Check quota
    const provider = await tx.provider.findUnique({ where: { id: candidateId } })
    if (provider && provider.monthlyQuota > 0) {
      fairSelectedIds.push(candidateId)
    }

    attempts++
  }

  // ── Step 5: Persist the new round-robin position ──
  await tx.allocationState.update({
    where: { serviceId },
    data: { lastProviderIndex: currentIndex },
  })

  // ── Step 6: Create assignments and decrement quotas ──
  const allProviderIds = [...eligibleMandatoryIds, ...fairSelectedIds]

  for (const providerId of allProviderIds) {
    await tx.leadAssignment.create({
      data: { leadId, providerId },
    })
    await tx.provider.update({
      where: { id: providerId },
      data: { monthlyQuota: { decrement: 1 } },
    })
  }

  return allProviderIds
}
