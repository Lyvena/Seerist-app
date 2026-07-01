"use server"

import { requireUser } from "@/lib/auth"
import { updateProposal } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Mark a proposal as sent (sets sent_at to now). Called from the Proposals
 * page expand row. Mirrors the auth-guarded pattern used by other actions.
 */
export async function markProposalSent(proposalId: string) {
  const userId = await requireUser()
  const { error } = await updateProposal(proposalId, userId, {
    sent_at: new Date().toISOString(),
  })

  if (error) return { error }
  revalidatePath("/proposals")
  return { error: null }
}
