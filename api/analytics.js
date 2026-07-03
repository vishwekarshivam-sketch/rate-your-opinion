import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qyyqxqjmphbszbgutjlr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eXF4cWptcGhic3piZ3V0amxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTk3MDAsImV4cCI6MjA5ODYzNTcwMH0.q_-Ew8EiaskhhIu3vaDP0veIcPkjla0ONldHSZxZ39o';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'POST') {
    const { user_type, session_id } = req.body;
    if (!user_type) return res.status(400).json({ error: 'user_type is required' });
    const { error } = await supabase.from('visits').insert({
      user_type: String(user_type).slice(0, 50),
      session_id: session_id || null
    });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { data } = await supabase
      .from('visits')
      .select('user_type, created_at')
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) {
      return res.status(200).json({ total: 0, fresher: 0, voter: 0, recent: [], daily: [] });
    }

    const total = data.length;
    const fresher = data.filter(v => v.user_type === 'FRESHER').length;
    const voter = total - fresher;
    const recent = data.slice(0, 20);

    const dailyMap = {};
    data.forEach(v => {
      const date = new Date(v.created_at).toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { date, total: 0, fresher: 0, voter: 0 };
      dailyMap[date].total++;
      if (v.user_type === 'FRESHER') dailyMap[date].fresher++;
      else dailyMap[date].voter++;
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({ total, fresher, voter, recent, daily });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
