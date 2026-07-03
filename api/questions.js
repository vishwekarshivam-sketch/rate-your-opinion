const { kv } = require('@vercel/kv');
const { v4: uuidv4 } = require('crypto'); // Built into Node.js 14+ via crypto.randomUUID(), but we'll just use a simple random string for id if needed

// simple fallback ID generator since crypto might have issues in some edge Vercel environments
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
  createdAt: Date.now()
}));

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      let questions = await kv.get('ryo_questions');
      
      if (!questions) {
        // Initialize if empty
        questions = INITIAL_QUESTIONS;
        await kv.set('ryo_questions', questions);
      }
      
      // Sort so newest is at the top
      questions.sort((a, b) => b.createdAt - a.createdAt);
      
      return res.status(200).json(questions);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }
  } 
  
  if (req.method === 'POST') {
    try {
      const { text, user } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });
      
      let questions = await kv.get('ryo_questions') || [];
      
      const newQuestion = {
        id: generateId(),
        text,
        votes: {},
        createdAt: Date.now()
      };
      
      questions.push(newQuestion);
      await kv.set('ryo_questions', questions);
      
      return res.status(201).json(newQuestion);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to add question' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
