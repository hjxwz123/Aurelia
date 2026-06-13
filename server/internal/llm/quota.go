package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"aurelia/server/internal/store"
)

// Per-model, per-group usage quotas (§ user groups). A model with no quota rows
// is open to everyone. Otherwise a user's group must have a row (else the model
// is locked for them), and usage is capped within a fixed window. The window
// count/cost lives in the cache (O(1) per request), seeded from usage_logs when
// the cache is cold, so the check stays cheap at scale.

// quotaWindow computes the fixed-window start + ttl for a period.
func quotaWindow(periodSeconds int) (start int64, ttl time.Duration) {
	p := int64(periodSeconds)
	if p <= 0 {
		p = 604800 // 7 days
	}
	now := time.Now().Unix()
	return (now / p) * p, time.Duration(p) * time.Second
}

// checkModelQuota returns ("", true) when the user may use the model, or
// (message, false) with the upgrade/over-limit prompt when blocked.
func (o *Orchestrator) checkModelQuota(ctx context.Context, userID string, model *store.Model) (string, bool) {
	has, err := store.ModelHasAnyQuota(ctx, o.db, model.ID)
	if err != nil || !has {
		return "", true // open to everyone (fail-open on a DB error)
	}
	groupID := o.userGroupID(ctx, userID)
	q, err := store.GetModelQuota(ctx, o.db, model.ID, groupID)
	if err != nil {
		return o.quotaMessage(), false // group not granted → locked
	}
	if q.LimitValue <= 0 {
		return "", true // granted, unlimited
	}
	start, ttl := quotaWindow(q.PeriodSeconds)
	cost, count := o.readQuota(ctx, userID, model.ID, q, start, ttl)
	if q.LimitType == "count" {
		if count >= int(q.LimitValue+0.5) {
			return o.quotaMessage(), false
		}
	} else if cost >= q.LimitValue {
		return o.quotaMessage(), false
	}
	return "", true
}

// recordQuotaUsage updates the window counter after a successful turn.
func (o *Orchestrator) recordQuotaUsage(ctx context.Context, userID string, model *store.Model, turnCost float64) {
	if o.cache == nil {
		return
	}
	has, err := store.ModelHasAnyQuota(ctx, o.db, model.ID)
	if err != nil || !has {
		return
	}
	q, err := store.GetModelQuota(ctx, o.db, model.ID, o.userGroupID(ctx, userID))
	if err != nil || q.LimitValue <= 0 {
		return
	}
	start, ttl := quotaWindow(q.PeriodSeconds)
	key := quotaKey(userID, model.ID, start)
	if q.LimitType == "count" {
		o.cache.Incr(key, ttl)
		return
	}
	cur := 0.0
	if v, ok := o.cache.Get(key); ok {
		cur, _ = strconv.ParseFloat(v, 64)
	}
	o.cache.Set(key, strconv.FormatFloat(cur+turnCost, 'f', -1, 64), ttl)
}

// readQuota returns the current window cost/count, preferring the cache and
// falling back to a usage_logs aggregate (which it then seeds into the cache).
func (o *Orchestrator) readQuota(ctx context.Context, userID, modelID string, q *store.ModelGroupQuota, start int64, ttl time.Duration) (float64, int) {
	key := quotaKey(userID, modelID, start)
	if o.cache != nil {
		if v, ok := o.cache.Get(key); ok {
			if q.LimitType == "count" {
				n, _ := strconv.Atoi(v)
				return 0, n
			}
			f, _ := strconv.ParseFloat(v, 64)
			return f, 0
		}
	}
	cost, count, _ := store.UsageInWindow(ctx, o.db, userID, modelID, start)
	if o.cache != nil {
		if q.LimitType == "count" {
			o.cache.Set(key, strconv.Itoa(count), ttl)
		} else {
			o.cache.Set(key, strconv.FormatFloat(cost, 'f', -1, 64), ttl)
		}
	}
	return cost, count
}

func quotaKey(userID, modelID string, windowStart int64) string {
	return fmt.Sprintf("quota:%s:%s:%d", userID, modelID, windowStart)
}

// userGroupID resolves the user's group, defaulting to the free tier.
func (o *Orchestrator) userGroupID(ctx context.Context, userID string) string {
	if u, err := store.FindUserByID(ctx, o.db, userID); err == nil && u.GroupID != "" {
		return u.GroupID
	}
	return store.DefaultGroupID
}

// quotaMessage is the admin-configurable prompt shown when a model is locked for
// a group or its quota is exhausted.
func (o *Orchestrator) quotaMessage() string {
	if raw, err := store.GetSetting(o.db, "quota_exceeded_message"); err == nil {
		var s string
		if json.Unmarshal(raw, &s) == nil && s != "" {
			return s
		}
	}
	return "You've reached your plan's usage limit for this model. Please wait for your quota to reset, or upgrade your plan to continue."
}
