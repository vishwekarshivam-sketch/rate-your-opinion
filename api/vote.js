const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { questionId, user, rating } = req.body;
    
    if (!questionId || !user || typeof rating !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get all questions
    let questions = await kv.get('ryo_questions') || [];
    
    // Find the specific question
    const qIndex = questions.findIndex(q => q.id === questionId);
    
    if (qIndex === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Update the vote
    if (!questions[qIndex].votes) {
      questions[qIndex].votes = {};
    }
    
    questions[qIndex].votes[user] = rating;
    
    // Save back to KV
    await kv.set('ryo_questions', questions);
    
    return res.status(200).json(questions[qIndex]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save vote' });
  }
};
