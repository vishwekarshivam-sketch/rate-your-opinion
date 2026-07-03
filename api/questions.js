const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qyyqxqjmphbszbgutjlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eXF4cWptcGhic3piZ3V0amxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNTk3MDAsImV4cCI6MjA5ODYzNTcwMH0.q_-Ew8EiaskhhIu3vaDP0veIcPkjla0ONldHSZxZ39o';

let supabase = null;
function getDb() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return supabase;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_QUESTIONS = [
  "Campus ke bahar aandar se jyada ijjat hai",
  "hostel food is absolutely trash",
  "Chichhore type college life hogi",
  "IIT BOMBAY mein boya hostel mein washing machine and dryer always work karta hai",
  "Har din minimum ek event toh hota hi hoga",
  "Civil ones get less baddies",
  "India ke kone kone se dost milengey or sayad international bhi ||",
  "seniors will be very helpful and supportive",
  "IITB me ladkiya Bhot kam h ...",
  "Iit bombay mein muje ache scholarship to mil jayenge all around 2 lakhs",
  "IITB ME electrical walo ko roz 6hrs pdhna pdta h",
  "Mess ka khane me bohot variety hoti hai",
  "Is it really tough to participate in sports if we are literally rookie ?",
  "Minimum 1 embarrassing moment hoga jo lifetime yaad rahega",
  "I'm not good at any of sports or activities afaik, so I won't be able to join any society/club in IITB?",
  "Branch doesn't matter (copium)",
  "You don't get enough time to go out and enjoy with friends",
  "Exam ke 24 ghante pehle syllabus puchna is a healthy practice",
  "among students themselves, people of lower branches are treated differently",
  "IITB h toh MBB m easily ja skte",
  "IITB has better alumni network than IITD, despite IITD having more successful startups...",
  "Iits me mess ka khaana 5 star hotel se bhi accha ata hai",
  "the senior guys are all desperate about \"getting a girlfriend\"",
  "I think GymK PORs ke liye election me state wise discrimination hota h",
  "Mech k saath tech ho he jayega",
  "Weather is hot and humid"
].map(text => ({
  id: generateId(),
  text,
  votes: {},
  created_at: Date.now()
}));

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    try {
      const db = getDb();
      const { data, error } = await db
        .from('questions')
        .select('id, text, votes, created_at')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        const { error: insertError } = await db.from('questions').insert(INITIAL_QUESTIONS);
        if (insertError) console.error('Seed failed:', insertError);

        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
        return res.status(200).json(INITIAL_QUESTIONS);
      }

      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
      return res.status(200).json(data);
    } catch (error) {
      console.error('GET /api/questions error:', error);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { text, user } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });

      const db = getDb();
      const newQuestion = {
        id: generateId(),
        text,
        votes: {},
        created_at: Date.now()
      };

      const { data, error } = await db
        .from('questions')
        .insert([newQuestion])
        .select();

      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to add question' });
      }

      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json(data[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to add question' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
