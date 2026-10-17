import { Router } from 'express';
import { query } from '../../db/index.js';
import { enrichLayout } from '../../lib/topicContent.js';

const router = Router();

// GET /api/v1/roadmaps/:slug/layout  -> diagram + per-topic description/resources
// Every clickable box gets a description and at least one resource (see lib/topicContent.js).
router.get('/roadmaps/:slug/layout', (req, res) => {
  const row = query.get('SELECT title, layout_json FROM roadmaps WHERE slug = ?', req.params.slug);
  if (!row || !row.layout_json) {
    return res.status(404).json({ error: { code: 'layout_not_found', message: 'No interactive layout for this roadmap.' } });
  }
  const layout = JSON.parse(row.layout_json);
  res.json(enrichLayout(req.params.slug, row.title, layout));
});

export default router;
