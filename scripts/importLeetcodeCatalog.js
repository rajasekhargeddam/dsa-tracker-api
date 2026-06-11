const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const ProblemCatalog = require('../src/models/ProblemCatalog');

async function importProblems() {
  try {
    // Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log('✅ MongoDB Connected');

    // CHANGE THIS FILE NAME IF NEEDED
    const filePath = path.join(
      __dirname,
      '../data/leetcode-problems.json'
    );

    const rawData = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(rawData);

    const problems = jsonData.stat_status_pairs;

    console.log(`📦 Found ${problems.length} problems`);

    const operations = problems.map((item) => {
      const difficultyMap = {
        1: 'Easy',
        2: 'Medium',
        3: 'Hard',
      };

      return {
        updateOne: {
          filter: {
            problemNumber: item.stat.frontend_question_id,
          },
          update: {
            $set: {
              problemNumber: item.stat.frontend_question_id,
              title: item.stat.question__title,
              difficulty:
                difficultyMap[item.difficulty.level] || 'Easy',
              tags: [],
              slug: item.stat.question__title_slug,
              leetcodeUrl: `https://leetcode.com/problems/${item.stat.question__title_slug}/`,
              isPremium: item.paid_only,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await ProblemCatalog.bulkWrite(operations);

    console.log('========================');
    console.log('🎉 Import Completed');
    console.log(`Inserted: ${result.upsertedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);
    console.log('========================');

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

importProblems();