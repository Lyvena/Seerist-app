// @include _shared
// ============================================================================
// model-gateway — plan-aware model selection.
//
// Free plans may only use ZERO-COST models from the InsForge gateway
// (OpenRouter behind it). Paid plans default to the best model available and
// can pick any chat model they like.
//
// "Best" is resolved against the LIVE catalog (GET /api/ai/models) every time,
// ordered by the model_preferences table. Within a matching family the newest
// version wins automatically, so when a better Opus (or a better free model)
// appears on the gateway it becomes the default on its own — no code change
// and no redeploy. Changing the ordering is a single row edit.
//
// Operations (POST { op, organization_id, ... }):
//   status       what this org gets today, why, and how much it has used
//   list_models  every model this org is allowed to select
//   set_model    pin a model (paid plans only)
//   clear_model  go back to automatic best-available
// ============================================================================

export default async function (req: Request): Promise<Response> {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const token = bearer(req);
  if (!token) return json({ error: 'Sign in required' }, 401);
  const userId = userIdFromToken(token);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { organization_id } = body;
  if (!organization_id) return json({ error: 'organization_id is required' }, 400);
  const op = String(body.op || body.action || 'status');

  try {
    const scope = { organization_id };
    const ent = await resolveEntitlement(scope, token);
    if (!ent.org) return json({ error: 'Organization not found or not a member' }, 404);

    if (op === 'status') {
      const resolved = await resolveModel(scope, token);
      return json({
        plan: ent.plan,
        tier: ent.tier,
        limits: ent.limits,
        can_choose_model: ent.tier === 'paid',
        preferred_model: ent.org.preferred_model ?? null,
        active_model: resolved.model,
        reason: resolved.reason,
        usage: await usageSnapshot(organization_id, ent, token),
        note: ent.tier === 'free'
          ? 'Free plans run on zero-cost gateway models. Upgrade to use premium models and choose your own.'
          : 'Paid plan — premium models enabled. Leave the model on automatic and Seerist always uses the best one available.',
      });
    }

    if (op === 'list_models') {
      const all = (await gatewayModels(token)).filter(isChatModel);
      const eligible = ent.tier === 'free' ? all.filter(isZeroCost) : all;
      const resolved = await resolveModel(scope, token);
      const models = eligible
        .map((m) => ({
          id: m.id,
          input_price: m.inputPrice ?? 0,
          output_price: m.outputPrice ?? 0,
          free: isZeroCost(m),
          is_active: m.id === resolved.model,
        }))
        .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.input_price - a.input_price || a.id.localeCompare(b.id));
      return json({
        tier: ent.tier,
        can_choose_model: ent.tier === 'paid',
        active_model: resolved.model,
        total: models.length,
        models: models.slice(0, 300),
      });
    }

    if (op === 'set_model') {
      if (ent.tier !== 'paid') {
        return json({
          error: 'Choosing a model is a paid-plan feature. Free plans always run on the best zero-cost model available.',
          upgrade: true,
        }, 403);
      }
      const model = String(body.model || '');
      if (!model) return json({ error: 'model is required' }, 400);
      const all = (await gatewayModels(token)).filter(isChatModel);
      if (!all.some((m) => m.id === model)) {
        return json({ error: `"${model}" is not available on the gateway right now.` }, 400);
      }
      const [org] = await dbPatch('organizations', `id=eq.${organization_id}`, { preferred_model: model }, token);
      await logPersona({
        organization_id,
        persona: 'System',
        action: 'set_model',
        params: { model },
        result: `Default model pinned to ${model}.`,
        created_by: userId,
      }, token);
      return json({ preferred_model: org.preferred_model, active_model: model });
    }

    if (op === 'clear_model') {
      await dbPatch('organizations', `id=eq.${organization_id}`, { preferred_model: null }, token);
      const resolved = await resolveModel(scope, token);
      return json({
        preferred_model: null,
        active_model: resolved.model,
        reason: resolved.reason,
        note: 'Back to automatic — Seerist will always use the best model available on the gateway.',
      });
    }

    return json({ error: 'op must be one of: status, list_models, set_model, clear_model' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'model-gateway failed' }, 500);
  }
}

async function usageSnapshot(
  organizationId: string,
  ent: { plan: string; limits: Record<string, any> },
  token: string,
): Promise<{ used: number; cap: number | null; resets_on: string }> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const nextMonth = new Date(monthStart);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);

  let used = 0;
  try {
    used = await dbCount(
      'ai_usage_log',
      `organization_id=eq.${organizationId}&created_at=gte.${monthStart.toISOString()}`,
      token,
    );
  } catch { /* metering is best-effort */ }

  const cap = Number(ent.limits?.ai_actions_per_month);
  return {
    used,
    cap: Number.isFinite(cap) && cap > 0 ? cap : null,
    resets_on: nextMonth.toISOString(),
  };
}
