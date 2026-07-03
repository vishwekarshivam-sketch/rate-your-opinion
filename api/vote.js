const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qyyqxqjmphbszbgutjlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eXF4cWptcGhic3piZ3V0amxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTk3MDAsImV4cCI6MjA5ODYzNTcwMH0.q_-Ew8EiaskhhIu3vaDP0veIcPkjla0ONldHSZxZ39o';

let supabase = null;
function getDb() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questionId, user, rating } = req.body;

    if (!questionId || !user || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getDb();

    const { data: question, error: fetchError } = await db
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const votes = question.votes || {};
    votes[user] = rating;

    const { data: updatedData, error: updateError } = await db
      .from('questions')
      .update({ votes })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: 'Failed to update vote' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(updatedData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save vote' });
  }
};
