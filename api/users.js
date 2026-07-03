const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qyyqxqjmphbszbgutjlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eXF4cWptcGhic3piZ3V0amxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTk3MDAsImV4cCI6MjA5ODYzNTcwMH0.q_-Ew8EiaskhhIu3vaDP0veIcPkjla0ONldHSZxZ39o';

let supabase = null;
function getDb() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

const DEFAULT_VOTERS = ['AJAY', 'SARVESH', 'SHIVAM', 'SARBJEET', 'OM', 'JATIN'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    try {
      const db = getDb();
      const { data, error } = await db
        .from('voters')
        .select('name')
        .order('name');

      if (error || !data || data.length === 0) {
        return res.status(200).json(DEFAULT_VOTERS);
      }

      return res.status(200).json(data.map(r => r.name));
    } catch (error) {
      console.error(error);
      return res.status(200).json(DEFAULT_VOTERS);
    }
  }

  if (req.method === 'POST') {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

      const voterName = name.trim().toUpperCase();

      const db = getDb();
      const { error } = await db.from('voters').insert({ name: voterName });

      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Voter already exists' });
        console.error(error);
        return res.status(500).json({ error: 'Database error. Make sure a "voters" table exists in Supabase with columns: name (text, PK), created_at (timestamptz).' });
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({ name: voterName });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to add voter' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { name } = req.query;
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const voterName = name.trim().toUpperCase();
      if (voterName === 'SHIVAM') return res.status(403).json({ error: 'Cannot remove admin' });

      const db = getDb();
      const { error } = await db.from('voters').delete().eq('name', voterName);

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to remove voter' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete voter' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
