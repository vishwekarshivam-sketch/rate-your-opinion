const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qyyqxqjmphbszbgutjlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eXF4cWptcGhic3piZ3V0amxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTk3MDAsImV4cCI6MjA5ODYzNTcwMH0.q_-Ew8EiaskhhIu3vaDP0veIcPkjla0ONldHSZxZ39o';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questionId, user, rating } = req.body;
    
    if (!questionId || !user || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Fetch the current question from Supabase
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();
      
    if (fetchError || !question) {
      return res.status(404).json({ error: 'Question not found in database. Make sure you seeded the database table.' });
    }
    
    // 2. Update the vote JSON
    const votes = question.votes || {};
    votes[user] = rating;
    
    // 3. Save it back
    const { data: updatedData, error: updateError } = await supabase
      .from('questions')
      .update({ votes })
      .eq('id', questionId)
      .select()
      .single();
      
    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: 'Failed to update vote' });
    }
    
    return res.status(200).json(updatedData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save vote' });
  }
};
